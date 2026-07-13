import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import { getAdvisorDashboard } from "../controllers/advisor.controller.js";

export const advisorRouter = Router();

advisorRouter.get(
  "/dashboard",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(getAdvisorDashboard),
);
