import * as deferredWorkService from "../services/deferred-work.service.js";

/** GET /api/deferred-work?vehicleId=&status=&dueBefore= — outstanding
 *  recommendations the customer has not yet agreed to. */
export async function listDeferredWork(req, res) {
  const result = await deferredWorkService.listDeferredWork(req.query ?? {});
  res.json(result);
}

/** PATCH /api/deferred-work/:id — mark an item converted or dismissed. */
export async function resolveDeferredWork(req, res) {
  const item = await deferredWorkService.resolveDeferredWork(req.params.id, req.body ?? {});
  res.json(item);
}
