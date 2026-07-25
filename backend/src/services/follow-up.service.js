import { FollowUpModel, RepairOrderModel, FOLLOW_UP_STATUSES, COMPLAINT_CATEGORIES } from "../models/index.js";
import { followUpRepository } from "../repositories/follow-up.repository.js";
import { ApiError } from "../utils/apiError.js";
import { notifyRole } from "../utils/notify.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const FOLLOW_UP_DELAY_HOURS = 72;

// A CSAT at or below this is treated as a dissatisfied customer — the
// Toyota standard's "must follow through" case, not just a score to log.
const DISSATISFIED_CSAT_THRESHOLD = 2;

/**
 * Creates the pending post-delivery check-in for one repair order, due 72
 * hours after delivery. Exported so it *could* be wired in at the moment of
 * delivery later — but repair-order.service.js is owned by another process
 * right now, so nothing calls this yet; it's reached today only via
 * `POST /api/follow-ups` or the `generateDueFollowUps` back-fill below.
 */
export async function createFollowUpForDelivery({ repairOrderId, vehicleId, customerId, deliveredAt }) {
  if (!repairOrderId || !OID_RE.test(repairOrderId)) {
    throw new ApiError(400, "Invalid repairOrderId format");
  }
  if (!vehicleId || !OID_RE.test(vehicleId)) {
    throw new ApiError(400, "Invalid vehicleId format");
  }

  const deliveryTime = deliveredAt ? new Date(deliveredAt) : new Date();
  if (Number.isNaN(deliveryTime.getTime())) {
    throw new ApiError(400, "Invalid deliveredAt date");
  }

  // Never create a second obligation for the same delivery — the unique
  // index on repairOrderId would reject it anyway, but checking first avoids
  // surfacing a raw duplicate-key error to the caller.
  const existing = await followUpRepository.model.findOne({ repairOrderId });
  if (existing) {
    return existing;
  }

  const dueAt = new Date(deliveryTime.getTime() + FOLLOW_UP_DELAY_HOURS * 60 * 60 * 1000);
  return followUpRepository.create({
    repairOrderId,
    vehicleId,
    customerId,
    dueAt,
    status: "pending",
  });
}

/**
 * Back-fill: creates a follow-up for every delivered repair order in the
 * last `lookbackDays` that doesn't already have one. Covers orders delivered
 * before this feature existed (or before delivery gets wired to call
 * createFollowUpForDelivery directly) without ever double-booking an order
 * that already has one.
 */
export async function generateDueFollowUps({ lookbackDays = 30 } = {}) {
  const since = new Date(Date.now() - lookbackDays * DAY_MS);

  const orders = await RepairOrderModel.find({
    deliveredAt: { $ne: null, $gte: since },
  }).populate("vehicleId", "customerId");

  const summary = { created: 0 };

  for (const order of orders) {
    const vehicle = order.vehicleId;
    if (!vehicle) continue;

    const existing = await FollowUpModel.exists({ repairOrderId: order._id });
    if (existing) continue;

    const dueAt = new Date(order.deliveredAt.getTime() + FOLLOW_UP_DELAY_HOURS * 60 * 60 * 1000);
    await followUpRepository.create({
      repairOrderId: order._id,
      vehicleId: vehicle._id,
      customerId: vehicle.customerId,
      dueAt,
      status: "pending",
    });
    summary.created += 1;
  }

  return summary;
}

/** GET /api/follow-ups — the advisor's call queue. */
export async function listFollowUps({ status, dueBefore } = {}) {
  const filter = {};

  if (status && status !== "all") {
    if (!FOLLOW_UP_STATUSES.includes(status)) {
      throw new ApiError(400, `status must be one of: ${FOLLOW_UP_STATUSES.join(", ")}`);
    }
    filter.status = status;
  }
  if (dueBefore) {
    const date = new Date(dueBefore);
    if (Number.isNaN(date.getTime())) {
      throw new ApiError(400, "Invalid dueBefore date");
    }
    filter.dueAt = { $lte: date };
  }

  return followUpRepository.model
    .find(filter)
    .populate("vehicleId", "licensePlate")
    .populate("customerId", "fullName phone")
    .sort({ dueAt: 1 });
}

/**
 * Logs the outcome of a follow-up call: whether the customer was reached,
 * and — if so — the light satisfaction capture (CSAT 1-5, NPS 0-10,
 * complaint bucket, free-text note). `closed` is terminal; a follow-up
 * already closed cannot be re-recorded.
 */
export async function recordFollowUpOutcome(
  id,
  { status, csatScore, npsScore, complaintCategory, note },
  actorId,
) {
  if (!OID_RE.test(id)) {
    throw new ApiError(400, "Invalid follow-up ID format");
  }
  if (status !== undefined && !FOLLOW_UP_STATUSES.includes(status)) {
    throw new ApiError(400, `status must be one of: ${FOLLOW_UP_STATUSES.join(", ")}`);
  }
  if (csatScore !== undefined && csatScore !== null) {
    if (typeof csatScore !== "number" || Number.isNaN(csatScore) || csatScore < 1 || csatScore > 5) {
      throw new ApiError(400, "csatScore must be a number between 1 and 5");
    }
  }
  if (npsScore !== undefined && npsScore !== null) {
    if (typeof npsScore !== "number" || Number.isNaN(npsScore) || npsScore < 0 || npsScore > 10) {
      throw new ApiError(400, "npsScore must be a number between 0 and 10");
    }
  }
  if (complaintCategory !== undefined && complaintCategory !== null && !COMPLAINT_CATEGORIES.includes(complaintCategory)) {
    throw new ApiError(400, `complaintCategory must be one of: ${COMPLAINT_CATEGORIES.join(", ")}`);
  }

  const followUp = await followUpRepository.findById(id);
  if (!followUp) {
    throw new ApiError(404, "Follow-up not found");
  }
  if (followUp.status === "closed") {
    throw new ApiError(409, "This follow-up is already closed");
  }

  // A dissatisfied customer must be followed through, not just logged and
  // closed (Toyota S1: "phải theo đến cùng với khách không hài lòng") — block
  // closing an escalated follow-up until someone records what was actually
  // done about it.
  const effectiveCsat = csatScore !== undefined ? csatScore : followUp.csatScore;
  const effectiveNote = note !== undefined ? note : followUp.note;
  const becomingDissatisfied =
    typeof effectiveCsat === "number" && effectiveCsat <= DISSATISFIED_CSAT_THRESHOLD;

  if (status === "closed" && (followUp.escalated || becomingDissatisfied) && !effectiveNote?.trim()) {
    throw new ApiError(
      400,
      "This customer was dissatisfied — add a resolution note before closing the follow-up",
    );
  }

  if (status !== undefined) followUp.status = status;
  if (csatScore !== undefined) followUp.csatScore = csatScore;
  if (npsScore !== undefined) followUp.npsScore = npsScore;
  if (complaintCategory !== undefined) followUp.complaintCategory = complaintCategory;
  if (note !== undefined) followUp.note = note;

  // Any recorded outcome means someone actually worked this item — stamp who
  // and when, regardless of which status it moved to.
  if (status && status !== "pending") {
    followUp.contactedAt = followUp.contactedAt || new Date();
    followUp.contactedBy = actorId;
  }

  if (status === "closed") {
    followUp.resolvedAt = new Date();
  }

  const justEscalated = becomingDissatisfied && !followUp.escalated;
  if (justEscalated) {
    followUp.escalated = true;
  }

  await followUp.save();

  if (justEscalated) {
    const payload = {
      type: "followUpEscalated",
      title: "Dissatisfied customer needs follow-through",
      message: `A follow-up scored ${effectiveCsat}/5 CSAT — this needs to be resolved before it's closed.`,
      refId: followUp.repairOrderId,
      refModel: "RepairOrder",
    };
    await Promise.all([notifyRole("serviceAdvisor", payload), notifyRole("admin", payload)]);
  }

  return followUp;
}

/**
 * Aggregate satisfaction numbers over follow-ups actually contacted in
 * `[startDate, endDate]` — the reporting counterpart to the call queue.
 * NPS is the standard promoters% − detractors% (9-10 promoter, 0-6 detractor,
 * 7-8 passive/ignored), scaled to a -100..100 index.
 */
export async function getSatisfactionSummary({ startDate, endDate } = {}) {
  const filter = { contactedAt: { $ne: null } };

  if (startDate) {
    const date = new Date(startDate);
    if (Number.isNaN(date.getTime())) {
      throw new ApiError(400, "Invalid startDate");
    }
    filter.contactedAt.$gte = date;
  }
  if (endDate) {
    const date = new Date(endDate);
    if (Number.isNaN(date.getTime())) {
      throw new ApiError(400, "Invalid endDate");
    }
    filter.contactedAt.$lte = date;
  }

  const items = await followUpRepository.model
    .find(filter)
    .select("csatScore npsScore complaintCategory");

  const csatScores = items.map((item) => item.csatScore).filter((v) => typeof v === "number");
  const npsScores = items.map((item) => item.npsScore).filter((v) => typeof v === "number");

  const avgCsat = csatScores.length
    ? csatScores.reduce((sum, v) => sum + v, 0) / csatScores.length
    : null;

  let nps = null;
  if (npsScores.length) {
    const promoters = npsScores.filter((v) => v >= 9).length;
    const detractors = npsScores.filter((v) => v <= 6).length;
    nps = ((promoters - detractors) / npsScores.length) * 100;
  }

  const byComplaintCategory = {};
  for (const item of items) {
    if (item.complaintCategory) {
      byComplaintCategory[item.complaintCategory] = (byComplaintCategory[item.complaintCategory] || 0) + 1;
    }
  }

  return {
    contactedCount: items.length,
    avgCsat,
    nps,
    byComplaintCategory,
  };
}
