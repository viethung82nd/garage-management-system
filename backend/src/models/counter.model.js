import mongoose, { Schema } from "mongoose";

/**
 * Atomic sequence generator, one document per named counter (e.g.
 * "repairOrder-202607", "invoice-202607"). Business document numbers must be
 * gapless-ish and, above all, never collide under concurrency — so instead of
 * counting existing documents (racy) we do a single atomic
 * findOneAndUpdate($inc) that the DB serializes for us. See utils/sequence.js
 * for the helper that turns this into a formatted code like RO-202607-00001.
 */
const counterSchema = new Schema(
  {
    // The counter's identity, e.g. "repairOrder-202607". We scope counters by
    // month so each month restarts at 1 and codes stay short and readable.
    key: {
      type: String,
      required: true,
      unique: true,
    },
    seq: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: false },
);

export const CounterModel = mongoose.model("Counter", counterSchema);
