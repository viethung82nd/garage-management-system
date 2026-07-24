import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  listAdditionalServiceProposals,
  createAdditionalServiceProposal,
  updateAdditionalServiceProposal,
  customerDecideProposal,
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

// The customer authorising extra work on their own vehicle — the path that
// makes a change order legally sound rather than staff-asserted.
additionalServiceRouter.patch(
  "/:id/customer-decision",
  requireAuth,
  requireRole("onlineCustomer"),
  catchAsync(customerDecideProposal),
);
