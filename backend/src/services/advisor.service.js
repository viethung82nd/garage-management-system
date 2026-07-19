import { bookingRepository } from "../repositories/booking.repository.js";
import { repairOrderRepository } from "../repositories/repair-order.repository.js";
import { todayUtc } from "../utils/date.js";

/**
 * Summary counters for the Service Advisor landing page. Same shape the
 * frontend already falls back to computing client-side from /api/bookings +
 * /api/repair-orders when this fails, so this just gives it real,
 * pre-aggregated numbers instead.
 */
export async function getAdvisorDashboard() {
  const today = todayUtc();

  const [pendingBookings, todayReceptions, openRepairOrders, waitingCustomers] =
    await Promise.all([
      bookingRepository.countDocuments({ status: "pending" }),
      bookingRepository.countDocuments({
        bookingDate: today,
        status: { $in: ["confirmed", "completed"] },
      }),
      repairOrderRepository.countDocuments({
        status: { $nin: ["completed", "cancelled"] },
      }),
      bookingRepository.countDocuments({ bookingDate: today, status: "confirmed" }),
    ]);

  return {
    pendingBookings,
    todayReceptions,
    openRepairOrders,
    waitingCustomers,
  };
}
