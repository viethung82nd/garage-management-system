import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import { imageUpload } from "../middlewares/upload.middleware.js";
import {
  getAllRepairOrders,
  getMyRepairOrders,
  getRepairOrderById,
  createRepairOrder,
  updateRepairOrder,
  updateRepairProgress,
  assignServiceTechnicians,
  deleteRepairOrder,
  addStepNote,
  getStepNotes,
  deleteStepNote,
  getRepairOrderStatus,
  getRepairOrderSummary,
  submitQualityCheck,
  forwardToAccountant,
  deliverVehicle,
  issuePartsForOrder,
  clockOn,
  clockOff,
  getOrderTimeLogs,
} from "../controllers/repair-order.controller.js";

export const repairOrderRouter = Router();

// ============= REPAIR ORDER ROUTES =============

repairOrderRouter.get(
  "/mine",
  requireAuth,
  requireRole("onlineCustomer"),
  catchAsync(getMyRepairOrders),
);

// Get all repair orders (staff roles only)
repairOrderRouter.get(
  "",
  requireAuth,
  requireRole("admin", "accountant", "serviceAdvisor", "technician"),
  catchAsync(getAllRepairOrders),
);

// Get a specific repair order
repairOrderRouter.get(
  "/:id",
  requireAuth,
  requireRole("admin", "accountant", "serviceAdvisor", "technician"),
  catchAsync(getRepairOrderById),
);

// Create a new repair order (service advisor or admin only)
repairOrderRouter.post(
  "",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(createRepairOrder),
);

// Update a repair order (service advisor or admin only)
repairOrderRouter.put(
  "/:id",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(updateRepairOrder),
);

// Update repair order progress (technician, service advisor, or admin)
repairOrderRouter.patch(
  "/:id/progress",
  requireAuth,
  requireRole("technician", "serviceAdvisor", "admin"),
  catchAsync(updateRepairProgress),
);

// Assign (or reassign/clear) the technician for one or more service lines.
repairOrderRouter.patch(
  "/:id/assign",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(assignServiceTechnicians),
);

// Delete a repair order (admin only)
repairOrderRouter.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  catchAsync(deleteRepairOrder),
);

// ============= STEP NOTES ROUTES =============

// Get all step notes for a repair order
repairOrderRouter.get(
  "/:id/step-notes",
  requireAuth,
  requireRole("admin", "accountant", "serviceAdvisor", "technician"),
  catchAsync(getStepNotes),
);

// Add a step note to a repair order (technician or admin only). Multipart so
// evidence photos of the actual work done can ride along with the note text.
const stepNotePhotoUpload = imageUpload();
repairOrderRouter.post(
  "/:id/step-notes",
  requireAuth,
  requireRole("technician", "admin"),
  stepNotePhotoUpload.array("photos", 10),
  catchAsync(addStepNote),
);

// Delete a step note from a repair order (admin only)
repairOrderRouter.delete(
  "/:orderId/step-notes/:noteIndex",
  requireAuth,
  requireRole("admin"),
  catchAsync(deleteStepNote),
);

// Get repair order status
repairOrderRouter.get(
  "/:id/status",
  requireAuth,
  requireRole("admin", "accountant", "serviceAdvisor", "technician"),
  catchAsync(getRepairOrderStatus),
);

repairOrderRouter.get(
  "/:id/summary",
  requireAuth,
  requireRole("admin", "accountant", "serviceAdvisor", "technician"),
  catchAsync(getRepairOrderSummary),
);

// Quality check: a QC inspector (or advisor/admin) reviews a
// technician-completed order before it can be invoiced.
repairOrderRouter.post(
  "/:id/quality-check",
  requireAuth,
  requireRole("qcInspector", "serviceAdvisor", "admin"),
  catchAsync(submitQualityCheck),
);

// Forward a QC-passed order to accounting for invoicing.
repairOrderRouter.post(
  "/:id/forward-to-accountant",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(forwardToAccountant),
);

// Deliver the vehicle to the customer — the final handover, gated on QC
// having passed and the invoice being paid in full.
repairOrderRouter.post(
  "/:id/deliver",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(deliverVehicle),
);

// The parts desk issues reserved stock to the technician working this order.
// Technicians may also pull their own order's parts directly (BR-JOB-01:
// only the assigned technician, enforced in the service layer).
repairOrderRouter.post(
  "/:id/issue-parts",
  requireAuth,
  requireRole("partsStaff", "serviceAdvisor", "admin", "technician"),
  catchAsync(issuePartsForOrder),
);

// ============= TECHNICIAN TIME LOGGING (Phase 4a) =============

// Technician clocks on to start hands-on work — refused while the order is
// waiting/on-hold or terminal, and refused if the technician already has
// another job's clock left running. See repair-order.service.js#clockOn.
repairOrderRouter.post(
  "/:id/clock-on",
  requireAuth,
  requireRole("technician", "admin"),
  catchAsync(clockOn),
);

// Technician clocks off, closing their own open time log on this order. Does
// not change the order's status — that stays a separate, explicit action.
repairOrderRouter.post(
  "/:id/clock-off",
  requireAuth,
  requireRole("technician", "admin"),
  catchAsync(clockOff),
);

// All time logs for a repair order, plus total closed minutes.
repairOrderRouter.get(
  "/:id/time-logs",
  requireAuth,
  requireRole("technician", "serviceAdvisor", "admin"),
  catchAsync(getOrderTimeLogs),
);
