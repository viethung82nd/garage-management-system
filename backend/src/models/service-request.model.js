import mongoose, { Schema } from "mongoose";

// "pending/sent/approved/rejected" is the vocabulary the frontend's SA review
// screen actually uses today (send quote to customer / approve directly into
// the order / reject). approvedBySA/rejectedBySA/approvedByCustomer/
// rejectedByCustomer are kept available for a future two-stage
// (SA-then-customer) approval flow that has no UI yet.
export const SERVICE_REQUEST_STATUSES = [
  "pending",
  "sent",
  "approved",
  "rejected",
  "approvedBySA",
  "rejectedBySA",
  "approvedByCustomer",
  "rejectedByCustomer",
];

const serviceRequestSchema = new Schema(
  {
    repairOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
      required: true,
    },
    technicianId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
    },
    serviceName: {
      type: String,
      trim: true,
    },
    affectedPart: {
      type: String,
      trim: true,
    },
    customerImpact: {
      type: String,
      trim: true,
    },
    laborCost: {
      type: Number,
      min: 0,
    },
    partsCost: {
      type: Number,
      min: 0,
    },
    estimateMinutes: {
      type: Number,
      min: 0,
    },
    evidenceCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    reason: {
      type: String,
      trim: true,
    },
    estimatedPrice: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: SERVICE_REQUEST_STATUSES,
      default: "pending",
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewNote: {
      type: String,
      trim: true,
    },
    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ServiceRequestModel = mongoose.model(
  "ServiceRequest",
  serviceRequestSchema
);
