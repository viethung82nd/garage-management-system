import { Router } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { trackRepairOrder } from "../controllers/tracking.controller.js";

export const trackingRouter = Router();

// Public — no requireAuth. Lookup by license plate + phone or order id.
trackingRouter.get("", catchAsync(trackRepairOrder));
