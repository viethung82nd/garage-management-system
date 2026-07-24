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
    partId: {
      type: Schema.Types.ObjectId,
      ref: "Part",
    },
    // Whether the customer was charged for a new, OEM, aftermarket,
    // reconditioned or used part. Stated on the invoice because a customer is
    // entitled to know which of those they paid for.
    partCondition: {
      type: String,
      trim: true,
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

    // ===== Snapshot of who/what was billed =====
    // Denormalised at generation time so the invoice reads correctly forever,
    // even if the customer or vehicle record changes later — the same pattern
    // the repair order uses for its line items.
    billing: {
      customerName: { type: String, trim: true },
      taxCode: { type: String, trim: true },
      address: { type: String, trim: true },
      vehiclePlate: { type: String, trim: true },
      vehicleVin: { type: String, trim: true },
      odometer: { type: Number, min: 0 },
    },

    // ===== E-invoice (demo) =====
    // Vietnam requires a legal e-invoice with a symbol, a number and a lookup
    // code. This is a self-contained mock — it mints those and a fake lookup
    // code so the whole issue/adjust/replace flow can be demonstrated, without
    // calling a real tax-authority provider.
    einvoice: {
      // "issued" once minted, "adjusted"/"replaced" if later corrected.
      status: {
        type: String,
        enum: ["none", "issued", "adjusted", "replaced", "cancelled"],
        default: "none",
      },
      symbol: { type: String, trim: true },
      number: { type: String, trim: true },
      lookupCode: { type: String, trim: true },
      issuedAt: { type: Date },
      // For an adjustment/replacement, the invoice it supersedes — the
      // backward link a correction must carry.
      replacesInvoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
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
