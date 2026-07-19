import mongoose, { Schema } from "mongoose";

const serviceSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    // Estimated duration in minutes.
    estimatedDuration: {
      type: Number,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ServiceModel = mongoose.model("Service", serviceSchema);
