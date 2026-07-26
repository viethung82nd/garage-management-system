import { reviewRepository } from "../repositories/review.repository.js";
import { repairOrderRepository } from "../repositories/repair-order.repository.js";
import { ApiError } from "../utils/apiError.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;

/**
 * A customer rates a completed repair order (Customer "Submit Service Review").
 * Allowed only once per order, only for orders that are completed and belong
 * to the customer. The reviewed technician is taken from the order.
 */
export async function createReview({ repairOrderId, rating, comment }, customerId) {
  if (!OID_RE.test(String(repairOrderId))) {
    throw new ApiError(400, "Invalid repair order ID format");
  }
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    throw new ApiError(400, "rating must be a number between 1 and 5");
  }

  const order = await repairOrderRepository.model
    .findById(repairOrderId)
    .populate("vehicleId", "customerId");
  if (!order) {
    throw new ApiError(404, "Repair order not found");
  }
  if (!["completed", "readyForDelivery", "delivered"].includes(order.status)) {
    throw new ApiError(409, "You can only review a completed or delivered repair order");
  }

  const ownerId = order.vehicleId?.customerId;
  if (!ownerId || String(ownerId) !== String(customerId)) {
    throw new ApiError(403, "You can only review your own repair order");
  }

  try {
    return await reviewRepository.create({
      customerId,
      repairOrderId: order._id,
      technicianId: order.technicianId,
      rating,
      comment: comment?.trim(),
    });
  } catch (err) {
    if (err?.code === 11000) {
      throw new ApiError(409, "You have already reviewed this repair order");
    }
    throw err;
  }
}

/** The authenticated customer's own reviews. */
export async function myReviews(customerId) {
  return reviewRepository.model
    .find({ customerId })
    .populate("technicianId", "fullName")
    .sort({ createdAt: -1 });
}

/**
 * Staff view of reviews with optional filters and, when a technician is
 * specified, that technician's average rating.
 */
export async function listReviews({ technicianId, repairOrderId }) {
  const filter = {};

  if (technicianId) {
    if (!OID_RE.test(String(technicianId))) {
      throw new ApiError(400, "Invalid technician ID format");
    }
    filter.technicianId = technicianId;
  }
  if (repairOrderId) {
    if (!OID_RE.test(String(repairOrderId))) {
      throw new ApiError(400, "Invalid repair order ID format");
    }
    filter.repairOrderId = repairOrderId;
  }

  const reviews = await reviewRepository.model
    .find(filter)
    .populate("customerId", "fullName")
    .populate("technicianId", "fullName")
    .sort({ createdAt: -1 });

  let summary;
  if (technicianId) {
    const count = reviews.length;
    const avg = count ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : null;
    summary = { count, avgRating: avg === null ? null : Number(avg.toFixed(2)) };
  }

  return { reviews, summary };
}
