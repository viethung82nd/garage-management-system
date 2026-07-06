import { ReviewModel, RepairOrderModel } from "../models/index.js";
import { HttpError } from "../middleware/error.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;

/**
 * POST /api/reviews — a customer rates a completed repair order (Customer
 * "Submit Service Review"). Allowed only once per order, only for orders that
 * are completed and belong to the customer. The reviewed technician is taken
 * from the order.
 * Body: { repairOrderId, rating (1–5), comment? }
 */
export async function createReview(req, res) {
  const { repairOrderId, rating, comment } = req.body ?? {};

  if (!OID_RE.test(String(repairOrderId))) {
    throw new HttpError(400, "Invalid repair order ID format");
  }
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    throw new HttpError(400, "rating must be a number between 1 and 5");
  }

  const order = await RepairOrderModel.findById(repairOrderId).populate(
    "vehicleId",
    "customerId"
  );
  if (!order) {
    throw new HttpError(404, "Repair order not found");
  }
  if (order.status !== "completed") {
    throw new HttpError(409, "You can only review a completed repair order");
  }

  const ownerId = order.vehicleId?.customerId;
  if (!ownerId || String(ownerId) !== String(req.user.sub)) {
    throw new HttpError(403, "You can only review your own repair order");
  }

  try {
    const review = await ReviewModel.create({
      customerId: req.user.sub,
      repairOrderId: order._id,
      technicianId: order.technicianId,
      rating,
      comment: comment?.trim(),
    });
    res.status(201).json({ review });
  } catch (err) {
    if (err?.code === 11000) {
      throw new HttpError(409, "You have already reviewed this repair order");
    }
    throw err;
  }
}

/** GET /api/reviews/mine — the authenticated customer's own reviews. */
export async function myReviews(req, res) {
  const reviews = await ReviewModel.find({ customerId: req.user.sub })
    .populate("technicianId", "fullName")
    .sort({ createdAt: -1 });
  res.json({ reviews });
}

/**
 * GET /api/reviews — staff view of reviews with optional filters and, when a
 * technician is specified, that technician's average rating.
 * Query: technicianId, repairOrderId
 */
export async function listReviews(req, res) {
  const { technicianId, repairOrderId } = req.query;
  const filter = {};

  if (technicianId) {
    if (!OID_RE.test(String(technicianId))) {
      throw new HttpError(400, "Invalid technician ID format");
    }
    filter.technicianId = technicianId;
  }
  if (repairOrderId) {
    if (!OID_RE.test(String(repairOrderId))) {
      throw new HttpError(400, "Invalid repair order ID format");
    }
    filter.repairOrderId = repairOrderId;
  }

  const reviews = await ReviewModel.find(filter)
    .populate("customerId", "fullName")
    .populate("technicianId", "fullName")
    .sort({ createdAt: -1 });

  let summary;
  if (technicianId) {
    const count = reviews.length;
    const avg = count
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / count
      : null;
    summary = { count, avgRating: avg === null ? null : Number(avg.toFixed(2)) };
  }

  res.json({ reviews, summary });
}
