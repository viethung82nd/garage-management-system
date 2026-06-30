/** UTC midnight of the current day. Bookings are stored at midnight, so this is
 * the canonical "today" used for date-equality queries and past-date checks. */
export function todayUtc() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}
