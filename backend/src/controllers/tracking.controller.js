import { RepairOrderModel, VehicleModel } from "../models/index.js";
import { HttpError } from "../middleware/error.js";

function normalizePhone(value) {
  return String(value || "").replace(/\D+/g, "");
}

/**
 * GET /api/tracking?plate=<licensePlate>&phone=<phone>
 * GET /api/tracking?plate=<licensePlate>&orderId=<id>
 * Public lookup of a repair order's status. Supports the current customer UX
 * (plate + phone) and the imported branch contract (plate + orderId).
 */
export async function trackRepairOrder(req, res) {
  const { plate, orderId, phone } = req.query;

  if (!plate) {
    throw new HttpError(400, "plate is required");
  }
  if (!orderId && !phone) {
    throw new HttpError(400, "Provide plate with phone or orderId");
  }

  const normalizedPlate = String(plate).toUpperCase().trim();
  let order = null;

  if (orderId) {
    if (!String(orderId).match(/^[0-9a-fA-F]{24}$/)) {
      throw new HttpError(400, "Invalid repair order ID format");
    }

    order = await RepairOrderModel.findById(orderId).populate(
      "vehicleId",
      "licensePlate brand model"
    );

    if (!order || !order.vehicleId || order.vehicleId.licensePlate !== normalizedPlate) {
      throw new HttpError(404, "Repair order not found");
    }
  } else {
    const vehicle = await VehicleModel.findOne({ licensePlate: normalizedPlate }).populate(
      "customerId",
      "fullName phone"
    );

    if (
      !vehicle?.customerId?.phone ||
      normalizePhone(vehicle.customerId.phone) !== normalizePhone(phone)
    ) {
      throw new HttpError(404, "Repair order not found");
    }

    order = await RepairOrderModel.findOne({ vehicleId: vehicle._id })
      .sort({ _id: -1 })
      .populate("vehicleId", "licensePlate brand model");

    if (!order) {
      throw new HttpError(404, "Repair order not found");
    }
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
