import { bookingRepository } from "../repositories/booking.repository.js";
import { repairOrderRepository } from "../repositories/repair-order.repository.js";
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { resolveCustomer, resolveVehicle } from "./booking.service.js";
import { ApiError } from "../utils/apiError.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;

/**
 * Service Advisor receives a vehicle at the front desk, either from a
 * confirmed booking (bookingId provided) or as a walk-in (no bookingId).
 * Reuses the same find-or-create logic as public booking creation for the
 * customer/vehicle, then always opens a RepairOrder "shell" (no services yet)
 * — this is the single spine record every later stage (inspection,
 * quotation, assignment, quality check, invoicing) attaches to via its
 * repairOrderId, carried through the SA UI as a ?orderId= param.
 */
export async function createReception(
  {
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
  },
  advisorId,
) {
  let booking = null;
  if (bookingId !== undefined && bookingId !== null && bookingId !== "") {
    if (!OID_RE.test(bookingId)) {
      throw new ApiError(400, "Invalid bookingId format");
    }
    booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }
    if (booking.repairOrderId) {
      throw new ApiError(409, "This booking has already been received");
    }
  }

  if (!customerName?.trim() || !phone?.trim()) {
    throw new ApiError(400, "customerName and phone are required");
  }
  if (!plate?.trim()) {
    throw new ApiError(400, "plate is required");
  }

  let parsedPromisedAt;
  if (promisedAt) {
    parsedPromisedAt = new Date(promisedAt);
    if (Number.isNaN(parsedPromisedAt.getTime())) {
      throw new ApiError(400, "Invalid promisedAt date");
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (parsedPromisedAt < startOfToday) {
      throw new ApiError(400, "promisedAt cannot be in the past");
    }
  }

  const customer = await resolveCustomer({ fullName: customerName, phone, email: customerEmail });
  const vehicle = await resolveVehicle({ licensePlate: plate, model }, customer._id);

  if (vin?.trim()) vehicle.chassisNumber = vin.trim();
  if (engineNo?.trim()) vehicle.engineNumber = engineNo.trim();
  const parsedMileage = mileage != null ? Number(String(mileage).replace(/[^\d]/g, "")) : undefined;
  if (parsedMileage != null && !Number.isNaN(parsedMileage)) {
    vehicle.lastKnownMileage = parsedMileage;
  }
  await vehicle.save();

  const repairOrder = await repairOrderRepository.create({
    vehicleId: vehicle._id,
    advisorId,
    services: [],
    status: "pending",
    issueDescription: issueDescription?.trim() || undefined,
    promisedAt: parsedPromisedAt,
  });

  if (booking) {
    booking.repairOrderId = repairOrder._id;
    if (booking.status === "pending") {
      booking.status = "confirmed";
      booking.advisorId = advisorId;
    }
    await booking.save();
  }

  return { customer, vehicle, repairOrder, booking };
}

/**
 * Prior visits for a plate, used to autofill the reception form and surface
 * repeat-repair risk notes.
 */
export async function getReceptionHistory(plateParam) {
  const plate = String(plateParam ?? "").trim();
  if (!plate) {
    return { suggestions: [] };
  }

  const vehicle = await vehicleRepository.model
    .findOne({ licensePlate: plate.toUpperCase() })
    .populate("customerId", "fullName phone email");

  if (!vehicle) {
    return { suggestions: [] };
  }

  const orders = await repairOrderRepository.model
    .find({ vehicleId: vehicle._id })
    .populate("services.serviceId", "name")
    .sort({ completedAt: -1, createdAt: -1 })
    .limit(3);

  if (!orders.length) {
    return {
      suggestions: [
        {
          _id: vehicle._id,
          vehicleId: vehicle,
          customerId: vehicle.customerId,
          mileage: vehicle.lastKnownMileage,
          updatedAt: vehicle.updatedAt,
        },
      ],
    };
  }

  return {
    suggestions: orders.map((order) => ({
      _id: order._id,
      vehicleId: vehicle,
      customerId: vehicle.customerId,
      mileage: vehicle.lastKnownMileage,
      lastVisit: order.completedAt || order.updatedAt || order.createdAt,
      services: order.services,
      note: order.stepNotes?.at(-1)?.content,
    })),
  };
}
