import mongoose, { Schema } from "mongoose";

export const QUOTE_STATUSES = ["pending", "accepted", "rejected"];
export const QUOTE_NOTIFY_METHODS = ["email", "sms", "phone", "inApp"];

const quoteItemSchema = new Schema(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const serviceQuoteSchema = new Schema(
  {
    inspectionId: {
      type: Schema.Types.ObjectId,
      ref: "InspectionReport",
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    advisorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [quoteItemSchema],
      default: [],
    },
    totalEstimate: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: QUOTE_STATUSES,
      default: "pending",
    },
    customerNote: {
      type: String,
      trim: true,
    },
    notifyMethod: {
      type: String,
      enum: QUOTE_NOTIFY_METHODS,
    },
    expiredAt: {
      type: Date,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ServiceQuoteModel = mongoose.model(
  "ServiceQuote",
  serviceQuoteSchema
);
