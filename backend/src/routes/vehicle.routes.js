import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  createVehicle,
  checkVehicleExists,
  updateVehicleProfile,
  getOdometerHistory,
} from "../controllers/vehicle.controller.js";

export const vehicleRouter = Router();

// Check whether a vehicle profile exists for a licence plate (reception tool,
// staff only). Declared before any parameterised route.
vehicleRouter.get(
  "/exists",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(checkVehicleExists)
);

// Create a vehicle profile: staff register for any customer; registered
// customers (onlineCustomer) add a vehicle to their own account.
vehicleRouter.post(
  "/",
  requireAuth,
  requireRole("serviceAdvisor", "admin", "onlineCustomer"),
  catchAsync(createVehicle)
);

// Update renewal dates — the reminder triggers.
vehicleRouter.patch(
  "/:id/profile",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(updateVehicleProfile)
);

// The dated odometer history behind a vehicle's current reading.
vehicleRouter.get(
  "/:id/odometer",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(getOdometerHistory)
);
