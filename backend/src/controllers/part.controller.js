import * as partService from "../services/part.service.js";

/** GET /api/admin/parts — fetch all parts, optional ?q= search over name/sku. */
export async function getAllParts(req, res) {
  const parts = await partService.getAllParts(req.query ?? {});
  res.json({ parts });
}

/** GET /api/admin/parts/:id — fetch a single part by ID. */
export async function getPartById(req, res) {
  const part = await partService.getPartById(req.params.id);
  res.json({ part });
}

/** POST /api/admin/parts — create a new part (Admin only). */
export async function createPart(req, res) {
  const part = await partService.createPart(req.body ?? {});
  res.status(201).json({ part });
}

/** PUT /api/admin/parts/:id — update a part (Admin only). */
export async function updatePart(req, res) {
  const part = await partService.updatePart(req.params.id, req.body ?? {});
  res.json({ part });
}

/** DELETE /api/admin/parts/:id — retire a part (soft delete). */
export async function deletePart(req, res) {
  const result = await partService.deletePart(req.params.id);
  res.json(result);
}

/**
 * POST /api/admin/parts/:id/adjust — correct on-hand stock after a physical
 * count, or write it off. Body: { newQuantity, reason, type? }
 */
export async function adjustPartStock(req, res) {
  const part = await partService.adjustPartStock(req.params.id, req.body ?? {}, req.user.sub);
  res.json({ part });
}

/** GET /api/admin/parts/:id/transactions — the movement ledger for a part. */
export async function getPartTransactions(req, res) {
  const result = await partService.getPartTransactions(req.params.id, req.query ?? {});
  res.json(result);
}
