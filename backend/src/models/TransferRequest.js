import mongoose, { Schema } from "mongoose";

export const TRANSFER_REQUEST_STATUSES = ["pending", "approved", "rejected"];

const transferRequestSchema = new Schema(
  {
    repairOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
      required: true,
    },
    fromTechnicianId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toTechnicianId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: TRANSFER_REQUEST_STATUSES,
      default: "pending",
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    resolveNote: {
      type: String,
      trim: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: false }
);

export const TransferRequestModel = mongoose.model(
  "TransferRequest",
  transferRequestSchema
);
