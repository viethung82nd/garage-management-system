import * as repairOrderService from "../services/repair-order.service.js";

/**
 * GET /api/repair-orders
 * Fetch all repair orders with optional filters
 * Query: status, vehicleId, serviceAdvisorId, technicianId
 */
export async function getAllRepairOrders(req, res) {
  const orders = await repairOrderService.getAllRepairOrders(req.query ?? {});
  res.json(orders);
}

/**
 * GET /api/repair-orders/mine
 * Fetch only the authenticated online customer's repair orders.
 */
export async function getMyRepairOrders(req, res) {
  const orders = await repairOrderService.getMyRepairOrders(req.user.sub);
  res.json(orders);
}

/**
 * GET /api/repair-orders/:id
 * Fetch a single repair order by ID
 */
export async function getRepairOrderById(req, res) {
  const order = await repairOrderService.getRepairOrderById(req.params.id);
  res.json(order);
}

/**
 * POST /api/repair-orders
 * Create a new repair order
 */
export async function createRepairOrder(req, res) {
  const order = await repairOrderService.createRepairOrder(req.body ?? {});
  res.status(201).json(order);
}

/**
 * PUT /api/repair-orders/:id
 * Update a repair order
 */
export async function updateRepairOrder(req, res) {
  const order = await repairOrderService.updateRepairOrder(req.params.id, req.body ?? {});
  res.json(order);
}

/**
 * PATCH /api/repair-orders/:id/progress
 * Update repair order progress (status + optional notes)
 */
export async function updateRepairProgress(req, res) {
  const result = await repairOrderService.updateRepairProgress(req.params.id, req.body ?? {});
  res.json(result);
}

/**
 * DELETE /api/repair-orders/:id
 * Delete a repair order (only if pending)
 */
export async function deleteRepairOrder(req, res) {
  const result = await repairOrderService.deleteRepairOrder(req.params.id);
  res.json(result);
}

// ============= REPAIR ORDER STEP NOTES =============

/**
 * POST /api/repair-orders/:id/step-notes
 * Add a step note to a repair order
 */
export async function addStepNote(req, res) {
  const result = await repairOrderService.addStepNote(req.params.id, req.body ?? {}, req.user, req.files);
  res.status(201).json(result);
}

/**
 * GET /api/repair-orders/:id/step-notes
 * Get all step notes for a repair order
 */
export async function getStepNotes(req, res) {
  const stepNotes = await repairOrderService.getStepNotes(req.params.id);
  res.json(stepNotes);
}

/**
 * DELETE /api/repair-orders/:orderId/step-notes/:noteIndex
 * Delete a step note from a repair order
 */
export async function deleteStepNote(req, res) {
  const result = await repairOrderService.deleteStepNote(req.params.orderId, req.params.noteIndex);
  res.json(result);
}

export async function getRepairOrderStatus(req, res) {
  const result = await repairOrderService.getRepairOrderStatus(req.params.id);
  if (!result) {
    return res.status(404).json({ message: "Repair order not found" });
  }
  return res.status(200).json(result);
}

export async function getRepairOrderSummary(req, res) {
  const result = await repairOrderService.getRepairOrderSummary(req.params.id);
  res.json(result);
}

/**
 * POST /api/repair-orders/:id/quality-check
 * Service Advisor reviews a technician-completed order.
 */
export async function submitQualityCheck(req, res) {
  const result = await repairOrderService.submitQualityCheck(
    req.params.id,
    req.body ?? {},
    req.user.sub,
  );
  res.json(result);
}

/**
 * POST /api/repair-orders/:id/forward-to-accountant
 */
export async function forwardToAccountant(req, res) {
  const result = await repairOrderService.forwardToAccountant(req.params.id);
  res.json(result);
}
