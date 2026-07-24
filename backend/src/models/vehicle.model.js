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
    // The VIN is the vehicle's true identity — a plate can change (new
    // province, a switch to yellow commercial plates), the VIN does not. Unique
    // (sparse, so the many older records with no VIN don't collide on null) so
    // the same car is never entered twice under two plates.
    chassisNumber: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
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
    // the running current value. Its history lives in OdometerLog so the
    // maintenance interval can be computed from km-per-month, and a reading
    // lower than the last one (a rolled-back odometer) can be flagged.
    lastKnownMileage: {
      type: Number,
      min: 0,
    },

    // ===== Renewal dates — the highest-value reminder triggers =====
    // A vehicle owner has to keep these current by law; the shop that reminds
    // them is the shop they come back to. Optional because they're captured
    // opportunistically as the customer provides them.
    registrationExpiry: { type: Date }, // hạn đăng kiểm
    insuranceExpiry: { type: Date }, // hạn bảo hiểm
    manufacturerWarrantyExpiry: { type: Date }, // hạn bảo hành hãng

    // When this car was bought — anchors the manufacturer warranty window and
    // the customer's ownership record.
    soldAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export const VehicleModel = mongoose.model("Vehicle", vehicleSchema);
