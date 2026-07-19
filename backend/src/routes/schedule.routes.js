import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  getTechnicianSchedule,
  updateScheduleAvailability,
  updateTechnicianSchedule,
} from "../controllers/schedule.controller.js";

export const scheduleRouter = Router();

scheduleRouter.get(
  "/",
  requireAuth,
  requireRole("technician", "serviceAdvisor", "admin"),
  catchAsync(getTechnicianSchedule),
);

scheduleRouter.get(
  "/technician/:technicianId",
  requireAuth,
  requireRole("technician", "serviceAdvisor", "admin"),
  catchAsync(getTechnicianSchedule),
);

scheduleRouter.patch(
  "/",
  requireAuth,
  requireRole("technician", "serviceAdvisor", "admin"),
  catchAsync(updateTechnicianSchedule),
);

scheduleRouter.patch(
  "/technician/:technicianId",
  requireAuth,
  requireRole("technician", "serviceAdvisor", "admin"),
  catchAsync(updateTechnicianSchedule),
);

scheduleRouter.put(
  "/:scheduleId/availability",
  requireAuth,
  requireRole("technician", "serviceAdvisor", "admin"),
  catchAsync(updateScheduleAvailability),
);
