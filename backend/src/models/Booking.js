import mongoose, { Schema } from "mongoose";

export const BOOKING_SOURCES = ["online", "walkIn"];
export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "rescheduled",
  "completed",
];

const bookingSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
    },
    advisorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    bookingDate: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      enum: BOOKING_SOURCES,
      default: "online",
    },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: "pending",
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Slot availability is the hottest read/write path: every capacity check and the
// public /slots view filter by day, then slot and/or status. This compound index
// (Equality → Equality → Equality, most-selective first) lets those run as covered
// index scans instead of collection scans:
//   - countActive:  { bookingDate, timeSlot, status: { $in } }  → all 3 fields bounded
//   - getSlots agg: { bookingDate, status: { $in } } grouped by timeSlot → date-bounded
//   - admin stats:  { bookingDate }                              → uses the prefix
bookingSchema.index({ bookingDate: 1, timeSlot: 1, status: 1 });

export const BookingModel = mongoose.model("Booking", bookingSchema);
