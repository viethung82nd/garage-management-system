import fs from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
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

const categoryPhotosDir = path.resolve("uploads", "category-photos");
fs.mkdirSync(categoryPhotosDir, { recursive: true });

const categoryPhotoUpload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, categoryPhotosDir);
    },
    filename(_req, file, cb) {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
    },
  }),
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed for category photos"), false);
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

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
serviceRouter.post(
  "/categories/:id/photo",
  requireAuth,
  requireRole("admin"),
  categoryPhotoUpload.single("photo"),
  asyncHandler(uploadServiceCategoryPhoto),
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
