import { bookingRepository } from "../repositories/booking.repository.js";
import { repairOrderRepository } from "../repositories/repair-order.repository.js";
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { resolveCustomer, resolveVehicle } from "./booking.service.js";
import { OdometerLogModel } from "../models/index.js";
import { ApiError } from "../utils/apiError.js";
import { runInTransaction } from "../utils/transaction.js";
import { generateCode } from "../utils/sequence.js";
import { recordStatusChange } from "../utils/orderStatus.js";
import { logAudit } from "../utils/audit.js";

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
    // When the advisor opens this intake as a comeback (a return under a prior
    // repair's warranty), the id of that original order — see the comeback
    // detection returned from a previous reception.
    parentRoId,
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

    // An odometer only ever goes up. A reading below the last recorded one is
    // either a keying error or a tampered/rolled-back meter — we accept it (so
    // the front desk isn't blocked) but flag it, log it, and warn the advisor,
    // rather than silently overwriting the history with a smaller number.
    const previousMileage = vehicle.lastKnownMileage;
    const isRollback = typeof previousMileage === "number" && parsedMileage < previousMileage;

    vehicle.chassisNumber = normalizedVin;
    vehicle.engineNumber = engineNo.trim();
    vehicle.lastKnownMileage = parsedMileage;

    await vehicle.save({ session });

    const isComeback = Boolean(parentRoId && OID_RE.test(String(parentRoId)));
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
          isComeback,
          parentRoId: isComeback ? parentRoId : undefined,
        },
      ],
      { session },
    );

    // Append to the odometer history (drives maintenance-interval reminders and
    // preserves the rollback flag).
    await OdometerLogModel.create(
      [
        {
          vehicleId: vehicle._id,
          mileage: parsedMileage,
          source: "reception",
          repairOrderId: repairOrder._id,
          recordedBy: advisorId,
          isRollback,
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

    return { customer, vehicle, repairOrder, booking, isRollback, previousMileage };
  });

  await recordStatusChange({
    repairOrderId: result.repairOrder._id,
    from: null,
    to: "pending",
    changedBy: advisorId,
    reason: "Vehicle received at front desk",
  });

  if (result.isRollback) {
    await logAudit({
      action: "stockAdjusted", // reused generic audit action; see details text
      actorId: advisorId,
      repairOrderId: result.repairOrder._id,
      targetModel: "Vehicle",
      targetId: result.vehicle._id,
      details: `Odometer rollback: entered ${parsedMileage} km, previous was ${result.previousMileage} km`,
    });
  }

  // Surface a comeback: this vehicle returning while a previous repair is still
  // under its service warranty. The advisor sees it at intake so the new order
  // can be opened as a comeback (linked to the original) rather than as fresh
  // paid work — see findActiveWarrantyOrder.
  const comeback = await findActiveWarrantyOrder(
    result.vehicle._id,
    parsedMileage,
    result.repairOrder._id,
  );

  return {
    ...result,
    warnings: {
      odometerRollback: result.isRollback
        ? `Odometer entered (${parsedMileage} km) is lower than the last reading (${result.previousMileage} km).`
        : null,
      comeback,
    },
  };
}

/**
 * Finds a prior delivered order on this vehicle whose service warranty still
 * covers the vehicle now — by date and, if a warranty kilometre cap was set, by
 * odometer. The basis for flagging a return as a comeback rather than new work.
 * Excludes the just-created order.
 */
async function findActiveWarrantyOrder(vehicleId, currentMileage, excludeOrderId) {
  const now = new Date();
  const candidate = await repairOrderRepository.model
    .findOne({
      _id: { $ne: excludeOrderId },
      vehicleId,
      deliveredAt: { $ne: null },
      warrantyUntilDate: { $gte: now },
    })
    .sort({ deliveredAt: -1 })
    .select("code deliveredAt warrantyUntilDate warrantyUntilKm");

  if (!candidate) return null;
  // If a kilometre cap was set, the car must also be within it.
  if (
    typeof candidate.warrantyUntilKm === "number" &&
    typeof currentMileage === "number" &&
    currentMileage > candidate.warrantyUntilKm
  ) {
    return null;
  }

  return {
    parentRoId: candidate._id,
    parentCode: candidate.code,
    deliveredAt: candidate.deliveredAt,
    warrantyUntilDate: candidate.warrantyUntilDate,
    message: `This vehicle's previous repair (${candidate.code}) is under service warranty until ${candidate.warrantyUntilDate.toISOString().slice(0, 10)} — consider opening this as a comeback.`,
  };
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
