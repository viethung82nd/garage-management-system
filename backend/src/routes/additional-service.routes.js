import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  listAdditionalServiceProposals,
  createAdditionalServiceProposal,
  updateAdditionalServiceProposal,
} from "../controllers/additional-service.controller.js";

export const additionalServiceRouter = Router();

additionalServiceRouter.get(
  "",
  requireAuth,
  requireRole("serviceAdvisor", "technician", "admin"),
  catchAsync(listAdditionalServiceProposals),
);

additionalServiceRouter.post(
  "",
  requireAuth,
  requireRole("technician", "admin"),
  catchAsync(createAdditionalServiceProposal),
);

additionalServiceRouter.patch(
  "/:id",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(updateAdditionalServiceProposal),
);
