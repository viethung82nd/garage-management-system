import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import { listAuditLogs } from "../controllers/audit-log.controller.js";

export const auditLogRouter = Router();

auditLogRouter.get(
  "/",
  requireAuth,
  requireRole("accountant", "admin"),
  catchAsync(listAuditLogs)
);
