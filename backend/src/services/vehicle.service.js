import mongoose from "mongoose";
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { userRepository } from "../repositories/user.repository.js";
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
