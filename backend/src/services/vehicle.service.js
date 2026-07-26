import mongoose from "mongoose";
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { InspectionReportModel, OdometerLogModel } from "../models/index.js";
import { ApiError } from "../utils/apiError.js";

const CUSTOMER_ROLES = ["onlineCustomer", "walkInCustomer"];
const STAFF_ROLES = ["serviceAdvisor", "admin"];

/**
 * Validates an optional `year` from the request. Returns the parsed integer, or
 * undefined when the field is absent/blank. Throws a 400 on a nonsense value.
 */
function parseYear(year) {
  if (year === undefined || year === null || year === "") return undefined;
  const parsed = Number(year);
  const maxYear = new Date().getFullYear() + 1; // allow next model-year vehicles
  if (!Number.isInteger(parsed) || parsed < 1900 || parsed > maxYear) {
    throw new ApiError(400, `year must be an integer between 1900 and ${maxYear}`);
  }
  return parsed;
}

/**
 * Check whether a vehicle profile already exists for a licence plate. Used at
 * reception before creating a new profile, to avoid duplicates and confirm the
 * registered owner. Returns `{ exists, vehicle }` where `vehicle` is the
 * matched profile (with its owner) or null.
 */
export async function checkVehicleExists(licensePlate) {
  if (!licensePlate?.trim()) {
    throw new ApiError(400, "licensePlate is required");
  }
  const plate = String(licensePlate).toUpperCase().trim();

  const vehicle = await vehicleRepository.model
    .findOne({ licensePlate: plate })
    .populate("customerId", "fullName phone")
    .lean();

  return { exists: Boolean(vehicle), vehicle: vehicle ?? null };
}

/**
 * Create a new vehicle profile.
 *
 * Staff (serviceAdvisor, admin) register a vehicle for any customer, passing
 * `customerId` in the body. Registered customers (onlineCustomer) add a vehicle
 * to their own account; their owner id comes from the auth token and any
 * `customerId` in the body is ignored. licensePlate is unique — a duplicate
 * yields a 409.
 */
export async function createVehicle(body, user) {
  const { licensePlate, chassisNumber, engineNumber, brand, model, year, color } =
    body ?? {};

  if (!licensePlate?.trim()) {
    throw new ApiError(400, "licensePlate is required");
  }
  const parsedYear = parseYear(year);

  // Resolve the owning customer based on who is calling.
  let customerId;
  if (STAFF_ROLES.includes(user.role)) {
    customerId = body?.customerId;
    if (!mongoose.isValidObjectId(customerId)) {
      throw new ApiError(400, "customerId is required and must be a valid id");
    }
    const customer = await userRepository.model
      .findById(customerId)
      .select("role")
      .lean();
    if (!customer || !CUSTOMER_ROLES.includes(customer.role)) {
      throw new ApiError(404, "customer not found");
    }
  } else {
    // Self-service: the authenticated customer owns the vehicle.
    customerId = user.sub;
  }

  try {
    const vehicle = await vehicleRepository.create({
      licensePlate: licensePlate.toUpperCase().trim(),
      chassisNumber: chassisNumber?.trim() || undefined,
      engineNumber: engineNumber?.trim() || undefined,
      customerId,
      brand: brand?.trim() || undefined,
      model: model?.trim() || undefined,
      year: parsedYear,
      color: color?.trim() || undefined,
    });
    return vehicle;
  } catch (err) {
    if (err?.code === 11000) {
      throw new ApiError(409, "a vehicle with this licensePlate already exists");
    }
    throw err;
  }
}

const OID_RE = /^[0-9a-fA-F]{24}$/;

/**
 * Updates a vehicle's renewal dates — the registration, insurance and
 * manufacturer-warranty expiries that drive the highest-value reminders. Kept
 * to these fields (not the identity fields like plate/VIN) because that's what
 * the front desk actually updates as a customer brings paperwork in.
 */
export async function updateVehicleProfile(id, body) {
  if (!OID_RE.test(String(id))) {
    throw new ApiError(400, "Invalid vehicle ID format");
  }
  const vehicle = await vehicleRepository.findById(id);
  if (!vehicle) {
    throw new ApiError(404, "Vehicle not found");
  }

  const dateFields = ["registrationExpiry", "insuranceExpiry", "manufacturerWarrantyExpiry", "soldAt"];
  for (const field of dateFields) {
    if (body?.[field] !== undefined) {
      if (body[field] === null || body[field] === "") {
        vehicle[field] = undefined;
        continue;
      }
      const date = new Date(body[field]);
      if (Number.isNaN(date.getTime())) {
        throw new ApiError(400, `${field} must be a valid date`);
      }
      vehicle[field] = date;
    }
  }

  await vehicle.save();
  return vehicle;
}

/**
 * Returns all vehicles belonging to a customer, each enriched with the
 * first photo from its most recent inspection report. Used by the customer
 * profile page to display every vehicle the customer owns.
 */
export async function getMyVehicles(customerId) {
  const vehicles = await vehicleRepository.model
    .find({ customerId })
    .select("-__v")
    .sort({ createdAt: -1 });

  // Attach the latest inspection photo per vehicle
  const enriched = await Promise.all(
    vehicles.map(async (vehicle) => {
      const latestReport = await InspectionReportModel.findOne(
        { vehicleId: vehicle._id, photos: { $exists: true, $not: { $size: 0 } } },
      )
        .sort({ inspectedAt: -1 })
        .select("photos inspectedAt")
        .lean();

      return {
        ...vehicle.toObject(),
        photo: latestReport?.photos?.[0] || null,
        lastInspectedAt: latestReport?.inspectedAt || null,
      };
    }),
  );

  return enriched;
}

/** The dated odometer history for a vehicle, newest first. */
export async function getOdometerHistory(id) {
  if (!OID_RE.test(String(id))) {
    throw new ApiError(400, "Invalid vehicle ID format");
  }
  const readings = await OdometerLogModel.find({ vehicleId: id })
    .sort({ recordedAt: -1 })
    .limit(100);
  return { readings };
}
