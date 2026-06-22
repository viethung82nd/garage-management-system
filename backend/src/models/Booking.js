import mongoose, { Schema } from "mongoose";
import { ACTIVE_BOOKING_STATUSES } from "../config/slots.js";

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
    seatNo: {
      type: Number,
      min: 1,
    },
    occupiesSlot: {
      type: Boolean,
      default: true,
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

// Keep occupiesSlot in lockstep with status: a slot is held only while the
// booking is pending/confirmed/rescheduled. Cancelling/completing it later sets
// this false, dropping it out of the unique index below and freeing its seat.
// IMPORTANT: this hook only fires on document .save(). Future status changes
// (cancel/reschedule/complete) MUST go through .save() — updateOne /
// findOneAndUpdate / bulkWrite bypass this hook and leave occupiesSlot stale,
// silently keeping a freed seat locked.
bookingSchema.pre("save", function syncOccupiesSlot(next) {
  this.occupiesSlot = ACTIVE_BOOKING_STATUSES.includes(this.status);
  next();
});

// Capacity lock: among occupying bookings, no two may share a (day, slot, seat).
// With seatNo in 1..SLOT_CAPACITY this caps a slot at SLOT_CAPACITY active
// bookings — enforced atomically by the DB, so concurrent inserts cannot
// overbook. Partial filter uses occupiesSlot (equality) because $in over status
// is not allowed in a partialFilterExpression.
bookingSchema.index(
  { bookingDate: 1, timeSlot: 1, seatNo: 1 },
  { unique: true, partialFilterExpression: { occupiesSlot: true } }
);

export const BookingModel = mongoose.model("Booking", bookingSchema);
