import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
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
  catchAsync(createReview)
);
reviewRouter.get("/mine", requireAuth, catchAsync(myReviews));

// Staff browse reviews (e.g. for technician performance).
reviewRouter.get(
  "/",
  requireAuth,
  requireRole("admin", "accountant", "serviceAdvisor"),
  catchAsync(listReviews)
);
