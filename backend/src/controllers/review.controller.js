import * as reviewService from "../services/review.service.js";

/**
 * POST /api/reviews — a customer rates a completed repair order (Customer
 * "Submit Service Review").
 * Body: { repairOrderId, rating (1–5), comment? }
 */
export async function createReview(req, res) {
  const review = await reviewService.createReview(req.body ?? {}, req.user.sub);
  res.status(201).json({ review });
}

/** GET /api/reviews/mine — the authenticated customer's own reviews. */
export async function myReviews(req, res) {
  const reviews = await reviewService.myReviews(req.user.sub);
  res.json({ reviews });
}

/**
 * GET /api/reviews — staff view of reviews with optional filters and, when a
 * technician is specified, that technician's average rating.
 * Query: technicianId, repairOrderId
 */
export async function listReviews(req, res) {
  const result = await reviewService.listReviews(req.query ?? {});
  res.json(result);
}
