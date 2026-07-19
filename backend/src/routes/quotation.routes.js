import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import {
  createQuotation,
  updateQuotation,
  sendQuotation,
  confirmQuotation,
  listQuotations,
} from "../controllers/quotation.controller.js";

export const quotationRouter = Router();

quotationRouter.get(
  "",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(listQuotations),
);

quotationRouter.post(
  "",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(createQuotation),
);

quotationRouter.patch(
  "/:id",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(updateQuotation),
);

quotationRouter.patch(
  "/:id/send",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(sendQuotation),
);

quotationRouter.patch(
  "/:id/confirm",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(confirmQuotation),
);
