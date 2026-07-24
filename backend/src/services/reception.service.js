import { bookingRepository } from "../repositories/booking.repository.js";
import { repairOrderRepository } from "../repositories/repair-order.repository.js";
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { resolveCustomer, resolveVehicle } from "./booking.service.js";
import { ApiError } from "../utils/apiError.js";
import { runInTransaction } from "../utils/transaction.js";
import { generateCode } from "../utils/sequence.js";
import { recordStatusChange } from "../utils/orderStatus.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

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

  // ===== Customer validation =====

  if (!customerName?.trim()) {
    throw new ApiError(400, "Customer name is required");
  }

  if (!phone?.trim()) {
    throw new ApiError(400, "Phone number is required");
  }

  const phoneRegex = /^0\d{9}$/;

  if (!phoneRegex.test(phone.trim())) {
    throw new ApiError(
      400,
      "Phone number must contain exactly 10 digits and start with 0",
    );
  }

  // ===== Vehicle validation =====

  if (!plate?.trim()) {
    throw new ApiError(400, "License plate is required");
  }

  if (!model?.trim()) {
    throw new ApiError(400, "Vehicle model is required");
  }

  if (!vin?.trim()) {
    throw new ApiError(400, "VIN is required");
  }

  if (!engineNo?.trim()) {
    throw new ApiError(400, "Engine number is required");
  }

  if (mileage == null || String(mileage).trim() === "") {
    throw new ApiError(400, "Mileage is required");
  }

  // ===== VIN validation =====

  let normalizedVin = vin.trim().toUpperCase();

  if (!VIN_RE.test(normalizedVin)) {
    throw new ApiError(
      400,
      "VIN must contain exactly 17 uppercase letters and numbers (excluding I, O and Q)",
    );
  }

  // ===== Mileage validation =====

  const normalizedMileage = String(mileage).replace(/,/g, "").trim();

  if (!/^\d+$/.test(normalizedMileage)) {
    throw new ApiError(400, "Mileage must be a non-negative whole number");
  }

  const parsedMileage = Number(normalizedMileage);

  // ===== Promised return validation =====

  let parsedPromisedAt;

  if (promisedAt) {
    parsedPromisedAt = new Date(promisedAt);

    if (Number.isNaN(parsedPromisedAt.getTime())) {
      throw new ApiError(400, "Invalid promisedAt date");
    }

    if (parsedPromisedAt < new Date()) {
      throw new ApiError(
        400,
        "Promised return date and time cannot be in the past",
      );
    }
  }

  // ===== Find/Create customer, vehicle, repair order — atomically =====
  //
  // Reception is a chain of coupled writes: find-or-create the customer, then
  // the vehicle, update the vehicle's VIN/mileage, open the repair-order shell,
  // and mark the booking as received (repairOrderId set). A partial run is
  // exactly the failure class this transaction exists to prevent — e.g. a
  // repair order created but the booking left unlinked (so a retry opens a
  // second order), or a booking flagged received with no order behind it. All
  // of it commits together or not at all.
  const repairOrderCode = await generateCode("RO");

  const result = await runInTransaction(async (session) => {
    const customer = await resolveCustomer(
      {
        fullName: customerName.trim(),
        phone: phone.trim(),
        email: customerEmail,
      },
      session,
    );

    const vehicle = await resolveVehicle(
      {
        licensePlate: plate.trim(),
        model: model.trim(),
      },
      customer._id,
      session,
    );

    vehicle.chassisNumber = normalizedVin;
    vehicle.engineNumber = engineNo.trim();
    vehicle.lastKnownMileage = parsedMileage;

    await vehicle.save({ session });

    const [repairOrder] = await repairOrderRepository.model.create(
      [
        {
          code: repairOrderCode,
          vehicleId: vehicle._id,
          advisorId,
          services: [],
          status: "pending",
          issueDescription: issueDescription?.trim() || undefined,
          serviceCategory: booking?.serviceCategory || undefined,
          promisedAt: parsedPromisedAt,
        },
      ],
      { session },
    );

    if (booking) {
      booking.repairOrderId = repairOrder._id;

      if (booking.status === "pending") {
        booking.status = "confirmed";
        booking.advisorId = advisorId;
      }

      await booking.save({ session });
    }

    return { customer, vehicle, repairOrder, booking };
  });

  await recordStatusChange({
    repairOrderId: result.repairOrder._id,
    from: null,
    to: "pending",
    changedBy: advisorId,
    reason: "Vehicle received at front desk",
  });

  return result;
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
