import { Router } from "express";
import { asyncHandler } from "../middleware/error.js";
import { getSlots, createBooking } from "../controllers/booking.controller.js";

export const bookingRouter = Router();

// Both endpoints are public: customers book without an account.
bookingRouter.get("/slots", asyncHandler(getSlots));
bookingRouter.post("/", asyncHandler(createBooking));
