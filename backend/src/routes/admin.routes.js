import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import {
  getStatsSummary,
  getRevenueReport,
  getTechnicianPerformance,
  listUsers,
  deactivateUser,
} from "../controllers/admin.controller.js";

export const adminRouter = Router();

// User account management: admins only.
adminRouter.get(
  "/users",
  requireAuth,
  requireRole("admin"),
  asyncHandler(listUsers)
);
adminRouter.patch(
  "/users/:id/deactivate",
  requireAuth,
  requireRole("admin"),
  asyncHandler(deactivateUser)
);

// Dashboard stats: admins always; accountants for the revenue figures.
adminRouter.get(
  "/stats/summary",
  requireAuth,
  requireRole("admin", "accountant"),
  asyncHandler(getStatsSummary)
);

// Detailed reports: admins and accountants.
adminRouter.get(
  "/reports/revenue",
  requireAuth,
  requireRole("admin", "accountant"),
  asyncHandler(getRevenueReport)
);
adminRouter.get(
  "/reports/technicians",
  requireAuth,
  requireRole("admin", "accountant"),
  asyncHandler(getTechnicianPerformance)
);
