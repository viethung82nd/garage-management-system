import { RepairOrderModel, VehicleModel } from "../models/index.js";
import { resolveCustomer, resolveVehicle } from "./booking.controller.js";
import { HttpError } from "../middleware/error.js";

/**
 * POST /api/receptions — Service Advisor registers a walk-in customer +
 * vehicle at the front desk (no prior booking). Reuses the same
 * find-or-create logic as public booking creation. Doesn't create a Booking
 * (the appointment/slot system is for scheduling future capacity, not a
 * customer already standing at the desk) — the SA continues straight to
 * /advisor/work-orders to open a real RepairOrder for this vehicle.
 */
export async function createReception(req, res) {
  const {
    customerName,
    phone,
    customerEmail,
    plate,
    model,
    vin,
    engineNo,
    mileage,
  } = req.body ?? {};

  if (!customerName?.trim() || !phone?.trim()) {
    throw new HttpError(400, "customerName and phone are required");
  }
  if (!plate?.trim()) {
    throw new HttpError(400, "plate is required");
  }

  const customer = await resolveCustomer({
    fullName: customerName,
    phone,
    email: customerEmail,
  });
  const vehicle = await resolveVehicle(
    { licensePlate: plate, model },
    customer._id,
  );

  if (vin?.trim()) vehicle.chassisNumber = vin.trim();
  if (engineNo?.trim()) vehicle.engineNumber = engineNo.trim();
  const parsedMileage = mileage != null ? Number(String(mileage).replace(/[^\d]/g, "")) : undefined;
  if (parsedMileage != null && !Number.isNaN(parsedMileage)) {
    vehicle.lastKnownMileage = parsedMileage;
  }
  await vehicle.save();

  res.status(201).json({ customer, vehicle });
}

/**
 * GET /api/receptions/history?plate=... — prior visits for a plate, used to
 * autofill the reception form and surface repeat-repair risk notes.
 */
export async function getReceptionHistory(req, res) {
  const plate = String(req.query.plate ?? "").trim();
  if (!plate) {
    res.json({ suggestions: [] });
    return;
  }

  const vehicle = await VehicleModel.findOne({
    licensePlate: plate.toUpperCase(),
  }).populate("customerId", "fullName phone email");

  if (!vehicle) {
    res.json({ suggestions: [] });
    return;
  }

  const orders = await RepairOrderModel.find({ vehicleId: vehicle._id })
    .populate("services.serviceId", "name")
    .sort({ completedAt: -1, createdAt: -1 })
    .limit(3);

  if (!orders.length) {
    res.json({
      suggestions: [
        {
          _id: vehicle._id,
          vehicleId: vehicle,
          customerId: vehicle.customerId,
          mileage: vehicle.lastKnownMileage,
          updatedAt: vehicle.updatedAt,
        },
      ],
    });
    return;
  }

  res.json({
    suggestions: orders.map((order) => ({
      _id: order._id,
      vehicleId: vehicle,
      customerId: vehicle.customerId,
      mileage: vehicle.lastKnownMileage,
      lastVisit: order.completedAt || order.updatedAt || order.createdAt,
      services: order.services,
      note: order.stepNotes?.at(-1)?.content,
    })),
  });
}
