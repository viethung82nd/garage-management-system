import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import { recordPayment, getPayment } from "../controllers/payment.controller.js";

export const paymentRouter = Router();

// Payments are settled by accountants; admins retain full access.
paymentRouter.post(
  "/",
  requireAuth,
  requireRole("accountant", "admin"),
  asyncHandler(recordPayment)
);
paymentRouter.get(
  "/:id",
  requireAuth,
  requireRole("accountant", "admin"),
  asyncHandler(getPayment)
);
