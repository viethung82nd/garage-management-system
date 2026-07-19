import { BookingModel, RepairOrderModel, VehicleModel } from "../models/index.js";
import { resolveCustomer, resolveVehicle } from "./booking.controller.js";
import { HttpError } from "../middleware/error.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;

/**
 * POST /api/receptions — Service Advisor receives a vehicle at the front
 * desk, either from a confirmed booking (bookingId provided) or as a walk-in
 * (no bookingId). Reuses the same find-or-create logic as public booking
 * creation for the customer/vehicle, then always opens a RepairOrder "shell"
 * (no services yet) — this is the single spine record every later stage
 * (inspection, quotation, assignment, quality check, invoicing) attaches to
 * via its repairOrderId, carried through the SA UI as a ?orderId= param.
 */
export async function createReception(req, res) {
  const {
    bookingId,
    customerName,
    phone,
    customerEmail,
    plate,
    model,
    vin,
    engineNo,
    mileage,
    issueDescription,
    promisedAt,
  } = req.body ?? {};

  let booking = null;
  if (bookingId !== undefined && bookingId !== null && bookingId !== "") {
    if (!OID_RE.test(bookingId)) {
      throw new HttpError(400, "Invalid bookingId format");
    }
    booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new HttpError(404, "Booking not found");
    }
    if (booking.repairOrderId) {
      throw new HttpError(409, "This booking has already been received");
    }
  }

  if (!customerName?.trim() || !phone?.trim()) {
    throw new HttpError(400, "customerName and phone are required");
  }
  if (!plate?.trim()) {
    throw new HttpError(400, "plate is required");
  }

  let parsedPromisedAt;
  if (promisedAt) {
    parsedPromisedAt = new Date(promisedAt);
    if (Number.isNaN(parsedPromisedAt.getTime())) {
      throw new HttpError(400, "Invalid promisedAt date");
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (parsedPromisedAt < startOfToday) {
      throw new HttpError(400, "promisedAt cannot be in the past");
    }
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

  const repairOrder = await RepairOrderModel.create({
    vehicleId: vehicle._id,
    advisorId: req.user.sub,
    services: [],
    status: "pending",
    issueDescription: issueDescription?.trim() || undefined,
    promisedAt: parsedPromisedAt,
  });

  if (booking) {
    booking.repairOrderId = repairOrder._id;
    if (booking.status === "pending") {
      booking.status = "confirmed";
      booking.advisorId = req.user.sub;
    }
    await booking.save();
  }

  res.status(201).json({ customer, vehicle, repairOrder, booking });
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
