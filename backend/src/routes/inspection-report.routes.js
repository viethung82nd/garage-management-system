import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import { imageUpload } from "../middlewares/upload.middleware.js";
import {
  listInspectionReports,
  createInspectionReport,
} from "../controllers/inspection-report.controller.js";

// Buffers files in memory instead of writing to local disk — the controller
// uploads each buffer straight to Cloudinary, so nothing here depends on a
// persistent filesystem (most hosts, including Render's free tier, wipe
// local disk on every redeploy).
const upload = imageUpload();

export const inspectionReportRouter = Router();

inspectionReportRouter.get(
  "",
  requireAuth,
  requireRole("technician", "serviceAdvisor", "admin"),
  catchAsync(listInspectionReports),
);

inspectionReportRouter.post(
  "",
  requireAuth,
  requireRole("technician", "serviceAdvisor", "admin"),
  upload.array("photos", 10),
  catchAsync(createInspectionReport),
);
