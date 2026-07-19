import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import { getAdvisorDashboard } from "../controllers/advisor.controller.js";

export const advisorRouter = Router();

advisorRouter.get(
  "/dashboard",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(getAdvisorDashboard),
);
