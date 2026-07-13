import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import {
  createQuotation,
  sendQuotation,
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
  "/:id/send",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  asyncHandler(sendQuotation),
);
