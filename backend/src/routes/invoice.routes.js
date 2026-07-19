import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  generateInvoiceFromRepairOrder,
  getInvoiceById,
  listInvoices,
  listMyInvoices,
  sendInvoiceToCustomer,
} from "../controllers/invoice.controller.js";

export const invoiceRouter = Router();

invoiceRouter.get(
  "/mine",
  requireAuth,
  requireRole("onlineCustomer"),
  catchAsync(listMyInvoices),
);

invoiceRouter.get(
  "",
  requireAuth,
  requireRole("accountant", "admin"),
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
