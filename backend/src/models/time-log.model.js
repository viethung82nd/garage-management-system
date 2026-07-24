import mongoose, { Schema } from "mongoose";

/**
 * A single span of hands-on work by a technician on one repair-order line.
 *
 * Without this the system only knew when a whole order started and finished,
 * which conflates real wrench time with waiting on parts, waiting on the
 * customer, or simply sitting in the lot overnight. None of the three KPIs a
 * workshop actually runs on — technician productivity, technician efficiency,
 * effective labour rate — can be computed without measuring the work itself,
 * so this records it: who, which line, from when to when, and why it paused.
 *
 * A row is opened on clock-on (endedAt null) and closed on clock-off. Time
 * accrued while the order sits in a waiting state is deliberately never
 * captured here, because that delay isn't the technician's to answer for.
 */
const timeLogSchema = new Schema(
  {
    repairOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
      required: true,
      index: true,
    },
    technicianId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Which service line was being worked. Omitted for whole-order work that
    // isn't tied to a single line.
    lineIndex: {
      type: Number,
      min: 0,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // Null while the clock is running; set on clock-off.
    endedAt: {
      type: Date,
    },
    // Derived on clock-off (endedAt - startedAt, in minutes) and stored so
    // reporting can sum minutes without recomputing every span.
    durationMinutes: {
      type: Number,
      min: 0,
    },
    // Why the technician stopped, when they clocked off to a pause rather than
    // to completion (e.g. "waiting for part", "end of shift").
    pauseReason: {
      type: String,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

// The reporting hot path: all closed spans in a period, and a technician's own
// spans. Also used to find a technician's currently-open span on clock-off.
timeLogSchema.index({ technicianId: 1, endedAt: 1 });
timeLogSchema.index({ endedAt: 1 });

export const TimeLogModel = mongoose.model("TimeLog", timeLogSchema);
