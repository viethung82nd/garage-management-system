/** UTC midnight of the current day. Bookings are stored at midnight, so this is
 * the canonical "today" used for date-equality queries and past-date checks. */
export function todayUtc() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

// The shop operates in Vietnam (ICT), which has no daylight-saving time, so
// this is a fixed, year-round offset — safe to hardcode.
const SHOP_UTC_OFFSET = "+07:00";

/**
 * The real instant a booking slot starts, given its `bookingDate`
 * ("YYYY-MM-DD") and `timeSlot` ("HH:mm") — both wall-clock values in the
 * shop's own timezone, not UTC. Every call site used to build this by
 * appending "Z" (UTC) instead, which parses e.g. "16:00" as 16:00 UTC =
 * 23:00 ICT — seven hours later than the shop actually means. That silently
 * let a slot which had already passed hours ago in the real world still
 * compare as "still upcoming", so a customer could book (or the reminder
 * job could skip) an already-past afternoon slot late into the same evening.
 */
export function slotStartInstant(bookingDateStr, timeSlot) {
  return new Date(`${bookingDateStr}T${timeSlot}:00${SHOP_UTC_OFFSET}`);
}
