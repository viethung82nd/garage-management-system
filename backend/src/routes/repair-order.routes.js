import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import {
  getAllRepairOrders,
  getMyRepairOrders,
  getRepairOrderById,
  createRepairOrder,
  updateRepairOrder,
  updateRepairProgress,
  deleteRepairOrder,
  addStepNote,
  getStepNotes,
  deleteStepNote,
  getRepairOrderStatus,
  getRepairOrderSummary,
} from "../controllers/repair-order.controller.js";

export const repairOrderRouter = Router();

// ============= REPAIR ORDER ROUTES =============

repairOrderRouter.get(
  "/mine",
  requireAuth,
  requireRole("onlineCustomer"),
  asyncHandler(getMyRepairOrders),
);

// Get all repair orders (staff roles only)
repairOrderRouter.get(
  "",
  requireAuth,
  requireRole("admin", "accountant", "serviceAdvisor", "technician"),
  asyncHandler(getAllRepairOrders),
);

// Get a specific repair order
repairOrderRouter.get(
  "/:id",
  requireAuth,
  requireRole("admin", "accountant", "serviceAdvisor", "technician"),
  asyncHandler(getRepairOrderById),
);

// Create a new repair order (service advisor or admin only)
repairOrderRouter.post(
  "",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(createRepairOrder),
);

// Update a repair order (service advisor or admin only)
repairOrderRouter.put(
  "/:id",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(updateRepairOrder),
);

// Update repair order progress (technician, service advisor, or admin)
repairOrderRouter.patch(
  "/:id/progress",
  requireAuth,
  requireRole("technician", "serviceAdvisor", "admin"),
  asyncHandler(updateRepairProgress),
);

// Delete a repair order (admin only)
repairOrderRouter.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(deleteRepairOrder),
);

// ============= STEP NOTES ROUTES =============

// Get all step notes for a repair order
repairOrderRouter.get(
  "/:id/step-notes",
  requireAuth,
  requireRole("admin", "accountant", "serviceAdvisor", "technician"),
  asyncHandler(getStepNotes),
);

// Add a step note to a repair order (technician or admin only)
repairOrderRouter.post(
  "/:id/step-notes",
  requireAuth,
  requireRole("technician", "admin"),
  asyncHandler(addStepNote),
);

// Delete a step note from a repair order (admin only)
repairOrderRouter.delete(
  "/:orderId/step-notes/:noteIndex",
  requireAuth,
  requireRole("admin"),
  asyncHandler(deleteStepNote),
);

// Get repair order status
repairOrderRouter.get(
  "/:id/status",
  requireAuth,
  requireRole("admin", "accountant", "serviceAdvisor", "technician"),
  asyncHandler(getRepairOrderStatus),
);

repairOrderRouter.get(
  "/:id/summary",
  requireAuth,
  requireRole("admin", "accountant", "serviceAdvisor", "technician"),
  asyncHandler(getRepairOrderSummary),
);
