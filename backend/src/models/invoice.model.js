import mongoose, { Schema } from "mongoose";

export const INVOICE_STATUSES = ["unpaid", "partiallyPaid", "paid", "cancelled"];

const lineItemSchema = new Schema(
  {
    description: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    kind: {
      type: String,
      enum: ["service", "part", "labor"],
      default: "service",
    },
    source: {
      type: String,
      enum: ["quote", "additionalService"],
      default: "quote",
    },
  },
  { _id: false }
);

const invoiceSchema = new Schema(
  {
    // Human-readable invoice number, e.g. "INV-202607-00001". Assigned at
    // generation via utils/sequence.js. Sparse+unique so pre-existing invoices
    // without a code (backfilled by a migration) don't collide on null.
    code: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    repairOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
      required: true,
      unique: true,
    },
    accountantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    lineItems: {
      type: [lineItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: INVOICE_STATUSES,
      default: "unpaid",
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    dueAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
    },
    // Snapshot references to the ServiceQuote this invoice was generated
    // from, so the accountant can always see what was originally quoted.
    quoteId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceQuote",
    },
    quotedTotal: {
      type: Number,
    },
  },
  { timestamps: false }
);

export const InvoiceModel = mongoose.model("Invoice", invoiceSchema);
