import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  generateInvoiceFromRepairOrder,
  getInvoiceById,
  listInvoices,
  listMyInvoices,
  sendInvoiceToCustomer,
  issueEInvoice,
} from "../controllers/invoice.controller.js";

export const invoiceRouter = Router();

invoiceRouter.get(
  "/mine",
  requireAuth,
  requireRole("onlineCustomer"),
  catchAsync(listMyInvoices),
);

// serviceAdvisor is scoped down to a single order's invoice in the
// controller — repairOrderId is required for that role, never a full list.
invoiceRouter.get(
  "",
  requireAuth,
  requireRole("accountant", "admin", "serviceAdvisor"),
  catchAsync(listInvoices),
);

invoiceRouter.get(
  "/:id",
  requireAuth,
  requireRole("accountant", "admin"),
  catchAsync(getInvoiceById),
);

// Generate an invoice from a completed repair order (accountant or admin only).
invoiceRouter.post(
  "",
  requireAuth,
  requireRole("accountant", "admin"),
  catchAsync(generateInvoiceFromRepairOrder),
);

invoiceRouter.patch(
  "/:id/send",
  requireAuth,
  requireRole("accountant", "admin"),
  catchAsync(sendInvoiceToCustomer),
);

// Issue the legal e-invoice (demo mint — no real tax-authority call).
invoiceRouter.post(
  "/:id/einvoice",
  requireAuth,
  requireRole("accountant", "admin"),
  catchAsync(issueEInvoice),
);
