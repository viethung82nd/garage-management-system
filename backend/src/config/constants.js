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
