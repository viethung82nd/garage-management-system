import { systemConfigRepository } from "../repositories/system-config.repository.js";
import { DEFAULT_SYSTEM_CONFIG } from "../config/constants.js";
import { ApiError } from "../utils/apiError.js";

const CONFIG_KEY = "default";

const FIELDS = [
  "openHour",
  "lastSlotHour",
  "slotCapacity",
  "techShiftHours",
  "capacityEfficiency",
  "capacityReserveRatio",
  "defaultJobMinutes",
];

/** [min, max] per field — mirrors the Mongoose schema bounds, checked here too so a bad value 400s instead of surfacing as a Mongoose ValidationError. */
const RANGES = {
  openHour: [0, 23],
  lastSlotHour: [0, 23],
  slotCapacity: [1, 1000],
  techShiftHours: [1, 24],
  capacityEfficiency: [0, 1],
  capacityReserveRatio: [0, 1],
  defaultJobMinutes: [1, 1440],
};

function toPlain(doc) {
  const plain = {};
  for (const field of FIELDS) plain[field] = doc[field];
  return plain;
}

// In-memory cache: every booking-capacity check (getSlots, createBooking,
// rescheduleBooking, computeTimeBucket — all in booking.service.js) reads
// this config, but it only ever changes via an admin PUT, so we cache the
// singleton doc here and refresh on write instead of hitting the DB on every
// booking request.
let cached = null;

/**
 * Live, admin-editable booking-capacity configuration: business hours, seats
 * per slot, and the labour-hour capacity formula (see computeTimeBucket in
 * booking.service.js). Backed by admin/config/ui/AdminConfigPage.tsx.
 * Seeds the singleton from DEFAULT_SYSTEM_CONFIG the first time it's read if
 * no document exists yet.
 */
export async function getSystemConfig() {
  if (cached) return cached;

  let doc = await systemConfigRepository.model.findOne({ key: CONFIG_KEY });
  if (!doc) {
    doc = await systemConfigRepository.model.create({
      key: CONFIG_KEY,
      ...DEFAULT_SYSTEM_CONFIG,
    });
  }
  cached = toPlain(doc);
  return cached;
}

function assertValid(payload) {
  for (const field of FIELDS) {
    const value = payload[field];
    const [min, max] = RANGES[field];
    if (typeof value !== "number" || Number.isNaN(value) || value < min || value > max) {
      throw new ApiError(400, `${field} must be a number between ${min} and ${max}`);
    }
  }
  if (payload.lastSlotHour < payload.openHour) {
    throw new ApiError(400, "lastSlotHour must be greater than or equal to openHour");
  }
}

/** Admin-only write — validates every field, persists, and refreshes the cache. */
export async function updateSystemConfig(payload = {}) {
  const next = {};
  for (const field of FIELDS) next[field] = payload[field];
  assertValid(next);

  const doc = await systemConfigRepository.model.findOneAndUpdate(
    { key: CONFIG_KEY },
    { key: CONFIG_KEY, ...next },
    { new: true, upsert: true, runValidators: true },
  );
  cached = toPlain(doc);
  return cached;
}
