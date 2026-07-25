import mongoose, { Schema } from "mongoose";

// The physical constraints a booking can be limited by, beyond the customer
// seat count: a bay to park in, a lift to work under the car, a paint booth
// for bodywork. Modelling them as a first-class, typed resource is what lets
// capacity planning ask "do we have a free lift", not just "is there a seat".
export const RESOURCE_TYPES = ["bay", "lift", "paintBooth", "mobile"];

const resourceSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: RESOURCE_TYPES,
      required: true,
    },
    // Retired rather than deleted — historical bookings may still reference it.
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

export const ResourceModel = mongoose.model("Resource", resourceSchema);
