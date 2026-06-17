import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import {
  getSlots,
  createBooking,
  listBookings,
  listMyBookings,
} from "../controllers/booking.controller.js";

export const bookingRouter = Router();

bookingRouter.get(
  "/",
  requireAuth,
  requireRole("admin", "accountant", "serviceAdvisor"),
  asyncHandler(listBookings),
);

bookingRouter.get(
  "/mine",
  requireAuth,
  requireRole("onlineCustomer"),
  asyncHandler(listMyBookings),
);

// Both endpoints are public: customers book without an account.
bookingRouter.get("/slots", asyncHandler(getSlots));
bookingRouter.post("/", asyncHandler(createBooking));
