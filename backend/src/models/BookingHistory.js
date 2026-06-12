import mongoose, { Schema } from "mongoose";

export const BOOKING_HISTORY_ACTIONS = [
  "created",
  "confirmed",
  "cancelled",
  "rescheduled",
];

const bookingHistorySchema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: BOOKING_HISTORY_ACTIONS,
      required: true,
    },
    previousDate: {
      type: Date,
    },
    previousSlot: {
      type: String,
    },
    reason: {
      type: String,
      trim: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

export const BookingHistoryModel = mongoose.model(
  "BookingHistory",
  bookingHistorySchema
);
