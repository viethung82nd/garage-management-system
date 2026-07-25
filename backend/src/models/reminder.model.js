import mongoose, { Schema } from "mongoose";

// Each type maps to a distinct source the generator scans. Kept flat rather
// than free text so the advisor's queue can filter/group by "what kind of
// nudge is this" instead of parsing a title string.
export const REMINDER_TYPES = [
  "maintenanceDue",
  "registrationExpiry",
  "insuranceExpiry",
  "warrantyExpiry",
  "deferredWork",
  "lapsedCustomer",
  // Customer-level, not vehicle-level — see vehicleId below.
  "birthday",
];

export const REMINDER_STATUSES = ["pending", "sent", "dismissed", "done"];

/**
 * A single outbound nudge to a customer, produced by the reminder engine
 * (reminder.service.js#generateReminders) from a handful of source signals —
 * an expiring registration/insurance/warranty date on the Vehicle, an open
 * DeferredWork item coming due, a repair order's service warranty lapsing, or
 * a vehicle that hasn't been in for maintenance in a long time.
 *
 * Previously none of these were tracked anywhere: a registration expiry sat
 * on the vehicle record and nobody looked at it until the customer mentioned
 * it (or didn't, and went to a competitor). This is the queue that turns a
 * quiet date field into something the service desk actually acts on.
 */
const reminderSchema = new Schema(
  {
    // Required for every type except "birthday", which is about the customer,
    // not any one of their vehicles — enforced in the service layer, not here,
    // since Mongoose can't conditionally require a field by a sibling's value
    // without a custom validator.
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: REMINDER_TYPES,
      required: true,
    },
    // When the thing being reminded about actually falls due — the expiry
    // date, the deferred work's remindAt, the computed maintenance-due date.
    // This (not createdAt) is what the engine dedupes and sorts on.
    dueAt: {
      type: Date,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: REMINDER_STATUSES,
      default: "pending",
    },
    // Loose pointer back to whatever produced this reminder (a Vehicle, a
    // RepairOrder, a DeferredWork item) — not `ref`'d to a single collection
    // since the source varies by type, so it's not populated automatically.
    sourceRef: {
      type: Schema.Types.ObjectId,
    },
    sentAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// The two hot reads: "what's due to go out" (status + dueAt) and "what's
// outstanding for this vehicle" (matches the DeferredWork indexing pattern).
reminderSchema.index({ status: 1, dueAt: 1 });
reminderSchema.index({ vehicleId: 1 });

export const ReminderModel = mongoose.model("Reminder", reminderSchema);
