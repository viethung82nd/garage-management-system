import mongoose from "mongoose";
import {
  BookingModel,
  PaymentModel,
  InvoiceModel,
  RepairOrderModel,
  RevenueReportModel,
  UserModel,
} from "../models/index.js";
import { BOOKING_STATUSES } from "../models/Booking.js";
import { REPORT_PERIODS } from "../models/RevenueReport.js";
import { USER_ROLES } from "../models/User.js";
import { HttpError } from "../middleware/error.js";
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
    throw new HttpError(400, `${label} must be in YYYY-MM-DD format`);
  }
  const iso = endOfDay ? `${str}T23:59:59.999Z` : `${str}T00:00:00.000Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${label} is not a valid calendar date`);
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
  const completed = await RepairOrderModel.aggregate([
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

  const assigned = await RepairOrderModel.aggregate([
    { $match: { technicianId: { $ne: null } } },
    { $group: { _id: "$technicianId", total: { $sum: 1 } } },
  ]);
  const assignedMap = new Map(assigned.map((a) => [String(a._id), a.total]));

  const techIds = completed.map((c) => c._id);
  const techs = await UserModel.find(
    { _id: { $in: techIds } },
    { fullName: 1 }
  ).lean();
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
async function sumAmount(Model, match, field) {
  const [row] = await Model.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);
  return row?.total ?? 0;
}

/**
 * GET /api/admin/stats/summary — read-only dashboard figures for admins and
 * accountants. Aggregates booking counts and revenue in a handful of grouped
 * queries; safe to call frequently.
 */
export async function getStatsSummary(_req, res) {
  const today = todayUtc();

  const [total, todayCount, statusRows, collected, outstanding] =
    await Promise.all([
      BookingModel.countDocuments(),
      BookingModel.countDocuments({ bookingDate: today }),
      BookingModel.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      sumAmount(PaymentModel, { status: "succeeded" }, "amount"),
      sumAmount(InvoiceModel, { status: "unpaid" }, "total"),
    ]);

  // Zero-fill every known status so the shape is stable regardless of the data.
  const byStatus = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0]));
  for (const { _id, count } of statusRows) {
    if (_id in byStatus) {
      byStatus[_id] = count;
    }
  }

  res.json({
    bookings: { total, today: todayCount, byStatus },
    revenue: { collected, outstanding, currency: "VND" },
  });
}

/**
 * GET /api/admin/reports/revenue — detailed revenue report for a period, with
 * breakdowns by service, payment method, and technician (matching the
 * RevenueReport model). Revenue is money actually collected (succeeded
 * payments); service/technician breakdowns come from completed repair orders.
 * Query: startDate, endDate (YYYY-MM-DD, required), period (label, default
 * "monthly"), save ("true" persists a RevenueReport snapshot).
 */
export async function getRevenueReport(req, res) {
  const { startDate, endDate, period = "monthly", save } = req.query;
  const start = parseReportDate(startDate, "startDate");
  const end = parseReportDate(endDate, "endDate", { endOfDay: true });
  if (end < start) {
    throw new HttpError(400, "endDate must be on or after startDate");
  }

  const paidRange = { $gte: start, $lte: end };
  const [payTotals, methodRows, totalInvoices, completedOrders, serviceRows] =
    await Promise.all([
      PaymentModel.aggregate([
        { $match: { status: "succeeded", paidAt: paidRange } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      PaymentModel.aggregate([
        { $match: { status: "succeeded", paidAt: paidRange } },
        {
          $group: {
            _id: "$method",
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
      ]),
      InvoiceModel.countDocuments({ status: "paid", issuedAt: paidRange }),
      RepairOrderModel.countDocuments({
        status: "completed",
        completedAt: paidRange,
      }),
      RepairOrderModel.aggregate([
        { $match: { status: "completed", completedAt: paidRange } },
        { $unwind: "$services" },
        {
          $group: {
            _id: "$services.serviceId",
            serviceName: { $first: "$services.name" },
            orderCount: { $sum: "$services.quantity" },
            revenue: {
              $sum: {
                $multiply: ["$services.priceAtTime", "$services.quantity"],
              },
            },
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
    byPaymentMethod: methodRows.map((r) => ({
      method: r._id,
      count: r.count,
      amount: r.amount,
    })),
    byTechnician,
    currency: "VND",
    generatedBy: req.user.sub,
    generatedAt: new Date(),
  };

  if (save === "true") {
    if (!REPORT_PERIODS.includes(period)) {
      throw new HttpError(
        400,
        `To save, period must be one of: ${REPORT_PERIODS.join(", ")}`
      );
    }
    await RevenueReportModel.create(report);
  }

  res.json({ report });
}

/**
 * GET /api/admin/reports/technicians — technician performance over a period.
 * Query: startDate, endDate (YYYY-MM-DD, required)
 */
export async function getTechnicianPerformance(req, res) {
  const start = parseReportDate(req.query.startDate, "startDate");
  const end = parseReportDate(req.query.endDate, "endDate", { endOfDay: true });
  if (end < start) {
    throw new HttpError(400, "endDate must be on or after startDate");
  }
  const technicians = await technicianBreakdown(start, end);
  res.json({ startDate: start, endDate: end, technicians });
}

/**
 * GET /api/admin/users — list users for admin account management. Optional
 * `role` query filters to a single role (validated against USER_ROLES). Returns
 * a lean projection without passwordHash, newest first.
 */
export async function listUsers(req, res) {
  const { role } = req.query;

  const filter = {};
  if (role !== undefined) {
    if (!USER_ROLES.includes(role)) {
      throw new HttpError(
        400,
        `role must be one of: ${USER_ROLES.join(", ")}`
      );
    }
    filter.role = role;
  }

  const users = await UserModel.find(filter, USER_LIST_FIELDS)
    .sort({ createdAt: -1 })
    .lean();

  res.json({ users });
}

/**
 * PATCH /api/admin/users/:id/deactivate — soft-disable a user account by
 * setting isActive = false. Idempotent (deactivating an already-inactive user
 * is fine). Admins may not deactivate their own account, to avoid locking
 * themselves out.
 */
export async function deactivateUser(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(400, "id is not a valid id");
  }
  if (id === req.user.sub) {
    throw new HttpError(400, "You cannot deactivate your own account");
  }

  const user = await UserModel.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true, projection: USER_LIST_FIELDS }
  ).lean();

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  res.json({ user });
}
