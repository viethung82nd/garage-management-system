import mongoose, { Schema } from "mongoose";

const vehicleSchema = new Schema(
  {
    licensePlate: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    chassisNumber: {
      type: String,
      trim: true,
    },
    engineNumber: {
      type: String,
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    model: {
      type: String,
      trim: true,
    },
    year: {
      type: Number,
    },
    color: {
      type: String,
      trim: true,
    },
    // Odometer reading captured at the most recent reception/inspection —
    // there's no other place in the schema tracking this, and it's core data
    // for maintenance-interval and warranty decisions.
    lastKnownMileage: {
      type: Number,
      min: 0,
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export const VehicleModel = mongoose.model("Vehicle", vehicleSchema);
