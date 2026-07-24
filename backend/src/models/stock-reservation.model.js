import mongoose, { Schema } from "mongoose";

export const STOCK_RESERVATION_STATUSES = [
  "active", // held for an approved order, still on the shelf
  "consumed", // issued to the technician; stock has left
  "released", // order cancelled or line removed; stock freed
];

/**
 * A claim on stock for a specific repair order, created the moment a customer
 * approves a part line.
 *
 * Without this, availability is a lie: two advisors can both quote the last
 * alternator, and the second customer only discovers the problem after
 * agreeing to the work. The reservation is what makes "available" mean
 * something, and it records which order the stock is spoken for so it can be
 * released precisely rather than by recomputing a global total.
 */
const stockReservationSchema = new Schema(
  {
    partId: {
      type: Schema.Types.ObjectId,
      ref: "Part",
      required: true,
      index: true,
    },
    repairOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: STOCK_RESERVATION_STATUSES,
      default: "active",
    },
    // Set when the reservation could not be met in full at approval time — the
    // shortfall that has to be purchased, and the reason the order sits in
    // waitingParts.
    shortfall: {
      type: Number,
      min: 0,
      default: 0,
    },
    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

stockReservationSchema.index({ repairOrderId: 1, status: 1 });

export const StockReservationModel = mongoose.model(
  "StockReservation",
  stockReservationSchema,
);
