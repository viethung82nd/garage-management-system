import { Router } from "express";
import multer from "multer";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import {
  listInspectionReports,
  createInspectionReport,
} from "../controllers/inspection-report.controller.js";

function fileFilter(_req, file, cb) {
  if (!file.mimetype.startsWith("image/")) {
    cb(new Error("Only image files are allowed for inspection photos"), false);
    return;
  }
  cb(null, true);
}

// Buffers files in memory instead of writing to local disk — the controller
// uploads each buffer straight to Cloudinary, so nothing here depends on a
// persistent filesystem (most hosts, including Render's free tier, wipe
// local disk on every redeploy).
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const inspectionReportRouter = Router();

inspectionReportRouter.get(
  "",
  requireAuth,
  requireRole("technician", "serviceAdvisor", "admin"),
  asyncHandler(listInspectionReports),
);

inspectionReportRouter.post(
  "",
  requireAuth,
  requireRole("technician", "serviceAdvisor", "admin"),
  upload.array("photos", 10),
  asyncHandler(createInspectionReport),
);
