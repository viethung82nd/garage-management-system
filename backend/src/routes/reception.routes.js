import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import {
  createReception,
  getReceptionHistory,
} from "../controllers/reception.controller.js";

export const receptionRouter = Router();

receptionRouter.get(
  "/history",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(getReceptionHistory),
);

receptionRouter.post(
  "",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(createReception),
);
