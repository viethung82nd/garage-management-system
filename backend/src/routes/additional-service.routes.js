import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
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
  asyncHandler(listAdditionalServiceProposals),
);

additionalServiceRouter.post(
  "",
  requireAuth,
  requireRole("technician", "admin"),
  asyncHandler(createAdditionalServiceProposal),
);

additionalServiceRouter.patch(
  "/:id",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(updateAdditionalServiceProposal),
);
