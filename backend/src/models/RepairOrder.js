import mongoose, { Schema } from "mongoose";

export const REPAIR_ORDER_STATUSES = [
  "pending",
  "inProgress",
  "completed",
  "reworkRequired",
  "cancelled",
];

const orderServiceSchema = new Schema(
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
    priceAtTime: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { _id: false }
);

const stepNoteSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
    },
    technicianId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const repairOrderSchema = new Schema(
  {
    inspectionId: {
      type: Schema.Types.ObjectId,
      ref: "InspectionReport",
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    advisorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    technicianId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    services: {
      type: [orderServiceSchema],
      default: [],
    },
    stepNotes: {
      type: [stepNoteSchema],
      default: [],
    },
    status: {
      type: String,
      enum: REPAIR_ORDER_STATUSES,
      default: "pending",
    },
    totalCost: {
      type: Number,
      min: 0,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: false }
);

export const RepairOrderModel = mongoose.model("RepairOrder", repairOrderSchema);
