import mongoose, { Schema } from "mongoose";

export const INSPECTION_STATUSES = ["pending", "completed"];

const recommendedServiceSchema = new Schema(
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
      min: 0,
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const inspectionReportSchema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    advisorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    findings: {
      type: String,
      trim: true,
    },
    estimatedCost: {
      type: Number,
      min: 0,
    },
    photos: {
      type: [String],
      default: [],
    },
    recommendedServices: {
      type: [recommendedServiceSchema],
      default: [],
    },
    status: {
      type: String,
      enum: INSPECTION_STATUSES,
      default: "pending",
    },
    inspectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

export const InspectionReportModel = mongoose.model(
  "InspectionReport",
  inspectionReportSchema
);
