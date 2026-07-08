import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import {
  createVehicle,
  checkVehicleExists,
} from "../controllers/vehicle.controller.js";

export const vehicleRouter = Router();

// Check whether a vehicle profile exists for a licence plate (reception tool,
// staff only). Declared before any parameterised route.
vehicleRouter.get(
  "/exists",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(checkVehicleExists)
);

// Create a vehicle profile: staff register for any customer; registered
// customers (onlineCustomer) add a vehicle to their own account.
vehicleRouter.post(
  "/",
  requireAuth,
  requireRole("serviceAdvisor", "admin", "onlineCustomer"),
  asyncHandler(createVehicle)
);
