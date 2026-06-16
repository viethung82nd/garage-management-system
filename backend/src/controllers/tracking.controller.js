import { RepairOrderModel } from "../models/index.js";
import { HttpError } from "../middleware/error.js";

/**
 * GET /api/tracking?plate=<licensePlate>&orderId=<id>
 * Public lookup of a repair order's status. The orderId acts as the secret;
 * the license plate must match the order's vehicle. No authentication.
 */
export async function trackRepairOrder(req, res) {
  const { plate, orderId } = req.query;

  if (!plate || !orderId) {
    throw new HttpError(400, "plate and orderId are required");
  }

  if (!String(orderId).match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid repair order ID format");
  }

  const order = await RepairOrderModel.findById(orderId)
    .populate("vehicleId", "licensePlate brand model");

  // Do not reveal whether the order exists when the plate does not match,
  // to prevent license-plate enumeration.
  const normalizedPlate = String(plate).toUpperCase().trim();
  if (!order || !order.vehicleId || order.vehicleId.licensePlate !== normalizedPlate) {
    throw new HttpError(404, "Repair order not found");
  }

  res.json({
    repairOrderId: order._id,
    status: order.status,
    vehicle: {
      licensePlate: order.vehicleId.licensePlate,
      brand: order.vehicleId.brand,
      model: order.vehicleId.model,
    },
    services: order.services.map((s) => ({
      name: s.name,
      price: s.priceAtTime,
      quantity: s.quantity,
    })),
    totalCost: order.totalCost,
    startedAt: order.startedAt,
    completedAt: order.completedAt,
  });
}
