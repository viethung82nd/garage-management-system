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
import { TERMINAL_ORDER_STATUSES } from "../models/repair-order.model.js";
import { TimeLogModel } from "../models/index.js";
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
 * Per-technician performance over completed SERVICE LINES in [start, end] —
 * one repair order can now have several technicians, one per line, so the
 * unit of measure is the line, not the order: `orderCount` is really "lines
 * completed" and `revenue` is that line's own value, not the whole order's.
 * Completion rate is completed-in-range over all lines ever assigned to the
 * technician — a line carries no creation timestamp, so non-completed lines
 * cannot be time-bounded; this is a deliberate, documented approximation
 * (same one the previous per-order version made).
 */
async function technicianBreakdown(start, end) {
  const completed = await repairOrderRepository.aggregate([
    { $unwind: "$services" },
    {
      $match: {
        "services.status": "completed",
        "services.completedAt": { $gte: start, $lte: end },
        "services.technicianId": { $ne: null },
      },
    },
    {
      $group: {
        _id: "$services.technicianId",
        orderCount: { $sum: 1 },
        revenue: {
          $sum: { $multiply: ["$services.priceAtTime", { $ifNull: ["$services.quantity", 1] }] },
        },
      },
    },
    { $sort: { orderCount: -1 } },
  ]);

  if (!completed.length) return [];

  const techIds = completed.map((c) => c._id);

  const [assigned, timeLogs] = await Promise.all([
    repairOrderRepository.aggregate([
      { $unwind: "$services" },
      { $match: { "services.technicianId": { $in: techIds } } },
      { $group: { _id: "$services.technicianId", total: { $sum: 1 } } },
    ]),
    // Per-technician total clocked minutes on completed lines in range —
    // avgTime is now "hours actually logged per completed line", sourced
    // from TimeLog (same precedent as reporting.service.js#getGrossProfitReport)
    // instead of the whole order's startedAt/completedAt span.
    TimeLogModel.aggregate([
      { $match: { technicianId: { $in: techIds }, endedAt: { $ne: null } } },
      { $group: { _id: "$technicianId", minutes: { $sum: "$durationMinutes" } } },
    ]),
  ]);
  const assignedMap = new Map(assigned.map((a) => [String(a._id), a.total]));
  const minutesMap = new Map(timeLogs.map((t) => [String(t._id), t.minutes]));

  const techs = await userRepository.model
    .find({ _id: { $in: techIds } }, { fullName: 1 })
    .lean();
  const nameMap = new Map(techs.map((t) => [String(t._id), t.fullName]));

  return completed.map((c) => {
    const key = String(c._id);
    const total = assignedMap.get(key) || c.orderCount;
    const minutes = minutesMap.get(key) || 0;
    return {
      technicianId: c._id,
      technicianName: nameMap.get(key) ?? null,
      orderCount: c.orderCount,
      completionRate: total ? Number((c.orderCount / total).toFixed(4)) : 0,
      avgTime: c.orderCount ? Number((minutes / 60 / c.orderCount).toFixed(2)) : 0,
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
 * Money still owed: total − amountPaid, summed across every open invoice
 * (unpaid AND partiallyPaid — a partially-paid invoice's remaining balance is
 * still outstanding, not just fully-unpaid ones).
 */
async function sumOutstanding() {
  const [row] = await invoiceRepository.aggregate([
    { $match: { status: { $in: ["unpaid", "partiallyPaid"] } } },
    { $group: { _id: null, total: { $sum: { $subtract: ["$total", { $ifNull: ["$amountPaid", 0] }] } } } },
  ]);
  return row?.total ?? 0;
}

/**
 * Attributes each succeeded payment in [start, end] back to the service
 * lines and technician it paid for, so byService/byTechnician revenue is
 * money actually collected — not the completed order's raw pre-discount/tax
 * value — and therefore reconciles exactly with totalRevenue (both are
 * built from the same succeeded-payments-in-period set). This is what keeps
 * the admin revenue report internally consistent instead of silently mixing
 * "cash collected" and "value of work done" under one "revenue" label.
 */
async function attributeCollectedRevenue(start, end) {
  const payments = await paymentRepository.model
    .find({ status: "succeeded", paidAt: { $gte: start, $lte: end } }, { amount: 1, invoiceId: 1 })
    .lean();

  const collectedByInvoice = new Map();
  for (const payment of payments) {
    const key = String(payment.invoiceId);
    collectedByInvoice.set(key, (collectedByInvoice.get(key) || 0) + payment.amount);
  }

  const byService = new Map(); // key -> { serviceId, serviceName, orderCount, revenue }
  const byTechnician = new Map(); // key -> revenue

  if (collectedByInvoice.size === 0) {
    return { byService, byTechnician };
  }

  const invoices = await invoiceRepository.model
    .find({ _id: { $in: [...collectedByInvoice.keys()] } }, { lineItems: 1, total: 1, repairOrderId: 1 })
    .populate({
      path: "repairOrderId",
      select: "services",
      populate: { path: "services.serviceId", select: "name" },
    })
    .lean();

  for (const invoice of invoices) {
    const collected = collectedByInvoice.get(String(invoice._id)) || 0;
    if (collected <= 0) continue;

    const order = invoice.repairOrderId;

    const lineItems = invoice.lineItems || [];
    if (lineItems.length > 0 && invoice.total > 0) {
      let allocatedSoFar = 0;
      lineItems.forEach((item, index) => {
        const orderService = order?.services?.[index];
        const serviceRef = orderService?.serviceId; // populated { _id, name } or undefined
        const key = serviceRef ? String(serviceRef._id) : `unassigned:${item.description}`;
        const isLast = index === lineItems.length - 1;
        // The last line takes whatever remains, so per-line rounding never
        // leaves this invoice's collected amount short of fully allocated.
        const share = isLast
          ? collected - allocatedSoFar
          : Math.round((item.unitPrice * item.quantity * collected) / invoice.total);
        allocatedSoFar += share;

        const existing = byService.get(key) || {
          serviceId: serviceRef?._id || null,
          serviceName: serviceRef?.name || item.description,
          orderCount: 0,
          revenue: 0,
        };
        existing.orderCount += item.quantity;
        existing.revenue += share;
        byService.set(key, existing);

        // Attribute this same share to whichever technician owns this
        // specific line — not the whole invoice to one order-level tech —
        // since a multi-technician order splits revenue per line.
        if (orderService?.technicianId) {
          const techKey = String(orderService.technicianId);
          byTechnician.set(techKey, (byTechnician.get(techKey) || 0) + share);
        }
      });
    }
  }

  return { byService, byTechnician };
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
    sumOutstanding(),
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
  const [payTotals, methodRows, totalInvoices, completedOrders, attributed, workload] = await Promise.all([
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
    // Money actually collected in this period, attributed back to the
    // services/technicians it paid for — see attributeCollectedRevenue's
    // doc comment for why this (not raw completed-order value) is used.
    attributeCollectedRevenue(start, end),
    // Workload metrics (orderCount/completionRate/avgTime) are based on
    // completed SERVICE LINES in the period — a legitimate, separate "how
    // busy was this technician" measure, not a money figure, so it keeps its
    // own basis (see technicianBreakdown's doc comment).
    technicianBreakdown(start, end),
  ]);

  const technicianNameById = new Map(workload.map((t) => [String(t.technicianId), t.technicianName]));
  const byTechnician = workload.map((t) => ({
    ...t,
    revenue: attributed.byTechnician.get(String(t.technicianId)) || 0,
  }));
  // Include technicians who collected money in this period but have no
  // completed-order row above (e.g. their order completed before the
  // period but the customer paid during it) — otherwise their revenue would
  // silently vanish from the breakdown while still counting toward totalRevenue.
  for (const [techId, revenue] of attributed.byTechnician) {
    if (!technicianNameById.has(techId)) {
      byTechnician.push({ technicianId: techId, technicianName: null, orderCount: 0, completionRate: 0, avgTime: 0, revenue });
    }
  }
  byTechnician.sort((a, b) => b.revenue - a.revenue);

  const byService = [...attributed.byService.values()].sort((a, b) => b.revenue - a.revenue);

  const report = {
    period,
    startDate: start,
    endDate: end,
    totalRevenue: payTotals[0]?.total ?? 0,
    totalOrders: completedOrders,
    totalInvoices,
    byService,
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
 * Adds `activeOrders` (repair orders currently assigned to this technician
 * that haven't reached a terminal status) and `status` (busy = has an open
 * time log running right now, offline = deactivated account, else
 * available) to a list of technician users. Neither of those lives on the
 * User model — without this, every technician picker (work-order
 * assignment, transfer requests) silently reads "0 active, Available" for
 * everyone regardless of real workload, which defeats the point of showing
 * it at all.
 */
async function enrichTechnicians(users) {
  if (!users.length) return users;
  const technicianIds = users.map((user) => user._id);

  const [orderCounts, openTimeLogs] = await Promise.all([
    // Count DISTINCT repair orders each technician has an incomplete line on
    // — a technician with 3 open lines on the same order still counts as 1
    // active order, not 3, hence the two-stage group after $unwind.
    repairOrderRepository.model.aggregate([
      { $match: { status: { $nin: TERMINAL_ORDER_STATUSES } } },
      { $unwind: "$services" },
      { $match: { "services.technicianId": { $in: technicianIds } } },
      { $group: { _id: { tech: "$services.technicianId", order: "$_id" } } },
      { $group: { _id: "$_id.tech", count: { $sum: 1 } } },
    ]),
    TimeLogModel.find({ technicianId: { $in: technicianIds }, endedAt: null })
      .select("technicianId")
      .lean(),
  ]);

  const activeOrdersById = new Map(orderCounts.map((row) => [String(row._id), row.count]));
  const busyIds = new Set(openTimeLogs.map((log) => String(log.technicianId)));

  return users.map((user) => ({
    ...user,
    activeOrders: activeOrdersById.get(String(user._id)) || 0,
    status: user.isActive === false ? "offline" : busyIds.has(String(user._id)) ? "busy" : "available",
  }));
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
    return { users: await enrichTechnicians(users) };
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

  return { users: filter.role === "technician" ? await enrichTechnicians(users) : users };
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
