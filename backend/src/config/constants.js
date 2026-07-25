/**
 * Bookable time-slot configuration. Fixed hourly slots across the working day,
 * each able to hold up to SLOT_CAPACITY concurrent bookings.
 *
 * These are SEED / FALLBACK values only. The live, admin-editable source of
 * truth is the SystemConfig singleton served by
 * services/config.service.js#getSystemConfig() (backed by
 * admin/config/ui/AdminConfigPage.tsx on the frontend) — that document is
 * seeded from DEFAULT_SYSTEM_CONFIG below the first time it's read, and every
 * booking-capacity check (getSlots, createBooking, rescheduleBooking,
 * computeTimeBucket in booking.service.js) reads the live config, not these
 * constants directly, so an admin change takes effect without a redeploy.
 * The named constants stay exported for standalone scripts/tests that run
 * against a fresh DB and therefore always see these same defaults.
 */

// First and last slot start hours (24h). Last slot starts at 16:00 → 17:00 close.
const OPEN_HOUR = 8;
const LAST_SLOT_HOUR = 16;

/** Maximum active bookings allowed in a single slot. */
export const SLOT_CAPACITY = 5;

/**
 * Time-bucket capacity, the "how many labour-minutes can this shop actually
 * sell today" question the seat count alone can't answer (a day can have
 * empty seats and still be out of technician-hours, or vice-versa).
 */
// Paid hours a technician is rostered for in a working day.
export const TECH_SHIFT_HOURS = 8;
// Not every rostered hour turns into billable wrench time (breaks, admin,
// cleanup) — a realistic shop runs at well under 100% efficiency.
export const CAPACITY_EFFICIENCY = 0.85;
// Reserved for walk-ins, warranty comebacks and running-late carry-over —
// never book the day down to the last minute (Toyota's own standard: keep
// ~20% free).
export const CAPACITY_RESERVE_RATIO = 0.2;
// Fallback estimate (minutes) for a booking whose service has no
// estimatedDuration on file, so the day's total is never silently understated.
export const DEFAULT_JOB_MINUTES = 60;

/** Seed values for the SystemConfig singleton — see config.service.js. */
export const DEFAULT_SYSTEM_CONFIG = {
  openHour: OPEN_HOUR,
  lastSlotHour: LAST_SLOT_HOUR,
  slotCapacity: SLOT_CAPACITY,
  techShiftHours: TECH_SHIFT_HOURS,
  capacityEfficiency: CAPACITY_EFFICIENCY,
  capacityReserveRatio: CAPACITY_RESERVE_RATIO,
  defaultJobMinutes: DEFAULT_JOB_MINUTES,
};

/** Booking statuses that still occupy a slot (cancelled frees it up). */
export const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed", "rescheduled"];

/**
 * Returns the ordered list of slot start times for a given window, e.g.
 * ["08:00", ..., "16:00"]. Defaults to the seed window when called without
 * args; callers on the live-config path (booking.service.js) pass the
 * admin-configured openHour/lastSlotHour explicitly.
 */
export function getSlotTimes(openHour = OPEN_HOUR, lastSlotHour = LAST_SLOT_HOUR) {
  const slots = [];
  for (let hour = openHour; hour <= lastSlotHour; hour += 1) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
  }
  return slots;
}

/** True if `timeSlot` is one of `slotTimes` (defaults to the seed window). */
export function isValidSlot(timeSlot, slotTimes = getSlotTimes()) {
  return slotTimes.includes(timeSlot);
}
