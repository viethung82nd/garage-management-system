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

// User account management: admins manage accounts; service advisors also read
// the list to staff repair orders (e.g. assigning a technician); technicians
// may call this too but only ever get the technician list back (enforced in
// the controller) — needed to pick a peer when requesting a task transfer.
adminRouter.get(
  "/users",
  requireAuth,
  requireRole("admin", "serviceAdvisor", "technician"),
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
