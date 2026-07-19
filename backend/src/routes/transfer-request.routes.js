import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  listTransferRequests,
  createTransferRequest,
  approveTransferRequest,
  rejectTransferRequest,
} from "../controllers/transfer-request.controller.js";

export const transferRequestRouter = Router();

transferRequestRouter.get(
  "",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(listTransferRequests),
);

transferRequestRouter.post(
  "",
  requireAuth,
  requireRole("technician"),
  catchAsync(createTransferRequest),
);

transferRequestRouter.patch(
  "/:id/approve",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(approveTransferRequest),
);

transferRequestRouter.patch(
  "/:id/reject",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(rejectTransferRequest),
);
