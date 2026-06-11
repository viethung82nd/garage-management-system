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

export const BookingModel = mongoose.model("Booking", bookingSchema);
