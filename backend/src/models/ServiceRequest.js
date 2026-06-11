import mongoose, { Schema } from "mongoose";

export const SERVICE_REQUEST_STATUSES = [
  "pending",
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
      required: true,
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
