import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  createQuotation,
  updateQuotation,
  sendQuotation,
  confirmQuotation,
  customerDecideQuotation,
  listMyQuotations,
  getQuotationVersions,
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

// MUST precede "/:id" — otherwise Express matches this as an id of "mine".
quotationRouter.get(
  "/mine",
  requireAuth,
  requireRole("onlineCustomer"),
  catchAsync(listMyQuotations),
);

// Read-only lookup, also open to accountants so they can cross-check an
// invoice against the quote it came from.
quotationRouter.get(
  "/:id",
  requireAuth,
  requireRole("serviceAdvisor", "admin", "accountant"),
  catchAsync(getQuotationById),
);

// The immutable record of what the customer was shown at each revision.
quotationRouter.get(
  "/:id/versions",
  requireAuth,
  requireRole("serviceAdvisor", "admin", "accountant"),
  catchAsync(getQuotationVersions),
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

// Staff relaying a decision the customer gave in person / by phone.
quotationRouter.patch(
  "/:id/confirm",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(confirmQuotation),
);

// The customer deciding for themselves — the authorisation path that needs no
// "an employee says they agreed" caveat.
quotationRouter.patch(
  "/:id/customer-decision",
  requireAuth,
  requireRole("onlineCustomer"),
  catchAsync(customerDecideQuotation),
);
