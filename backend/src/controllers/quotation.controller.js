import * as quotationService from "../services/quotation.service.js";

/**
 * POST /api/quotations — create (or save as draft) a quotation against an
 * existing repair order.
 */
export async function createQuotation(req, res) {
  const quote = await quotationService.createQuotation(req.body ?? {}, req.user.sub);
  res.status(201).json(quote);
}

/**
 * PATCH /api/quotations/:id — update a draft's line items/terms in place.
 */
export async function updateQuotation(req, res) {
  const quote = await quotationService.updateQuotation(req.params.id, req.body ?? {});
  res.json(quote);
}

/** PATCH /api/quotations/:id/send — mark a quotation sent, notify the customer. */
export async function sendQuotation(req, res) {
  const quote = await quotationService.sendQuotation(req.params.id);
  res.json(quote);
}

/**
 * PATCH /api/quotations/:id/confirm — record confirmation of customer.
 * Body: { approved: boolean }
 */
export async function confirmQuotation(req, res) {
  const quote = await quotationService.confirmQuotation(req.params.id, (req.body ?? {}).approved);
  res.json(quote);
}

/** GET /api/quotations?repairOrderId= — list quotations, optionally scoped. */
export async function listQuotations(req, res) {
  const result = await quotationService.listQuotations(req.query ?? {});
  res.json(result);
}

/** GET /api/quotations/:id — fetch a single quotation. */
export async function getQuotationById(req, res) {
  const quote = await quotationService.getQuotationById(req.params.id);
  res.json(quote);
}
