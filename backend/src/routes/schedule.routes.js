import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import {
  getTechnicianSchedule,
  updateTechnicianSchedule,
} from "../controllers/schedule.controller.js";

export const scheduleRouter = Router();

scheduleRouter.get(
  "/",
  requireAuth,
  requireRole("technician", "serviceAdvisor", "admin"),
  asyncHandler(getTechnicianSchedule),
);

scheduleRouter.patch(
  "/",
  requireAuth,
  requireRole("technician", "serviceAdvisor", "admin"),
  asyncHandler(updateTechnicianSchedule),
);
