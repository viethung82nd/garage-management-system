import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import { recordPayment, getPayment } from "../controllers/payment.controller.js";

export const paymentRouter = Router();

// Payments are settled by accountants; admins retain full access.
paymentRouter.post(
  "/",
  requireAuth,
  requireRole("accountant", "admin"),
  catchAsync(recordPayment)
);
paymentRouter.get(
  "/:id",
  requireAuth,
  requireRole("accountant", "admin"),
  catchAsync(getPayment)
);
