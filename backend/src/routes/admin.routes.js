import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import { getStatsSummary } from "../controllers/admin.controller.js";

export const adminRouter = Router();

// Dashboard stats: admins always; accountants for the revenue figures.
adminRouter.get(
  "/stats/summary",
  requireAuth,
  requireRole("admin", "accountant"),
  asyncHandler(getStatsSummary)
);
