import mongoose, { Schema } from "mongoose";

const scheduleSchema = new Schema(
  {
    technicianId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    activeOrderIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "RepairOrder" }],
      default: [],
    },
    activeOrderCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: false }
);

// One schedule entry per technician per day.
scheduleSchema.index({ technicianId: 1, date: 1 }, { unique: true });

export const ScheduleModel = mongoose.model("Schedule", scheduleSchema);
