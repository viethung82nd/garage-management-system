import mongoose, { Schema } from "mongoose";

/**
 * Singleton document (always `key: "default"`) holding the admin-editable
 * booking-capacity settings: business hours, seats per slot, and the
 * labour-hour capacity formula (see computeTimeBucket in booking.service.js).
 * Read/write goes through services/config.service.js, which caches this in
 * memory since it's on the hot path of every booking-capacity check but only
 * ever changes via an admin PUT. config/constants.js holds the seed defaults.
 */
const systemConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    openHour: { type: Number, required: true, min: 0, max: 23 },
    lastSlotHour: { type: Number, required: true, min: 0, max: 23 },
    slotCapacity: { type: Number, required: true, min: 1 },
    techShiftHours: { type: Number, required: true, min: 1, max: 24 },
    capacityEfficiency: { type: Number, required: true, min: 0, max: 1 },
    capacityReserveRatio: { type: Number, required: true, min: 0, max: 1 },
    defaultJobMinutes: { type: Number, required: true, min: 1 },
  },
  { timestamps: true },
);

export const SystemConfigModel = mongoose.model("SystemConfig", systemConfigSchema);
