import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import {
  getAllServiceCategories,
  getServiceCategoryById,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from "../controllers/service.controller.js";

export const serviceRouter = Router();

// ============= SERVICE CATEGORY ROUTES =============

// Public routes
serviceRouter.get("/categories", asyncHandler(getAllServiceCategories));
serviceRouter.get("/categories/:id", asyncHandler(getServiceCategoryById));

// Admin only routes
serviceRouter.post(
  "/categories",
  requireAuth,
  requireRole("admin"),
  asyncHandler(createServiceCategory),
);
serviceRouter.put(
  "/categories/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(updateServiceCategory),
);
serviceRouter.delete(
  "/categories/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(deleteServiceCategory),
);

// ============= SERVICE ROUTES =============

// Public routes
serviceRouter.get("", asyncHandler(getAllServices));
serviceRouter.get("/:id", asyncHandler(getServiceById));

// Admin only routes
serviceRouter.post(
  "",
  requireAuth,
  requireRole("admin"),
  asyncHandler(createService),
);
serviceRouter.put(
  "/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(updateService),
);
serviceRouter.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(deleteService),
);
