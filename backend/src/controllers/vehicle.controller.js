import * as vehicleService from "../services/vehicle.service.js";

/**
 * GET /api/vehicles/exists?licensePlate=XXX — check whether a vehicle profile
 * already exists for a licence plate.
 */
export async function checkVehicleExists(req, res) {
  const result = await vehicleService.checkVehicleExists(req.query.licensePlate);
  res.json(result);
}

/** POST /api/vehicles — create a new vehicle profile. */
export async function createVehicle(req, res) {
  const vehicle = await vehicleService.createVehicle(req.body ?? {}, req.user);
  res.status(201).json({ vehicle });
}
