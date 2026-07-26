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

/** PATCH /api/vehicles/:id/profile — update renewal dates (registration,
 *  insurance, manufacturer warranty). */
export async function updateVehicleProfile(req, res) {
  const vehicle = await vehicleService.updateVehicleProfile(req.params.id, req.body ?? {});
  res.json({ vehicle });
}

/** GET /api/vehicles/:id/odometer — the dated odometer history. */
export async function getOdometerHistory(req, res) {
  const result = await vehicleService.getOdometerHistory(req.params.id);
  res.json(result);
}

/** GET /api/vehicles/mine — the authenticated customer's vehicles. */
export async function getMyVehicles(req, res) {
  const vehicles = await vehicleService.getMyVehicles(req.user.sub);
  res.json({ vehicles });
}
