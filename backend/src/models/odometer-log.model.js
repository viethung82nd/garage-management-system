import mongoose, { Schema } from "mongoose";

/**
 * A dated odometer reading for a vehicle.
 *
 * The vehicle only stores its latest mileage, which can't answer "how many km
 * a month does this car do" (the basis for a maintenance-due reminder) and
 * can't catch a reading that went backwards (a rolled-back odometer). This
 * append-only history does both: every reception/inspection records one, and
 * the reception service refuses — or flags — a value below the last.
 */
const odometerLogSchema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },
    mileage: {
      type: Number,
      required: true,
      min: 0,
    },
    // Where the reading came from (reception, inspection), for traceability.
    source: {
      type: String,
      trim: true,
      default: "reception",
    },
    repairOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    // True when this reading was below the previous one and accepted anyway —
    // the rolled-back-odometer flag.
    isRollback: {
      type: Boolean,
      default: false,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false },
);

odometerLogSchema.index({ vehicleId: 1, recordedAt: -1 });

export const OdometerLogModel = mongoose.model("OdometerLog", odometerLogSchema);
