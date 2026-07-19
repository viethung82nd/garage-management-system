import * as paymentService from "../services/payment.service.js";

/**
 * POST /api/payments — record a payment for an invoice through the mock gateway.
 */
export async function recordPayment(req, res) {
  const result = await paymentService.recordPayment(req.body ?? {});
  res.status(201).json(result);
}

/** GET /api/payments/:id — fetch a single payment with its invoice summary. */
export async function getPayment(req, res) {
  const result = await paymentService.getPayment(req.params.id);
  res.json(result);
}
