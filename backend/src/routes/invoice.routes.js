import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import {
  generateInvoiceFromRepairOrder,
  getInvoiceById,
  listInvoices,
  listMyInvoices,
} from "../controllers/invoice.controller.js";

export const invoiceRouter = Router();

invoiceRouter.get(
  "/mine",
  requireAuth,
  requireRole("onlineCustomer"),
  asyncHandler(listMyInvoices),
);

invoiceRouter.get(
  "",
  requireAuth,
  requireRole("accountant", "admin"),
  asyncHandler(listInvoices),
);

invoiceRouter.get(
  "/:id",
  requireAuth,
  requireRole("accountant", "admin"),
  asyncHandler(getInvoiceById),
);

// Generate an invoice from a completed repair order (accountant or admin only).
invoiceRouter.post(
  "",
  requireAuth,
  requireRole("accountant", "admin"),
  asyncHandler(generateInvoiceFromRepairOrder),
);
