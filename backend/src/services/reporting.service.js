import {
  InvoiceModel,
  InventoryTransactionModel,
  RepairOrderModel,
  RepairOrderStatusHistoryModel,
  TimeLogModel,
  UserModel,
} from "../models/index.js";
import { ApiError } from "../utils/apiError.js";

/**
 * Phase 4 management reporting: the numbers that tell the owner whether the
 * business is actually making money, not just turning over cash.
 *
 * Kept separate from the existing revenue report (admin.service.js), which
 * answers "how much did we collect and from what". These answer "what did it
 * cost us, what are we owed, and how hard is the shop working" — the profit,
 * receivables and productivity side.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(value, label, { endOfDay = false } = {}) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${label} is required and must be a valid date`);
  }
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

/**
 * Gross profit for the period, split by revenue stream.
 *
 * The split matters because labour and parts have completely different profit
 * structures — reporting one blended margin hides which one is actually
 * carrying the shop. Basis:
 *  - Parts revenue = paid invoices' part lines; parts cost (COGS) = the frozen
 *    unit cost on the `issue` ledger entries for those orders, so cost is what
 *    the parts genuinely cost us at the time, not today's price.
 *  - Labour revenue = paid invoices' labour/service lines; labour cost = logged
 *    technician minutes × each technician's internal hourly cost.
 */
export async function getGrossProfitReport({ startDate, endDate }) {
  const start = parseDate(startDate, "startDate");
  const end = parseDate(endDate, "endDate", { endOfDay: true });
  if (end < start) throw new ApiError(400, "endDate must be on or after startDate");

  // Paid invoices in the period are the revenue base — money the shop will
  // actually keep, matched to the work it was for.
  const invoices = await InvoiceModel.find({
    status: "paid",
    issuedAt: { $gte: start, $lte: end },
  }).select("lineItems repairOrderId");

  let partsRevenue = 0;
  let laborRevenue = 0;
  const orderIds = [];
  for (const invoice of invoices) {
    if (invoice.repairOrderId) orderIds.push(invoice.repairOrderId);
    for (const line of invoice.lineItems) {
      const lineTotal = (line.unitPrice || 0) * (line.quantity || 1);
      if (line.kind === "part") partsRevenue += lineTotal;
      else laborRevenue += lineTotal; // service + labor both bill as labour value
    }
  }

  // Parts COGS: frozen issue costs for those orders.
  const cogsRows = orderIds.length
    ? await InventoryTransactionModel.aggregate([
        { $match: { type: "issue", repairOrderId: { $in: orderIds } } },
        { $group: { _id: null, cost: { $sum: { $multiply: ["$quantity", "$unitCost"] } } } },
      ])
    : [];
  const partsCost = cogsRows[0]?.cost || 0;

  // Labour cost: logged minutes × the technician's hourly cost.
  const laborRows = orderIds.length
    ? await TimeLogModel.aggregate([
        {
          $match: {
            repairOrderId: { $in: orderIds },
            endedAt: { $ne: null },
          },
        },
        { $group: { _id: "$technicianId", minutes: { $sum: "$durationMinutes" } } },
      ])
    : [];
  let laborCost = 0;
  if (laborRows.length) {
    const techs = await UserModel.find({
      _id: { $in: laborRows.map((r) => r._id) },
    }).select("hourlyCost");
    const rateById = new Map(techs.map((t) => [String(t._id), t.hourlyCost || 0]));
    for (const row of laborRows) {
      laborCost += ((row.minutes || 0) / 60) * (rateById.get(String(row._id)) || 0);
    }
  }
  laborCost = Math.round(laborCost);

  const partsProfit = partsRevenue - partsCost;
  const laborProfit = laborRevenue - laborCost;

  const margin = (profit, revenue) => (revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0);

  return {
    startDate: start,
    endDate: end,
    currency: "VND",
    parts: {
      revenue: partsRevenue,
      cost: partsCost,
      profit: partsProfit,
      marginPercent: margin(partsProfit, partsRevenue),
    },
    labor: {
      revenue: laborRevenue,
      cost: laborCost,
      profit: laborProfit,
      marginPercent: margin(laborProfit, laborRevenue),
    },
    total: {
      revenue: partsRevenue + laborRevenue,
      cost: partsCost + laborCost,
      profit: partsProfit + laborProfit,
      marginPercent: margin(partsProfit + laborProfit, partsRevenue + laborRevenue),
    },
  };
}

/**
 * Accounts receivable ageing. Every unpaid / partially-paid invoice bucketed by
 * how long its balance has been outstanding past the due date — the report that
 * turns "we're owed money" into "we're owed THIS much, and THIS much of it is
 * already 60 days late", per customer.
 */
export async function getReceivablesReport() {
  const invoices = await InvoiceModel.find({
    status: { $in: ["unpaid", "partiallyPaid"] },
  })
    .populate({
      path: "repairOrderId",
      select: "vehicleId",
      populate: { path: "vehicleId", select: "customerId licensePlate" },
    })
    .select("total amountPaid dueAt issuedAt code billing repairOrderId");

  const now = Date.now();
  const bucketFor = (days) => {
    if (days <= 0) return "current";
    if (days <= 30) return "d1_30";
    if (days <= 60) return "d31_60";
    if (days <= 90) return "d61_90";
    return "d90_plus";
  };

  const byCustomer = new Map();
  const totals = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, outstanding: 0 };

  for (const invoice of invoices) {
    const balance = (invoice.total || 0) - (invoice.amountPaid || 0);
    if (balance <= 0) continue;

    const daysOverdue = invoice.dueAt ? Math.floor((now - invoice.dueAt.getTime()) / MS_PER_DAY) : 0;
    const bucket = bucketFor(daysOverdue);

    const customerId = invoice.repairOrderId?.vehicleId?.customerId
      ? String(invoice.repairOrderId.vehicleId.customerId)
      : "unknown";
    if (!byCustomer.has(customerId)) {
      byCustomer.set(customerId, {
        customerId,
        customerName: invoice.billing?.customerName || null,
        current: 0,
        d1_30: 0,
        d31_60: 0,
        d61_90: 0,
        d90_plus: 0,
        outstanding: 0,
        invoiceCount: 0,
      });
    }
    const row = byCustomer.get(customerId);
    row[bucket] += balance;
    row.outstanding += balance;
    row.invoiceCount += 1;

    totals[bucket] += balance;
    totals.outstanding += balance;
  }

  return {
    generatedAt: new Date(),
    currency: "VND",
    totals,
    byCustomer: [...byCustomer.values()].sort((a, b) => b.outstanding - a.outstanding),
  };
}

/**
 * The workshop KPIs a service manager actually runs on. Definitions follow
 * standard practice:
 *  - ARO (average repair order): revenue / number of invoices.
 *  - ELR (effective labour rate): labour revenue collected ÷ labour hours sold.
 *  - Technician productivity: booked (logged) hours ÷ hours available on shift.
 *  - Technician efficiency: here approximated as logged hours per completed
 *    order (a true flat-rate efficiency needs standard times, which the catalog
 *    doesn't carry yet — noted so it isn't mistaken for the flat-rate figure).
 *  - Carry-over rate: orders that were still open at the end of the day they
 *    were opened ÷ orders opened — the "didn't get it out same day" measure.
 *  - Rework rate: orders that hit reworkRequired ÷ completed orders.
 */
export async function getWorkshopKpis({ startDate, endDate }) {
  const start = parseDate(startDate, "startDate");
  const end = parseDate(endDate, "endDate", { endOfDay: true });
  if (end < start) throw new ApiError(400, "endDate must be on or after startDate");
  const range = { $gte: start, $lte: end };

  const [
    paidInvoices,
    ordersOpened,
    ordersCompleted,
    reworkOrderIds,
    laborMinutes,
    comebacksOpened,
  ] = await Promise.all([
    InvoiceModel.find({ status: "paid", issuedAt: range }).select("total lineItems"),
    RepairOrderModel.find({ createdAt: range }).select("createdAt deliveredAt completedAt status"),
    RepairOrderModel.countDocuments({ completedAt: range }),
    RepairOrderStatusHistoryModel.distinct("repairOrderId", { to: "reworkRequired", changedAt: range }),
    TimeLogModel.aggregate([
      { $match: { endedAt: { $ne: null }, startedAt: range } },
      { $group: { _id: null, minutes: { $sum: "$durationMinutes" } } },
    ]),
    // A true comeback: a NEW order opened in the period to redo earlier work
    // (distinct from reworkRequired, which is caught before handover).
    RepairOrderModel.countDocuments({ createdAt: range, isComeback: true }),
  ]);

  const invoiceCount = paidInvoices.length;
  const revenue = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const laborRevenue = paidInvoices.reduce(
    (sum, inv) =>
      sum +
      inv.lineItems
        .filter((l) => l.kind !== "part")
        .reduce((s, l) => s + (l.unitPrice || 0) * (l.quantity || 1), 0),
    0,
  );

  const loggedHours = (laborMinutes[0]?.minutes || 0) / 60;

  // Carry-over: opened but not finished the same calendar day.
  const sameDay = (a, b) => a && b && new Date(a).toDateString() === new Date(b).toDateString();
  let carriedOver = 0;
  for (const order of ordersOpened) {
    const finishedAt = order.deliveredAt || order.completedAt;
    if (!finishedAt || !sameDay(order.createdAt, finishedAt)) carriedOver += 1;
  }

  const round1 = (n) => Math.round(n * 10) / 10;
  const retentionRate = await getRetentionRate(start, end);

  return {
    startDate: start,
    endDate: end,
    currency: "VND",
    aro: invoiceCount > 0 ? Math.round(revenue / invoiceCount) : 0,
    effectiveLaborRate: loggedHours > 0 ? Math.round(laborRevenue / loggedHours) : 0,
    laborHoursSold: round1(loggedHours),
    carCount: invoiceCount,
    ordersOpened: ordersOpened.length,
    ordersCompleted,
    carryOverRate: ordersOpened.length > 0 ? round1((carriedOver / ordersOpened.length) * 100) : 0,
    reworkRate: ordersCompleted > 0 ? round1((reworkOrderIds.length / ordersCompleted) * 100) : 0,
    // Comebacks as a share of orders opened — the "didn't hold the first time"
    // measure, now that comebacks are linked to their original order.
    comebacksOpened,
    comebackRate: ordersOpened.length > 0 ? round1((comebacksOpened / ordersOpened.length) * 100) : 0,
    // Share of this period's customers who'd already been in before it
    // started — a repeat-visit measure, distinct from comebackRate (redone
    // work) — see getRetentionRate.
    retentionRate,
  };
}

/**
 * Retention rate (doc 14.4): of the customers actually served in the period,
 * what share were repeat customers — had at least one delivered order before
 * the period even started — rather than a first-time visit. Answers "are we
 * keeping customers", distinct from comebackRate ("did we redo our own work").
 */
async function getRetentionRate(start, end) {
  const periodCustomers = await RepairOrderModel.aggregate([
    { $match: { deliveredAt: { $gte: start, $lte: end } } },
    { $lookup: { from: "vehicles", localField: "vehicleId", foreignField: "_id", as: "vehicle" } },
    { $unwind: "$vehicle" },
    { $match: { "vehicle.customerId": { $ne: null } } },
    { $group: { _id: "$vehicle.customerId" } },
  ]);
  if (!periodCustomers.length) return 0;

  const periodCustomerIds = periodCustomers.map((row) => row._id);
  const returningCustomers = await RepairOrderModel.aggregate([
    { $match: { deliveredAt: { $lt: start } } },
    { $lookup: { from: "vehicles", localField: "vehicleId", foreignField: "_id", as: "vehicle" } },
    { $unwind: "$vehicle" },
    { $match: { "vehicle.customerId": { $in: periodCustomerIds } } },
    { $group: { _id: "$vehicle.customerId" } },
  ]);

  return Math.round((returningCustomers.length / periodCustomerIds.length) * 1000) / 10;
}
