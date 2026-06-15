import {
  BookingModel,
  PaymentModel,
  InvoiceModel,
} from "../models/index.js";
import { BOOKING_STATUSES } from "../models/Booking.js";
import { todayUtc } from "../utils/date.js";

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
