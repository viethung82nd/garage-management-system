import { Router } from "express";
import { asyncHandler } from "../middleware/error.js";
import { trackRepairOrder } from "../controllers/tracking.controller.js";

export const trackingRouter = Router();

// Public — no requireAuth. Lookup by license plate + phone or order id.
trackingRouter.get("", asyncHandler(trackRepairOrder));
