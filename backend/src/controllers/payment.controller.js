import * as paymentService from "../services/payment.service.js";

/**
 * POST /api/payments — record a payment for an invoice through the mock gateway.
 *
 * Only forwards the fields a caller is allowed to control (invoiceId, method,
 * amount, reference). `simulate` is deliberately NOT read from the request
 * body: it forces the mock gateway to a specific outcome, and if a client
 * could pass `{"simulate":"succeeded"}` it could mark any invoice paid
 * without an actual charge. The service itself decides whether a simulate
 * override is even possible (never in production).
 */
export async function recordPayment(req, res) {
  const { invoiceId, method, amount, reference } = req.body ?? {};
  const result = await paymentService.recordPayment({ invoiceId, method, amount, reference }, req.user.sub);
  res.status(201).json(result);
}

/** GET /api/payments/:id — fetch a single payment with its invoice summary. */
export async function getPayment(req, res) {
  const result = await paymentService.getPayment(req.params.id);
  res.json(result);
}

/** GET /api/payments — the accountant's full payments ledger, newest first. */
export async function listPayments(_req, res) {
  const result = await paymentService.listPayments();
  res.json(result);
}
