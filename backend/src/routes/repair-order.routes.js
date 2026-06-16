import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import {
  getAllRepairOrders,
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

// Get all repair orders (authenticated users)
repairOrderRouter.get("", requireAuth, asyncHandler(getAllRepairOrders));

// Get a specific repair order
repairOrderRouter.get("/:id", requireAuth, asyncHandler(getRepairOrderById));

// Create a new repair order (advisor or admin only)
repairOrderRouter.post(
  "",
  requireAuth,
  requireRole("advisor", "admin"),
  asyncHandler(createRepairOrder),
);

// Update a repair order (advisor or admin only)
repairOrderRouter.put(
  "/:id",
  requireAuth,
  requireRole("advisor", "admin"),
  asyncHandler(updateRepairOrder),
);

// Update repair order progress (technician, advisor, or admin)
repairOrderRouter.patch(
  "/:id/progress",
  requireAuth,
  requireRole("technician", "advisor", "admin"),
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
  asyncHandler(getRepairOrderStatus),
);

repairOrderRouter.get(
  "/:id/summary",
  requireAuth,
  asyncHandler(getRepairOrderSummary),
);
