import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import { imageUpload } from "../middlewares/upload.middleware.js";
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

// Multipart so the technician's real evidence photos ride along with the
// proposal — see additional-service.service.js#createAdditionalServiceProposal.
const changeOrderPhotoUpload = imageUpload();
additionalServiceRouter.post(
  "",
  requireAuth,
  requireRole("technician", "admin"),
  changeOrderPhotoUpload.array("photos", 10),
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
