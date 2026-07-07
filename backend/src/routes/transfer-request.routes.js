import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import {
  createTransferRequest,
  approveTransferRequest,
  rejectTransferRequest,
} from "../controllers/transfer-request.controller.js";

export const transferRequestRouter = Router();

transferRequestRouter.post(
  "",
  requireAuth,
  requireRole("technician"),
  asyncHandler(createTransferRequest),
);

transferRequestRouter.patch(
  "/:id/approve",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(approveTransferRequest),
);

transferRequestRouter.patch(
  "/:id/reject",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(rejectTransferRequest),
);
