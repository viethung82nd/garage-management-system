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

const inspectionItemSchema = new Schema(
  {
    category: { type: String, trim: true },
    label: { type: String, trim: true },
    status: { type: String, enum: ["ok", "monitor", "repair"], default: "ok" },
    note: { type: String, trim: true },
    laborCost: { type: Number, min: 0 },
    partsCost: { type: Number, min: 0 },
  },
  { _id: false }
);

const inspectionReportSchema = new Schema(
  {
    // Either bookingId (SA inspection ahead of a quote, at intake) or
    // repairOrderId (technician inspection during an open repair) must be
    // set — enforced in the controller, not here, since the two flows
    // populate different fields.
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
    },
    repairOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
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
    // Odometer reading + fuel level captured by whoever performed this
    // inspection — the only place in the schema that records mileage at a
    // specific point in time.
    odometer: {
      type: Number,
      min: 0,
    },
    fuelLevel: {
      type: String,
      trim: true,
    },
    items: {
      type: [inspectionItemSchema],
      default: [],
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
