import { BookingModel, RepairOrderModel } from "../models/index.js";
import { todayUtc } from "../utils/date.js";

/**
 * GET /api/advisor/dashboard — summary counters for the Service Advisor
 * landing page. Same shape the frontend already falls back to computing
 * client-side from /api/bookings + /api/repair-orders when this fails, so
 * this just gives it real, pre-aggregated numbers instead.
 */
export async function getAdvisorDashboard(_req, res) {
  const today = todayUtc();

  const [pendingBookings, todayReceptions, openRepairOrders, waitingCustomers] =
    await Promise.all([
      BookingModel.countDocuments({ status: "pending" }),
      BookingModel.countDocuments({
        bookingDate: today,
        status: { $in: ["confirmed", "completed"] },
      }),
      RepairOrderModel.countDocuments({
        status: { $nin: ["completed", "cancelled"] },
      }),
      BookingModel.countDocuments({ bookingDate: today, status: "confirmed" }),
    ]);

  res.json({
    pendingBookings,
    todayReceptions,
    openRepairOrders,
    waitingCustomers,
  });
}
