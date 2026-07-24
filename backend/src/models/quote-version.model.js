import mongoose, { Schema } from "mongoose";

/**
 * An immutable snapshot of a ServiceQuote as it stood at one point in time.
 *
 * A quote used to be edited in place, which meant the exact figures a customer
 * agreed to were overwritten the next time anyone touched it — the approved
 * version simply ceased to exist. Every edit now archives the previous state
 * here first, so "what did the customer actually approve" is answerable months
 * later, and a revised estimate can be shown side by side with the original.
 *
 * Append-only: rows are written once and never updated or deleted.
 */
const quoteVersionSchema = new Schema(
  {
    quoteId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceQuote",
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
    },
    // Denormalised copy of the line items — deliberately NOT a reference, since
    // the whole point is to survive later edits to the live quote.
    lines: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    discountPercent: Number,
    taxPercent: Number,
    totalEstimate: Number,
    // The quote's status at the moment this snapshot was taken.
    status: String,
    // Why a new version was cut: "edited", "revised after change order", etc.
    reason: {
      type: String,
      trim: true,
    },
    snapshotBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    snapshotAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false },
);

quoteVersionSchema.index({ quoteId: 1, version: 1 }, { unique: true });

export const QuoteVersionModel = mongoose.model("QuoteVersion", quoteVersionSchema);
