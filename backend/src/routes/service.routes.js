import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import { imageUpload } from "../middlewares/upload.middleware.js";
import {
  getAllServiceCategories,
  getServiceCategoryById,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  uploadServiceCategoryPhoto,
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from "../controllers/service.controller.js";

export const serviceRouter = Router();

const categoryPhotoUpload = imageUpload();

// ============= SERVICE CATEGORY ROUTES =============

// Public routes
serviceRouter.get("/categories", catchAsync(getAllServiceCategories));
serviceRouter.get("/categories/:id", catchAsync(getServiceCategoryById));

// Admin only routes
serviceRouter.post(
  "/categories",
  requireAuth,
  requireRole("admin"),
  catchAsync(createServiceCategory),
);
serviceRouter.put(
  "/categories/:id",
  requireAuth,
  requireRole("admin"),
  catchAsync(updateServiceCategory),
);
serviceRouter.delete(
  "/categories/:id",
  requireAuth,
  requireRole("admin"),
  catchAsync(deleteServiceCategory),
);
serviceRouter.post(
  "/categories/:id/photo",
  requireAuth,
  requireRole("admin"),
  categoryPhotoUpload.single("photo"),
  catchAsync(uploadServiceCategoryPhoto),
);

// ============= SERVICE ROUTES =============

// Public routes
serviceRouter.get("", catchAsync(getAllServices));
serviceRouter.get("/:id", catchAsync(getServiceById));

// Admin only routes
serviceRouter.post(
  "",
  requireAuth,
  requireRole("admin"),
  catchAsync(createService),
);
serviceRouter.put(
  "/:id",
  requireAuth,
  requireRole("admin"),
  catchAsync(updateService),
);
serviceRouter.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  catchAsync(deleteService),
);
