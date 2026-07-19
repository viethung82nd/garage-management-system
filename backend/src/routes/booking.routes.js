import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  getSlots,
  createBooking,
  listBookings,
  myBookings,
  getBookingById,
  confirmBooking,
  updateBookingStatus,
  cancelBooking,
  rescheduleBooking,
} from "../controllers/booking.controller.js";

export const bookingRouter = Router();

// Public: customers browse availability and book without an account.
bookingRouter.get("/slots", catchAsync(getSlots));
bookingRouter.post("/", catchAsync(createBooking));

// Authenticated customer: view own bookings.
bookingRouter.get("/mine", requireAuth, catchAsync(myBookings));

// Staff: list/filter all bookings and confirm pending ones.
bookingRouter.get(
  "/",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(listBookings)
);
bookingRouter.get(
  "/:id",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(getBookingById)
);
bookingRouter.patch(
  "/:id/confirm",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(confirmBooking)
);
// Generic status update across the lifecycle (validated transitions).
bookingRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(updateBookingStatus)
);

// Owner customer or staff: cancel / reschedule (ownership enforced in controller).
bookingRouter.patch("/:id/cancel", requireAuth, catchAsync(cancelBooking));
bookingRouter.patch("/:id/reschedule", requireAuth, catchAsync(rescheduleBooking));
