import * as trackingService from "../services/tracking.service.js";

/**
 * GET /api/tracking?plate=<licensePlate>&phone=<phone>
 * GET /api/tracking?plate=<licensePlate>&orderId=<id>
 * Public lookup of a repair order's status.
 */
export async function trackRepairOrder(req, res) {
  const result = await trackingService.trackRepairOrder(req.query ?? {});
  res.json(result);
}
