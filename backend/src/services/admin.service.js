import mongoose from "mongoose";
import { bookingRepository } from "../repositories/booking.repository.js";
import { paymentRepository } from "../repositories/payment.repository.js";
import { invoiceRepository } from "../repositories/invoice.repository.js";
import { repairOrderRepository } from "../repositories/repair-order.repository.js";
import { revenueReportRepository } from "../repositories/revenue-report.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { BOOKING_STATUSES } from "../models/booking.model.js";
import { REPORT_PERIODS } from "../models/revenue-report.model.js";
import { USER_ROLES } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { todayUtc } from "../utils/date.js";

// Fields returned by the user-listing endpoints. Excludes passwordHash and any
// other sensitive columns by omission.
const USER_LIST_FIELDS = {
  fullName: 1,
  email: 1,
  phone: 1,
  role: 1,
  isActive: 1,
  createdAt: 1,
};

const REPORT_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a "YYYY-MM-DD" report boundary into a UTC Date. `endOfDay` pushes it to
 * 23:59:59.999 so an inclusive [start, end] range covers the whole final day.
 */
function parseReportDate(str, label, { endOfDay = false } = {}) {
  if (!str || !REPORT_DATE_RE.test(str)) {
    throw new ApiError(400, `${label} must be in YYYY-MM-DD format`);
  }
  const iso = endOfDay ? `${str}T23:59:59.999Z` : `${str}T00:00:00.000Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${label} is not a valid calendar date`);
  }
  return date;
}

/**
 * Per-technician performance over completed orders in [start, end]: order count,
 * average turnaround (hours), revenue, and a completion rate. Completion rate is
 * completed-in-range over all orders ever assigned to the technician —
 * RepairOrder carries no creation timestamp, so non-completed orders cannot be
 * time-bounded; this is a deliberate, documented approximation.
 */
async function technicianBreakdown(start, end) {
  const completed = await repairOrderRepository.aggregate([
    {
      $match: {
        status: "completed",
        completedAt: { $gte: start, $lte: end },
        technicianId: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$technicianId",
        orderCount: { $sum: 1 },
        revenue: { $sum: { $ifNull: ["$totalCost", 0] } },
        avgTime: {
          $avg: {
            $cond: [
              { $and: ["$startedAt", "$completedAt"] },
              {
                $divide: [
                  { $subtract: ["$completedAt", "$startedAt"] },
                  3600000, // ms → hours
                ],
              },
              null,
            ],
          },
        },
      },
    },
    { $sort: { orderCount: -1 } },
  ]);

  if (!completed.length) return [];

  const assigned = await repairOrderRepository.aggregate([
    { $match: { technicianId: { $ne: null } } },
    { $group: { _id: "$technicianId", total: { $sum: 1 } } },
  ]);
  const assignedMap = new Map(assigned.map((a) => [String(a._id), a.total]));

  const techIds = completed.map((c) => c._id);
  const techs = await userRepository.model
    .find({ _id: { $in: techIds } }, { fullName: 1 })
    .lean();
  const nameMap = new Map(techs.map((t) => [String(t._id), t.fullName]));

  return completed.map((c) => {
    const total = assignedMap.get(String(c._id)) || c.orderCount;
    return {
      technicianId: c._id,
      technicianName: nameMap.get(String(c._id)) ?? null,
      orderCount: c.orderCount,
      completionRate: total ? Number((c.orderCount / total).toFixed(4)) : 0,
      avgTime: c.avgTime ? Number(c.avgTime.toFixed(2)) : 0,
      revenue: c.revenue,
    };
  });
}

/** Sums a numeric field across documents matching `match`, returning 0 if none. */
async function sumAmount(repository, match, field) {
  const [row] = await repository.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);
  return row?.total ?? 0;
}

/**
 * Read-only dashboard figures for admins and accountants. Aggregates booking
 * counts and revenue in a handful of grouped queries; safe to call frequently.
 */
export async function getStatsSummary() {
  const today = todayUtc();

  const [total, todayCount, statusRows, collected, outstanding] = await Promise.all([
    bookingRepository.countDocuments(),
    bookingRepository.countDocuments({ bookingDate: today }),
    bookingRepository.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    sumAmount(paymentRepository, { status: "succeeded" }, "amount"),
    sumAmount(invoiceRepository, { status: "unpaid" }, "total"),
  ]);

  // Zero-fill every known status so the shape is stable regardless of the data.
  const byStatus = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0]));
  for (const { _id, count } of statusRows) {
    if (_id in byStatus) {
      byStatus[_id] = count;
    }
  }

  return {
    bookings: { total, today: todayCount, byStatus },
    revenue: { collected, outstanding, currency: "VND" },
  };
}

/**
 * Detailed revenue report for a period, with breakdowns by service, payment
 * method, and technician (matching the RevenueReport model). Revenue is money
 * actually collected (succeeded payments); service/technician breakdowns come
 * from completed repair orders.
 */
export async function getRevenueReport({ startDate, endDate, period = "monthly", save }, generatedBy) {
  const start = parseReportDate(startDate, "startDate");
  const end = parseReportDate(endDate, "endDate", { endOfDay: true });
  if (end < start) {
    throw new ApiError(400, "endDate must be on or after startDate");
  }

  const paidRange = { $gte: start, $lte: end };
  const [payTotals, methodRows, totalInvoices, completedOrders, serviceRows] = await Promise.all([
    paymentRepository.aggregate([
      { $match: { status: "succeeded", paidAt: paidRange } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    paymentRepository.aggregate([
      { $match: { status: "succeeded", paidAt: paidRange } },
      { $group: { _id: "$method", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } },
    ]),
    invoiceRepository.countDocuments({ status: "paid", issuedAt: paidRange }),
    repairOrderRepository.countDocuments({ status: "completed", completedAt: paidRange }),
    repairOrderRepository.aggregate([
      { $match: { status: "completed", completedAt: paidRange } },
      { $unwind: "$services" },
      {
        $group: {
          _id: "$services.serviceId",
          serviceName: { $first: "$services.name" },
          orderCount: { $sum: "$services.quantity" },
          revenue: { $sum: { $multiply: ["$services.priceAtTime", "$services.quantity"] } },
        },
      },
      { $sort: { revenue: -1 } },
    ]),
  ]);

  const byTechnician = await technicianBreakdown(start, end);

  const report = {
    period,
    startDate: start,
    endDate: end,
    totalRevenue: payTotals[0]?.total ?? 0,
    totalOrders: completedOrders,
    totalInvoices,
    byService: serviceRows.map((r) => ({
      serviceId: r._id,
      serviceName: r.serviceName,
      orderCount: r.orderCount,
      revenue: r.revenue,
    })),
    byPaymentMethod: methodRows.map((r) => ({ method: r._id, count: r.count, amount: r.amount })),
    byTechnician,
    currency: "VND",
    generatedBy,
    generatedAt: new Date(),
  };

  if (save === "true") {
    if (!REPORT_PERIODS.includes(period)) {
      throw new ApiError(400, `To save, period must be one of: ${REPORT_PERIODS.join(", ")}`);
    }
    await revenueReportRepository.create(report);
  }

  return { report };
}

/**
 * Booking counts per calendar day for the last `days` days (default 7, max
 * 31), oldest first. Powers the admin dashboard's daily reception volume chart.
 */
export async function getDailyIntake(daysParam) {
  const days = Math.min(Math.max(Number(daysParam) || 7, 1), 31);
  const today = todayUtc();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const rangeEnd = new Date(today);
  rangeEnd.setUTCHours(23, 59, 59, 999); // bookingDate isn't guaranteed to be midnight-normalized (e.g. seeded data), so bound by end-of-day rather than exact midnight.

  const rows = await bookingRepository.aggregate([
    { $match: { bookingDate: { $gte: start, $lte: rangeEnd } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$bookingDate" } },
        count: { $sum: 1 },
      },
    },
  ]);
  const countByDate = new Map(rows.map((r) => [r._id, r.count]));

  const series = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + i);
    const key = date.toISOString().slice(0, 10);
    series.push({ date: key, count: countByDate.get(key) || 0 });
  }

  return { days: series };
}

/** Technician performance over a period. */
export async function getTechnicianPerformance({ startDate, endDate }) {
  const start = parseReportDate(startDate, "startDate");
  const end = parseReportDate(endDate, "endDate", { endOfDay: true });
  if (end < start) {
    throw new ApiError(400, "endDate must be on or after startDate");
  }
  const technicians = await technicianBreakdown(start, end);
  return { startDate: start, endDate: end, technicians };
}

/**
 * List users for admin account management. Optional `role` filters to a single
 * role (validated against USER_ROLES). Returns a lean projection without
 * passwordHash, newest first.
 *
 * Technicians are also allowed to call this (to pick a peer when requesting a
 * task transfer), but only ever see the technician list — the role filter is
 * forced regardless of the query string, so a technician can't enumerate
 * admins/customers through this endpoint.
 */
export async function listUsers({ role }, requesterRole) {
  if (requesterRole === "technician") {
    const users = await userRepository.model
      .find({ role: "technician" }, USER_LIST_FIELDS)
      .sort({ createdAt: -1 })
      .lean();
    return { users };
  }

  const filter = {};
  if (role !== undefined) {
    if (!USER_ROLES.includes(role)) {
      throw new ApiError(400, `role must be one of: ${USER_ROLES.join(", ")}`);
    }
    filter.role = role;
  }

  const users = await userRepository.model
    .find(filter, USER_LIST_FIELDS)
    .sort({ createdAt: -1 })
    .lean();

  return { users };
}

/**
 * Soft-disable a user account by setting isActive = false. Idempotent
 * (deactivating an already-inactive user is fine). Admins may not deactivate
 * their own account, to avoid locking themselves out.
 */
export async function deactivateUser(id, requesterId) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "id is not a valid id");
  }
  if (id === requesterId) {
    throw new ApiError(400, "You cannot deactivate your own account");
  }

  const user = await userRepository.model
    .findByIdAndUpdate(id, { isActive: false }, { new: true, projection: USER_LIST_FIELDS })
    .lean();

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return { user };
}
