import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  createQuotation,
  updateQuotation,
  sendQuotation,
  confirmQuotation,
  listQuotations,
  getQuotationById,
} from "../controllers/quotation.controller.js";

export const quotationRouter = Router();

quotationRouter.get(
  "",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(listQuotations),
);

// Read-only lookup, also open to accountants so they can cross-check an
// invoice against the quote it came from.
quotationRouter.get(
  "/:id",
  requireAuth,
  requireRole("serviceAdvisor", "admin", "accountant"),
  catchAsync(getQuotationById),
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
