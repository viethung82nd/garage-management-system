import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  createReception,
  getReceptionHistory,
} from "../controllers/reception.controller.js";

export const receptionRouter = Router();

receptionRouter.get(
  "/history",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(getReceptionHistory),
);

receptionRouter.post(
  "",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(createReception),
);
