import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import { createTransferRequest } from "../controllers/transfer-request.controller.js";

export const transferRequestRouter = Router();

transferRequestRouter.post(
  "",
  requireAuth,
  requireRole("technician"),
  asyncHandler(createTransferRequest),
);
