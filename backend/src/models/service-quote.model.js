import mongoose, { Schema } from "mongoose";
import { createApprovalSchema } from "./approval.schema.js";

// Matches the states the frontend's quotation editor actually uses (draft
// while being edited, sent once handed to the customer) plus the FE's
// ApiQuotation.status contract ("approved"/"rejected") for the
// customer-response step this doesn't have UI for yet.
// "partiallyApproved" is the case that actually happens most often in a real
// shop — the customer says yes to the brakes and no to the tyres. Modelling
// only all-or-nothing forced the advisor to silently edit the quote and
// re-approve it, destroying the record of what was turned down.
export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "approved",
  "partiallyApproved",
  "rejected",
  "expired",
];
export const QUOTE_LINE_KINDS = ["service", "part", "labor"];
export const QUOTE_LINE_DECISIONS = ["pending", "approved", "declined"];
// Who pays for a quoted line — carried onto the repair order at approval. See
// JOB_TYPES on the repair-order model.
export const QUOTE_LINE_JOB_TYPES = ["customerPay", "warranty", "internal", "insurance", "goodwill"];

const quoteLineSchema = new Schema(
  {
    // Set when the SA added this line from the service catalog; left unset
    // for a hand-typed custom line. Lets confirmQuotation carry a real
    // service reference through to RepairOrder.services instead of losing it.
    serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
    // Set on `kind: "part"` lines picked from the parts catalogue. This is what
    // connects a quote to real inventory: without it a part line was just
    // typed text and a typed price, so approving it could never reserve stock
    // or reduce it, and the shelf count never reflected what had been sold.
    partId: { type: Schema.Types.ObjectId, ref: "Part" },
    description: { type: String, trim: true },
    kind: { type: String, enum: QUOTE_LINE_KINDS, default: "service" },
    jobType: { type: String, enum: QUOTE_LINE_JOB_TYPES, default: "customerPay" },
    quantity: { type: Number, default: 1, min: 0 },
    unitPrice: { type: Number, default: 0, min: 0 },
    // Per-line customer decision. Only "approved" lines are pushed onto the
    // repair order; "declined" ones become DeferredWork against the vehicle.
    decision: {
      type: String,
      enum: QUOTE_LINE_DECISIONS,
      default: "pending",
    },
    declineReason: { type: String, trim: true },
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
      required: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
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
    // Bumped every time the quote is edited after having been sent. The
    // previous state is archived to QuoteVersion first, so an approved figure
    // can never be silently overwritten.
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    // The customer-authorisation evidence trail. Empty until a decision is
    // recorded; see approval.schema.js for why each field exists.
    approval: {
      type: createApprovalSchema(),
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
