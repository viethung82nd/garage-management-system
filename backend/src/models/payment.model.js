import mongoose, { Schema } from "mongoose";

export const PAYMENT_METHODS = ["cash", "card", "bankTransfer", "eWallet"];
export const PAYMENT_STATUSES = ["pending", "succeeded", "failed", "refunded"];

const paymentSchema = new Schema(
  {
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
    },
    gatewayRef: {
      type: String,
    },
    gatewayPayload: {
      type: Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "pending",
    },
    paidAt: {
      type: Date,
    },
  },
  { timestamps: false }
);

export const PaymentModel = mongoose.model("Payment", paymentSchema);
