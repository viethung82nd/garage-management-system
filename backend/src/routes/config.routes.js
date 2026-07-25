import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import { getSystemConfig, updateSystemConfig } from "../controllers/config.controller.js";

export const configRouter = Router();

// Read: any authenticated staff member may need today's booking-window/
// capacity settings; write: admin only.
configRouter.get("", requireAuth, catchAsync(getSystemConfig));
configRouter.put("", requireAuth, requireRole("admin"), catchAsync(updateSystemConfig));
