import { deferredWorkRepository } from "../repositories/deferred-work.repository.js";
import { ApiError } from "../utils/apiError.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;

/**
 * Work the customer was offered and declined, still awaiting follow-up.
 *
 * This is the shop's pipeline of already-identified, already-priced work — the
 * single most convertible source of future revenue, and previously discarded
 * entirely the moment a customer said "not today". Filterable by vehicle (what
 * is outstanding on this car, shown to the advisor at the next visit) and by
 * status.
 */
export async function listDeferredWork({ vehicleId, status = "open", dueBefore }) {
  const filter = {};

  if (vehicleId) {
    if (!OID_RE.test(vehicleId)) {
      throw new ApiError(400, "Invalid vehicleId format");
    }
    filter.vehicleId = vehicleId;
  }
  if (status && status !== "all") {
    filter.status = status;
  }
  if (dueBefore) {
    const date = new Date(dueBefore);
    if (Number.isNaN(date.getTime())) {
      throw new ApiError(400, "Invalid dueBefore date");
    }
    filter.remindAt = { $lte: date };
  }

  const items = await deferredWorkRepository.model
    .find(filter)
    .populate("vehicleId", "licensePlate brand model")
    .populate("customerId", "fullName phone")
    .sort({ remindAt: 1, createdAt: -1 });

  return {
    deferredWork: items,
    // The value sitting in the pipeline — what this list is actually worth
    // chasing, which is the number that justifies doing the follow-up at all.
    totalEstimatedValue: items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0),
  };
}

/** Close out a deferred item — either the customer finally agreed, or it's no
 *  longer relevant. */
export async function resolveDeferredWork(id, { status, convertedQuoteId }) {
  if (!OID_RE.test(id)) {
    throw new ApiError(400, "Invalid deferred work ID format");
  }
  if (!["converted", "dismissed"].includes(status)) {
    throw new ApiError(400, "status must be one of: converted, dismissed");
  }

  const item = await deferredWorkRepository.findById(id);
  if (!item) {
    throw new ApiError(404, "Deferred work item not found");
  }
  if (item.status !== "open") {
    throw new ApiError(409, `This item is already ${item.status}`);
  }

  item.status = status;
  item.resolvedAt = new Date();
  if (convertedQuoteId && OID_RE.test(convertedQuoteId)) {
    item.convertedQuoteId = convertedQuoteId;
  }
  await item.save();

  return item;
}
