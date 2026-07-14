import mongoose, { Schema } from "mongoose";

export const INVOICE_STATUSES = ["unpaid", "paid", "cancelled"];

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
  },
  { _id: false }
);

const invoiceSchema = new Schema(
  {
    repairOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
      required: true,
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
    total: {
      type: Number,
      required: true,
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
    sentAt: {
      type: Date,
    },
  },
  { timestamps: false }
);

export const InvoiceModel = mongoose.model("Invoice", invoiceSchema);
