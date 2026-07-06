import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import { generateInvoiceFromRepairOrder } from "../controllers/invoice.controller.js";

export const invoiceRouter = Router();

// Generate an invoice from a completed repair order (accountant or admin only).
invoiceRouter.post(
  "",
  requireAuth,
  requireRole("accountant", "admin"),
  asyncHandler(generateInvoiceFromRepairOrder),
);
