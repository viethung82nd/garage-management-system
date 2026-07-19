import * as receptionService from "../services/reception.service.js";

/**
 * POST /api/receptions — Service Advisor receives a vehicle at the front desk.
 */
export async function createReception(req, res) {
  const result = await receptionService.createReception(req.body ?? {}, req.user.sub);
  res.status(201).json(result);
}

/**
 * GET /api/receptions/history?plate=... — prior visits for a plate, used to
 * autofill the reception form and surface repeat-repair risk notes.
 */
export async function getReceptionHistory(req, res) {
  const result = await receptionService.getReceptionHistory(req.query.plate);
  res.json(result);
}
