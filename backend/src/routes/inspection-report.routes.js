import fs from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import { createInspectionReport } from "../controllers/inspection-report.controller.js";

const inspectionPhotosDir = path.resolve("uploads", "inspection-photos");
fs.mkdirSync(inspectionPhotosDir, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, inspectionPhotosDir);
  },
  filename(_req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!file.mimetype.startsWith("image/")) {
    cb(new Error("Only image files are allowed for inspection photos"), false);
    return;
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const inspectionReportRouter = Router();

inspectionReportRouter.post(
  "",
  requireAuth,
  requireRole("technician", "serviceAdvisor", "admin"),
  upload.array("photos", 10),
  asyncHandler(createInspectionReport),
);
