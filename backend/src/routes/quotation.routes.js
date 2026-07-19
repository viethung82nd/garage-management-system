import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
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
  catchAsync(listQuotations),
);

quotationRouter.post(
  "",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(createQuotation),
);

quotationRouter.patch(
  "/:id",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(updateQuotation),
);

quotationRouter.patch(
  "/:id/send",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(sendQuotation),
);

quotationRouter.patch(
  "/:id/confirm",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(confirmQuotation),
);
