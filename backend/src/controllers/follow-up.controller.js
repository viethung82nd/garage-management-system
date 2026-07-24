import * as followUpService from "../services/follow-up.service.js";

/** POST /api/follow-ups — create a pending post-delivery check-in directly.
 *  Body: { repairOrderId, vehicleId, customerId, deliveredAt? }. */
export async function createFollowUp(req, res) {
  const followUp = await followUpService.createFollowUpForDelivery(req.body ?? {});
  res.status(201).json(followUp);
}

/** POST /api/follow-ups/generate — back-fills follow-ups for delivered orders
 *  that don't have one yet. Body: { lookbackDays? }. */
export async function generateFollowUps(req, res) {
  const result = await followUpService.generateDueFollowUps(req.body ?? {});
  res.json(result);
}

/** GET /api/follow-ups?status=&dueBefore= — the advisor's call queue. */
export async function listFollowUps(req, res) {
  const followUps = await followUpService.listFollowUps(req.query ?? {});
  res.json({ followUps });
}

/** GET /api/follow-ups/satisfaction?startDate=&endDate= — CSAT/NPS rollup. */
export async function getSatisfactionSummary(req, res) {
  const summary = await followUpService.getSatisfactionSummary(req.query ?? {});
  res.json(summary);
}

/** PATCH /api/follow-ups/:id — log the outcome of a follow-up call. */
export async function recordFollowUpOutcome(req, res) {
  const followUp = await followUpService.recordFollowUpOutcome(
    req.params.id,
    req.body ?? {},
    req.user?.sub,
  );
  res.json(followUp);
}
