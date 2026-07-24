import mongoose, { Schema } from "mongoose";

/**
 * Immutable audit trail of every RepairOrder status transition. The order's own
 * `status` only ever shows the current state; this collection answers "how did
 * it get here, who moved it, when, and why" — the basis for measuring where
 * vehicles wait (parts vs customer vs rework) and for internal-control review.
 * Append-only: entries are created, never updated or deleted.
 */
const repairOrderStatusHistorySchema = new Schema(
  {
    repairOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
      required: true,
      index: true,
    },
    // null on the very first entry (order creation has no prior state).
    from: {
      type: String,
    },
    to: {
      type: String,
      required: true,
    },
    // Who caused the transition. Optional because some transitions are system
    // driven (e.g. auto-forwarded), but recorded whenever an actor is known.
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    // Free-text reason — required by convention for exception states
    // (waitingParts / waitingCustomer / onHold / rework) so the wait is
    // explainable, optional for happy-path transitions.
    reason: {
      type: String,
      trim: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false },
);

export const RepairOrderStatusHistoryModel = mongoose.model(
  "RepairOrderStatusHistory",
  repairOrderStatusHistorySchema,
);
