import * as invoiceService from "../services/invoice.service.js";
import { ApiError } from "../utils/apiError.js";

export async function listInvoices(req, res) {
  // A service advisor may only look up one order's own invoice — never the
  // whole ledger, which stays accountant/admin-only.
  if (req.user.role === "serviceAdvisor" && !req.query.repairOrderId) {
    throw new ApiError(400, "repairOrderId is required");
  }
  const result = await invoiceService.listInvoices({ repairOrderId: req.query.repairOrderId });
  res.json(result);
}

export async function listMyInvoices(req, res) {
  const result = await invoiceService.listMyInvoices(req.user.sub);
  res.json(result);
}

export async function getInvoiceById(req, res) {
  const result = await invoiceService.getInvoiceById(req.params.id);
  res.json(result);
}

/**
 * POST /api/invoices — generate an invoice from a completed repair order.
 */
export async function generateInvoiceFromRepairOrder(req, res) {
  const result = await invoiceService.generateInvoiceFromRepairOrder(req.body ?? {}, req.user.sub);
  res.status(201).json(result);
}

/**
 * PATCH /api/invoices/:id/send — email the invoice to the customer and
 * record an in-app notification.
 */
export async function sendInvoiceToCustomer(req, res) {
  const result = await invoiceService.sendInvoiceToCustomer(req.params.id, req.user.sub);
  res.json(result);
}

/** POST /api/invoices/:id/einvoice — issue the legal e-invoice (demo mint). */
export async function issueEInvoice(req, res) {
  const result = await invoiceService.issueEInvoice(req.params.id, req.user.sub);
  res.json(result);
}
