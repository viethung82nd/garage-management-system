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
  const quote = await quotationService.updateQuotation(
    req.params.id,
    req.body ?? {},
    req.user.sub,
  );
  res.json(quote);
}

/** PATCH /api/quotations/:id/send — mark a quotation sent, notify the customer. */
export async function sendQuotation(req, res) {
  const { quote, hasEmailOnFile } = await quotationService.sendQuotation(req.params.id);
  res.json({ ...quote.toObject(), hasEmailOnFile });
}

/**
 * PATCH /api/quotations/:id/confirm — an advisor records the decision a
 * customer gave in person or by phone.
 * Body: { approved?: boolean, lineDecisions?: [{index, approved, declineReason}],
 *         channel, contactValue?, decidedByName?, note? }
 * `channel` is mandatory here: staff relaying someone else's decision must say
 * how they obtained it.
 */
export async function confirmQuotation(req, res) {
  const quote = await quotationService.confirmQuotation(
    req.params.id,
    req.body ?? {},
    req.user.sub,
    req.user.role,
  );
  res.json(quote);
}

/**
 * PATCH /api/quotations/:id/customer-decision — the customer decides on their
 * own quotation, in the app. Body: same as confirm, minus channel.
 */
export async function customerDecideQuotation(req, res) {
  const quote = await quotationService.customerDecideQuotation(
    req.params.id,
    req.body ?? {},
    req.user.sub,
  );
  res.json(quote);
}

/** GET /api/quotations/mine — the signed-in customer's own quotations. */
export async function listMyQuotations(req, res) {
  const result = await quotationService.listMyQuotations(req.user.sub);
  res.json(result);
}

/** GET /api/quotations/:id/versions — immutable history of a quotation. */
export async function getQuotationVersions(req, res) {
  const result = await quotationService.getQuotationVersions(req.params.id);
  res.json(result);
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
