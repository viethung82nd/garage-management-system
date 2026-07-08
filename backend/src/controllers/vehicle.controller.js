import mongoose from "mongoose";
import { VehicleModel, UserModel } from "../models/index.js";
import { HttpError } from "../middleware/error.js";

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
    throw new HttpError(400, `year must be an integer between 1900 and ${maxYear}`);
  }
  return parsed;
}

/**
 * GET /api/vehicles/exists?licensePlate=XXX — check whether a vehicle profile
 * already exists for a licence plate. Used at reception before creating a new
 * profile, to avoid duplicates and confirm the registered owner. Returns
 * `{ exists, vehicle }` where `vehicle` is the matched profile (with its owner)
 * or null.
 */
export async function checkVehicleExists(req, res) {
  const { licensePlate } = req.query;
  if (!licensePlate?.trim()) {
    throw new HttpError(400, "licensePlate is required");
  }
  const plate = String(licensePlate).toUpperCase().trim();

  const vehicle = await VehicleModel.findOne({ licensePlate: plate })
    .populate("customerId", "fullName phone")
    .lean();

  res.json({ exists: Boolean(vehicle), vehicle: vehicle ?? null });
}

/**
 * POST /api/vehicles — create a new vehicle profile.
 *
 * Staff (serviceAdvisor, admin) register a vehicle for any customer, passing
 * `customerId` in the body. Registered customers (onlineCustomer) add a vehicle
 * to their own account; their owner id comes from the auth token and any
 * `customerId` in the body is ignored. licensePlate is unique — a duplicate
 * yields a 409.
 */
export async function createVehicle(req, res) {
  const {
    licensePlate,
    chassisNumber,
    engineNumber,
    brand,
    model,
    year,
    color,
  } = req.body ?? {};

  if (!licensePlate?.trim()) {
    throw new HttpError(400, "licensePlate is required");
  }
  const parsedYear = parseYear(year);

  // Resolve the owning customer based on who is calling.
  let customerId;
  if (STAFF_ROLES.includes(req.user.role)) {
    customerId = req.body?.customerId;
    if (!mongoose.isValidObjectId(customerId)) {
      throw new HttpError(400, "customerId is required and must be a valid id");
    }
    const customer = await UserModel.findById(customerId).select("role").lean();
    if (!customer || !CUSTOMER_ROLES.includes(customer.role)) {
      throw new HttpError(404, "customer not found");
    }
  } else {
    // Self-service: the authenticated customer owns the vehicle.
    customerId = req.user.sub;
  }

  try {
    const vehicle = await VehicleModel.create({
      licensePlate: licensePlate.toUpperCase().trim(),
      chassisNumber: chassisNumber?.trim() || undefined,
      engineNumber: engineNumber?.trim() || undefined,
      customerId,
      brand: brand?.trim() || undefined,
      model: model?.trim() || undefined,
      year: parsedYear,
      color: color?.trim() || undefined,
    });
    res.status(201).json({ vehicle });
  } catch (err) {
    if (err?.code === 11000) {
      throw new HttpError(409, "a vehicle with this licensePlate already exists");
    }
    throw err;
  }
}
