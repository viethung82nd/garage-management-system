import mongoose, { Schema } from "mongoose";

// Matches the states the frontend's quotation editor actually uses (draft
// while being edited, sent once handed to the customer). "accepted"/
// "rejected" are kept for the customer-response step this doesn't have UI
// for yet.
export const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected"];
export const QUOTE_LINE_KINDS = ["service", "part", "labor"];

const quoteLineSchema = new Schema(
  {
    description: { type: String, trim: true },
    kind: { type: String, enum: QUOTE_LINE_KINDS, default: "service" },
    quantity: { type: Number, default: 1, min: 0 },
    unitPrice: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const serviceQuoteSchema = new Schema(
  {
    code: {
      type: String,
      trim: true,
    },
    repairOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    advisorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Denormalized snapshot of who/what this quote is for at the time it was
    // written — same pattern RepairOrder.services uses for name/priceAtTime,
    // so the quote still reads correctly even if the customer/vehicle record
    // changes later.
    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true },
    vehicleName: { type: String, trim: true },
    vehiclePlate: { type: String, trim: true },
    lines: {
      type: [quoteLineSchema],
      default: [],
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    taxPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalEstimate: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: QUOTE_STATUSES,
      default: "draft",
    },
    note: {
      type: String,
      trim: true,
    },
    validUntil: {
      type: Date,
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export const ServiceQuoteModel = mongoose.model(
  "ServiceQuote",
  serviceQuoteSchema
);
