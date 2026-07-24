import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  generateReminders,
  listReminders,
  updateReminder,
} from "../controllers/reminder.controller.js";

export const reminderRouter = Router();

// The reminder queue is a service-desk tool — same roles as deferred work.
reminderRouter.use(requireAuth, requireRole("serviceAdvisor", "admin"));

// Fixed path before "/:id" so "generate" is never parsed as a reminder ID.
reminderRouter.post("/generate", catchAsync(generateReminders));
reminderRouter.get("", catchAsync(listReminders));
reminderRouter.patch("/:id", catchAsync(updateReminder));
