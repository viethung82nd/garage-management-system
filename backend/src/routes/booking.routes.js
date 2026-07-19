import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
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
bookingRouter.get("/slots", asyncHandler(getSlots));
bookingRouter.post("/", asyncHandler(createBooking));

// Authenticated customer: view own bookings.
bookingRouter.get("/mine", requireAuth, asyncHandler(myBookings));

// Staff: list/filter all bookings and confirm pending ones.
bookingRouter.get(
  "/",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(listBookings)
);
bookingRouter.get(
  "/:id",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(getBookingById)
);
bookingRouter.patch(
  "/:id/confirm",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(confirmBooking)
);
// Generic status update across the lifecycle (validated transitions).
bookingRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(updateBookingStatus)
);

// Owner customer or staff: cancel / reschedule (ownership enforced in controller).
bookingRouter.patch("/:id/cancel", requireAuth, asyncHandler(cancelBooking));
bookingRouter.patch("/:id/reschedule", requireAuth, asyncHandler(rescheduleBooking));
