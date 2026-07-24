import * as bookingService from "../services/booking.service.js";

/**
 * GET /api/bookings/slots?date=YYYY-MM-DD — public availability for a single day.
 */
export async function getSlots(req, res) {
  const result = await bookingService.getSlots(req.query.date);
  res.json(result);
}

/**
 * POST /api/bookings — public booking creation. Captures the customer and
 * vehicle (find-or-create), re-checks slot capacity, then records the booking.
 */
export async function createBooking(req, res) {
  const result = await bookingService.createBooking(req.body ?? {});
  res.status(201).json(result);
}

/**
 * GET /api/bookings — staff-only list with optional filters.
 * Query: status, date (YYYY-MM-DD), from, to (date range, inclusive).
 */
export async function listBookings(req, res) {
  const result = await bookingService.listBookings(req.query ?? {});
  res.json(result);
}

/**
 * GET /api/bookings/:id — a single booking, staff-only. Used by the SA
 * reception flow to pre-fill the reception form when arriving from a
 * "Confirm" action via ?bookingId= instead of a blind plate search.
 */
export async function getBookingById(req, res) {
  const result = await bookingService.getBookingById(req.params.id);
  res.json(result);
}

/** GET /api/bookings/mine — the authenticated customer's own bookings. */
export async function myBookings(req, res) {
  const result = await bookingService.myBookings(req.user.sub);
  res.json(result);
}

/**
 * PATCH /api/bookings/:id/confirm — service advisor confirms a pending booking
 * (Service Advisor "Confirm Booked Appointment"). Only pending → confirmed.
 */
export async function confirmBooking(req, res) {
  const result = await bookingService.confirmBooking(req.params.id, req.user.sub);
  res.json(result);
}

/**
 * PATCH /api/bookings/:id/cancel — customer cancels their own booking, or staff
 * cancels any.
 */
export async function cancelBooking(req, res) {
  const result = await bookingService.cancelBooking(
    req.params.id,
    req.user,
    req.body?.reason,
  );
  res.json(result);
}

/**
 * PATCH /api/bookings/:id/reschedule — move an active booking to a new
 * date/slot.
 * Body: { bookingDate: "YYYY-MM-DD", timeSlot: "HH:00", reason? }
 */
export async function rescheduleBooking(req, res) {
  const result = await bookingService.rescheduleBooking(
    req.params.id,
    req.user,
    req.body ?? {},
  );
  res.json(result);
}

/**
 * PATCH /api/bookings/:id/status — staff update an appointment's status through
 * the lifecycle. Body: { status, reason? }.
 */
export async function updateBookingStatus(req, res) {
  const result = await bookingService.updateBookingStatus(
    req.params.id,
    req.user,
    req.body ?? {},
  );
  res.json(result);
}

/**
 * PATCH /api/bookings/:id/no-show — staff marks a booking as a no-show (the
 * customer never arrived). Only pending/confirmed/rescheduled → noShow; frees
 * the slot the same way cancel does.
 */
export async function markNoShow(req, res) {
  const result = await bookingService.markNoShow(req.params.id, req.user.sub);
  res.json(result);
}

/**
 * GET /api/bookings/no-shows — staff callback list of no-show bookings to
 * work through for re-booking, most-recent appointment first.
 */
export async function listNoShows(req, res) {
  const result = await bookingService.listNoShows();
  res.json(result);
}

/**
 * POST /api/bookings/appointment-reminders — fires an in-app reminder
 * notification for every active booking starting within the next 24 hours.
 * Returns the count of reminders sent.
 */
export async function generateAppointmentReminders(req, res) {
  const result = await bookingService.generateAppointmentReminders();
  res.json(result);
}
