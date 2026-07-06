import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import {
  createReview,
  myReviews,
  listReviews,
} from "../controllers/review.controller.js";

export const reviewRouter = Router();

// Customer submits a review for their completed repair order, and views own.
reviewRouter.post(
  "/",
  requireAuth,
  requireRole("onlineCustomer"),
  asyncHandler(createReview)
);
reviewRouter.get("/mine", requireAuth, asyncHandler(myReviews));

// Staff browse reviews (e.g. for technician performance).
reviewRouter.get(
  "/",
  requireAuth,
  requireRole("admin", "accountant", "serviceAdvisor"),
  asyncHandler(listReviews)
);
