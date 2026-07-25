/**
 * Bookable time-slot configuration. Fixed hourly slots across the working day,
 * each able to hold up to SLOT_CAPACITY concurrent bookings. Kept as plain
 * constants so opening hours or capacity can be tuned in one place.
 */

// First and last slot start hours (24h). Last slot starts at 16:00 → 17:00 close.
const OPEN_HOUR = 8;
const LAST_SLOT_HOUR = 16;

/** Maximum active bookings allowed in a single slot. */
export const SLOT_CAPACITY = 5;

/**
 * Time-bucket capacity, the "how many labour-minutes can this shop actually
 * sell today" question the seat count alone can't answer (a day can have
 * empty seats and still be out of technician-hours, or vice-versa). Kept as
 * separate constants so they can be tuned without touching the booking logic
 * that uses them — see getSlots()/checkDayCapacity() in booking.service.js.
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

/** Booking statuses that still occupy a slot (cancelled frees it up). */
export const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed", "rescheduled"];

/** Returns the ordered list of slot start times, e.g. ["08:00", ..., "16:00"]. */
export function getSlotTimes() {
  const slots = [];
  for (let hour = OPEN_HOUR; hour <= LAST_SLOT_HOUR; hour += 1) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
  }
  return slots;
}

/** True if `timeSlot` is one of the configured slots. */
export function isValidSlot(timeSlot) {
  return getSlotTimes().includes(timeSlot);
}
