import mongoose, { Schema } from "mongoose";

export const DEFERRED_WORK_STATUSES = ["open", "converted", "dismissed", "expired"];

/**
 * Work that was recommended to a customer and NOT done this visit — a quote
 * line they declined, or an inspection item flagged "monitor".
 *
 * Previously a declined line simply vanished: the shop forgot it, the customer
 * was never reminded, and the next visit started from zero. Captured here it
 * becomes a real follow-up obligation (and, in practice, one of the highest
 * converting sources of future work). Attached to the VEHICLE rather than the
 * repair order, because the recommendation outlives the visit that produced it.
 */
const deferredWorkSchema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    // Where the recommendation came from, so it can be traced back.
    sourceQuoteId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceQuote",
    },
    sourceRepairOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
    },
    sourceInspectionId: {
      type: Schema.Types.ObjectId,
      ref: "InspectionReport",
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    // What it would have cost at the time it was offered — the basis for
    // quantifying the pipeline this represents.
    estimatedPrice: {
      type: Number,
      min: 0,
    },
    // Why the customer said no. "Too expensive" and "doing it next service"
    // are very different follow-ups.
    declineReason: {
      type: String,
      trim: true,
    },
    // Urgency carried over from the inspection finding that produced it.
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    status: {
      type: String,
      enum: DEFERRED_WORK_STATUSES,
      default: "open",
    },
    // When to surface this again. Drives the reminder engine in Phase 5.
    remindAt: {
      type: Date,
    },
    // Set when the customer later agrees and it becomes real work.
    convertedQuoteId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceQuote",
    },
    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// The two hot reads: "what's outstanding for this vehicle" and "what's due to
// be chased today".
deferredWorkSchema.index({ vehicleId: 1, status: 1 });
deferredWorkSchema.index({ status: 1, remindAt: 1 });

export const DeferredWorkModel = mongoose.model("DeferredWork", deferredWorkSchema);
