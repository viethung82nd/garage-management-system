import {
  bookingRepository,
  bookingHistoryRepository,
} from "../repositories/booking.repository.js";
import {
  serviceRepository,
  serviceCategoryRepository,
} from "../repositories/service.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { resourceRepository } from "../repositories/resource.repository.js";
import { BOOKING_STATUSES } from "../models/booking.model.js";
import { ScheduleModel } from "../models/schedule.model.js";
import { ApiError } from "../utils/apiError.js";
import {
  SLOT_CAPACITY,
  ACTIVE_BOOKING_STATUSES,
  getSlotTimes,
  isValidSlot,
  TECH_SHIFT_HOURS,
  CAPACITY_EFFICIENCY,
  CAPACITY_RESERVE_RATIO,
  DEFAULT_JOB_MINUTES,
} from "../config/constants.js";
import { todayUtc } from "../utils/date.js";
import { createNotification, notifyRole } from "../utils/notify.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const OID_RE = /^[0-9a-fA-F]{24}$/;

/** Roles allowed to manage any booking (confirm, and act on behalf of anyone). */
const STAFF_BOOKING_ROLES = ["serviceAdvisor", "admin"];

/**
 * Legal status transitions for the generic PATCH /:id/status endpoint. Keys are
 * the current status, values the statuses staff may move it to. `cancelled` and
 * `completed` are terminal. `rescheduled` is deliberately not a valid target
 * here — moving a booking's date/slot must go through /:id/reschedule so a fresh
 * seat is claimed.
 */
const STATUS_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  rescheduled: ["confirmed", "completed", "cancelled"],
  cancelled: [],
  completed: [],
};

/** Per-target-status history action + customer notification copy. */
const STATUS_META = {
  confirmed: {
    action: "confirmed",
    type: "bookingConfirmed",
    title: "Appointment confirmed",
    message: "Your appointment has been confirmed by our service advisor.",
  },
  completed: {
    action: "completed",
    type: "bookingCompleted",
    title: "Appointment completed",
    message: "Your appointment has been marked as completed.",
  },
  cancelled: {
    action: "cancelled",
    type: "bookingCancelled",
    title: "Appointment cancelled",
    message: "Your appointment has been cancelled.",
  },
};

/**
 * Parses a "YYYY-MM-DD" string into a normalized UTC-midnight Date. Bookings are
 * always stored at midnight so an exact-match query is enough to group a day.
 */
function parseBookingDate(dateStr) {
  if (!dateStr || !DATE_RE.test(dateStr)) {
    throw new ApiError(400, "date must be in YYYY-MM-DD format");
  }
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "date is not a valid calendar date");
  }
  return date;
}

/** Returns the set of seat numbers already taken by occupying bookings in a slot. */
async function takenSeats(bookingDate, timeSlot) {
  const rows = await bookingRepository.model
    .find({ bookingDate, timeSlot, occupiesSlot: true }, { seatNo: 1, _id: 0 })
    .lean();
  return new Set(rows.map((r) => r.seatNo));
}

/**
 * The real capacity question a seat count can't answer: how many labour-
 * minutes can the shop actually sell today, and how many are already spoken
 * for. Computed for the whole day (technician rostering isn't tracked at
 * sub-day granularity today), not per slot — additive to, not a replacement
 * for, the seat-based booking limit that actually enforces overbooking safety.
 */
async function computeTimeBucket(bookingDate) {
  // Technician headcount for the day: prefer an actual roster (Schedule) for
  // that date; if none was entered, fall back to every active technician on
  // staff — a reasonable default rather than reporting zero capacity.
  const rosteredCount = await ScheduleModel.countDocuments({
    date: bookingDate,
    isAvailable: true,
  });
  const technicianCount =
    rosteredCount > 0
      ? rosteredCount
      : await userRepository.model.countDocuments({ role: "technician", isActive: { $ne: false } });

  const capacityMinutes = Math.round(
    technicianCount * TECH_SHIFT_HOURS * 60 * CAPACITY_EFFICIENCY * (1 - CAPACITY_RESERVE_RATIO),
  );

  // Sum the estimated duration of every active booking that day, falling back
  // to a default estimate for a booking with no linked service (or a service
  // with no estimatedDuration on file) so the total is never understated.
  const minuteRows = await bookingRepository.aggregate([
    { $match: { bookingDate, status: { $in: ACTIVE_BOOKING_STATUSES } } },
    {
      $lookup: {
        from: "services",
        localField: "serviceId",
        foreignField: "_id",
        as: "service",
      },
    },
    {
      $addFields: {
        durationMinutes: {
          $ifNull: [{ $arrayElemAt: ["$service.estimatedDuration", 0] }, DEFAULT_JOB_MINUTES],
        },
      },
    },
    { $group: { _id: null, totalMinutes: { $sum: "$durationMinutes" } } },
  ]);
  const bookedMinutes = minuteRows[0]?.totalMinutes || 0;

  return {
    technicianCount,
    capacityMinutes,
    bookedMinutes,
    availableMinutes: Math.max(0, capacityMinutes - bookedMinutes),
    utilizationPercent:
      capacityMinutes > 0 ? Math.round((bookedMinutes / capacityMinutes) * 100) : 0,
  };
}

/**
 * Public availability for a single day. Returns every configured slot with its
 * seat capacity/booked count, plus the day's labour-hour time bucket — the
 * two capacity signals together, since neither alone answers "can we take
 * this job" (a day can have a free seat and no technician-hours left, or the
 * reverse).
 */
export async function getSlots(dateParam) {
  const bookingDate = parseBookingDate(dateParam);
  if (bookingDate < todayUtc()) {
    throw new ApiError(400, "date is in the past");
  }

  // One grouped count for the whole day, then map onto the configured slots.
  const counts = await bookingRepository.aggregate([
    { $match: { bookingDate, status: { $in: ACTIVE_BOOKING_STATUSES } } },
    { $group: { _id: "$timeSlot", count: { $sum: 1 } } },
  ]);
  const bookedBySlot = new Map(counts.map((c) => [c._id, c.count]));

  const slots = getSlotTimes().map((timeSlot) => {
    const booked = bookedBySlot.get(timeSlot) ?? 0;
    return {
      timeSlot,
      capacity: SLOT_CAPACITY,
      booked,
      available: booked < SLOT_CAPACITY,
    };
  });

  const timeBucket = await computeTimeBucket(bookingDate);

  return { date: dateParam, capacity: SLOT_CAPACITY, slots, timeBucket };
}

/** Finds a user by phone, or creates a walk-in customer record for them. */
export async function resolveCustomer({ fullName, phone, email }, session) {
  const normalizedName = fullName?.trim();
  const normalizedPhone = phone?.trim();
  const normalizedEmail = email?.trim().toLowerCase();

  const existing = await userRepository.model
    .findOne({
      phone: normalizedPhone,
      role: { $in: ["onlineCustomer", "walkInCustomer"] },
    })
    .session(session ?? null);

  if (existing) {
    // Phone đã tồn tại nhưng tên khác -> báo lỗi
    if (
      normalizedName &&
      existing.fullName.trim().toLowerCase() !== normalizedName.toLowerCase()
    ) {
      throw new ApiError(
        409,
        `Phone number ${normalizedPhone} already belongs to ${existing.fullName}. Please verify the customer's information.`,
      );
    }

    // Chỉ bổ sung email nếu trước đó chưa có
    if (!existing.email && normalizedEmail) {
      existing.email = normalizedEmail;
      await existing.save({ session });
    }

    return existing;
  }

  // Chưa có khách hàng -> tạo mới. Model.create([doc], {session}) is the
  // session-aware create form and returns an array even for a single doc.
  const [created] = await userRepository.model.create(
    [
      {
        fullName: normalizedName,
        phone: normalizedPhone,
        email: normalizedEmail || undefined,
        role: "walkInCustomer",
        accountType: "walkIn",
      },
    ],
    { session },
  );
  return created;
}

/** Finds a vehicle by licence plate, or registers a new one for the customer.
 *  Pass `session` to enrol every read/write in an outer transaction. */
export async function resolveVehicle(
  { licensePlate, brand, model },
  customerId,
  session,
) {
  const plate = licensePlate.toUpperCase().trim();
  const existing = await vehicleRepository.model
    .findOne({ licensePlate: plate })
    .session(session ?? null);
  if (existing) {
    // A vehicle record from an earlier visit shouldn't freeze its
    // brand/model forever — apply whatever the front desk just typed
    // (e.g. it was blank before, or was corrected) instead of silently
    // discarding it because the plate already matched something on file.
    let changed = false;
    if (brand?.trim() && brand.trim() !== existing.brand) {
      existing.brand = brand.trim();
      changed = true;
    }
    if (model?.trim() && model.trim() !== existing.model) {
      existing.model = model.trim();
      changed = true;
    }
    if (changed) {
      await existing.save({ session });
    }
    return existing;
  }
  const [created] = await vehicleRepository.model.create(
    [{ licensePlate: plate, brand, model, customerId }],
    { session },
  );
  return created;
}

/** Populates a booking with the fields clients need for display. */
function populateBooking(booking) {
  return booking.populate([
    { path: "customerId", select: "fullName phone" },
    { path: "vehicleId", select: "licensePlate brand model" },
    { path: "serviceId", select: "name basePrice estimatedDuration" },
    { path: "advisorId", select: "fullName" },
  ]);
}

/** Loads a booking by id or throws a clean 400/404. */
async function loadBooking(id) {
  if (!OID_RE.test(String(id))) {
    throw new ApiError(400, "Invalid booking ID format");
  }
  const booking = await bookingRepository.findById(id);
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }
  return booking;
}

/** True for staff who may act on any booking. */
function isStaff(user) {
  return STAFF_BOOKING_ROLES.includes(user.role);
}

/** Staff may manage any booking; a customer only their own. Otherwise 403. */
function assertCanManage(booking, user) {
  if (isStaff(user)) return;
  if (String(booking.customerId) === String(user.sub)) return;
  throw new ApiError(403, "You do not have permission to modify this booking");
}

/**
 * Notifies the party who did NOT perform an action (customer ⇄ advisor), so a
 * staff cancel reaches the customer and a customer cancel reaches the advisor.
 */
async function notifyCounterparty(booking, actor, payload) {
  const actorId = String(actor.sub);
  const targets = new Set();
  if (String(booking.customerId) !== actorId)
    targets.add(String(booking.customerId));
  if (booking.advisorId && String(booking.advisorId) !== actorId) {
    targets.add(String(booking.advisorId));
  }
  for (const userId of targets) {
    await createNotification({
      userId,
      refId: booking._id,
      refModel: "Booking",
      ...payload,
    });
  }
}

/**
 * Public booking creation. Captures the customer and vehicle (find-or-create),
 * re-checks slot capacity, then records the booking.
 */
export async function createBooking({
  customer,
  vehicle,
  serviceId,
  serviceCategory,
  bookingDate,
  timeSlot,
  note,
  // Optional pin to a specific bay/lift/paint booth — most bookings don't need
  // one, but a job that does (e.g. an alignment rack) can reserve it up front.
  resourceId,
}) {
  if (!customer?.fullName?.trim() || !customer?.phone?.trim()) {
    throw new ApiError(
      400,
      "customer.fullName and customer.phone are required",
    );
  }
  if (!vehicle?.licensePlate?.trim()) {
    throw new ApiError(400, "vehicle.licensePlate is required");
  }
  if (!isValidSlot(timeSlot)) {
    throw new ApiError(
      400,
      `timeSlot must be one of: ${getSlotTimes().join(", ")}`,
    );
  }

  const day = parseBookingDate(bookingDate);
  // Reject a slot whose start time has already passed (covers today's stale slots).
  const slotStart = new Date(`${bookingDate}T${timeSlot}:00.000Z`);
  if (slotStart < new Date()) {
    throw new ApiError(400, "the requested slot is in the past");
  }

  if (serviceId) {
    const service = await serviceRepository.findOne({
      _id: serviceId,
      isActive: true,
    });
    if (!service) {
      throw new ApiError(404, "service not found or inactive");
    }
  }

  // The customer now picks a service category (not a single service) at booking
  // time; validate it against the catalog so a stale/invalid name can't slip
  // through to the SA's inspection checklist.
  const categoryName = serviceCategory?.trim();
  if (categoryName) {
    const category = await serviceCategoryRepository.findOne({
      name: categoryName,
    });
    if (!category) {
      throw new ApiError(404, "service category not found");
    }
  }

  // Fast-path rejection of a full slot before any find-or-create side effects.
  const taken = await takenSeats(day, timeSlot);
  if (taken.size >= SLOT_CAPACITY) {
    throw new ApiError(409, "the requested slot is fully booked");
  }

  let resolvedResourceId;
  if (resourceId) {
    if (!OID_RE.test(String(resourceId))) {
      throw new ApiError(400, "Invalid resourceId format");
    }
    const resource = await resourceRepository.findOne({ _id: resourceId, isActive: { $ne: false } });
    if (!resource) {
      throw new ApiError(404, "Resource not found or inactive");
    }
    // A resource can only back one active booking in a given slot — the same
    // exclusivity guarantee seats get, checked here rather than via a unique
    // index since a null resourceId (the common case) must not collide.
    const clash = await bookingRepository.findOne({
      bookingDate: day,
      timeSlot,
      resourceId,
      status: { $in: ACTIVE_BOOKING_STATUSES },
    });
    if (clash) {
      throw new ApiError(409, "This resource is already booked for that slot");
    }
    resolvedResourceId = resource._id;
  }

  const customerDoc = await resolveCustomer(customer);
  const vehicleDoc = await resolveVehicle(vehicle, customerDoc._id);

  // Claim the lowest free seat. The unique partial index makes each seat
  // exclusive: if a concurrent request grabs the same seat first, create() fails
  // with E11000 (code 11000) and we advance to the next free seat. Capacity can
  // never be exceeded; running out of free seats means the slot is full.
  let booking;
  for (let seatNo = 1; seatNo <= SLOT_CAPACITY; seatNo += 1) {
    if (taken.has(seatNo)) continue;
    try {
      booking = await bookingRepository.create({
        customerId: customerDoc._id,
        vehicleId: vehicleDoc._id,
        serviceId: serviceId || undefined,
        serviceCategory: categoryName || undefined,
        bookingDate: day,
        timeSlot,
        source: "online",
        status: "pending",
        note,
        seatNo,
        resourceId: resolvedResourceId,
      });
      break;
    } catch (err) {
      if (err?.code === 11000) {
        taken.add(seatNo);
        continue;
      }
      throw err;
    }
  }
  if (!booking) {
    throw new ApiError(409, "the requested slot is fully booked");
  }

  await bookingHistoryRepository.create({
    bookingId: booking._id,
    changedBy: customerDoc._id,
    action: "created",
  });

  // Alert every service advisor that a booking is waiting to be confirmed.
  await notifyRole("serviceAdvisor", {
    type: "bookingCreated",
    title: "New booking pending confirmation",
    message: `Booking for ${bookingDate} at ${timeSlot} awaiting confirmation.`,
    refId: booking._id,
    refModel: "Booking",
  });

  return { booking: await populateBooking(booking) };
}

/** Staff-only list with optional filters. */
export async function listBookings({ status, date, from, to }) {
  const filter = {};

  if (status) {
    if (!BOOKING_STATUSES.includes(status)) {
      throw new ApiError(
        400,
        `status must be one of: ${BOOKING_STATUSES.join(", ")}`,
      );
    }
    filter.status = status;
  }

  if (date) {
    filter.bookingDate = parseBookingDate(date);
  } else if (from || to) {
    filter.bookingDate = {};
    if (from) filter.bookingDate.$gte = parseBookingDate(from);
    if (to) filter.bookingDate.$lte = parseBookingDate(to);
  }

  const bookings = await bookingRepository.model
    .find(filter)
    .populate("customerId", "fullName phone")
    .populate("vehicleId", "licensePlate brand model")
    .populate("serviceId", "name basePrice estimatedDuration")
    .populate("advisorId", "fullName")
    .sort({ bookingDate: 1, timeSlot: 1 });

  return { bookings };
}

/**
 * A single booking, staff-only. Used by the SA reception flow to pre-fill the
 * reception form when arriving from a "Confirm" action via ?bookingId=
 * instead of a blind plate search.
 */
export async function getBookingById(id) {
  const booking = await loadBooking(id);
  return { booking: await populateBooking(booking) };
}

/** The authenticated customer's own bookings. */
export async function myBookings(customerId) {
  const bookings = await bookingRepository.model
    .find({ customerId })
    .populate("vehicleId", "licensePlate brand model")
    .populate("serviceId", "name basePrice estimatedDuration")
    .populate("advisorId", "fullName")
    .sort({ bookingDate: -1, timeSlot: 1 });

  return { bookings };
}

/**
 * Service advisor confirms a pending booking (Service Advisor "Confirm Booked
 * Appointment"). Only pending → confirmed.
 */
export async function confirmBooking(id, advisorId) {
  const booking = await loadBooking(id);
  if (booking.status !== "pending") {
    throw new ApiError(409, `Cannot confirm a ${booking.status} booking`);
  }

  booking.status = "confirmed";
  booking.advisorId = advisorId;
  await booking.save();

  await bookingHistoryRepository.create({
    bookingId: booking._id,
    changedBy: advisorId,
    action: "confirmed",
  });

  await createNotification({
    userId: booking.customerId,
    type: "bookingConfirmed",
    title: "Appointment confirmed",
    message: "Your appointment has been confirmed by our service advisor.",
    refId: booking._id,
    refModel: "Booking",
  });

  return { booking: await populateBooking(booking) };
}

/**
 * Customer cancels their own booking, or staff cancels any. Frees the slot:
 * saving with a non-active status flips occupiesSlot false via the model
 * hook, dropping the seat from the unique index.
 */
export async function cancelBooking(id, user, reason) {
  const booking = await loadBooking(id);
  assertCanManage(booking, user);

  if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
    throw new ApiError(409, `Cannot cancel a ${booking.status} booking`);
  }

  booking.status = "cancelled";
  await booking.save();

  await bookingHistoryRepository.create({
    bookingId: booking._id,
    changedBy: user.sub,
    action: "cancelled",
    reason: reason?.trim(),
  });

  await notifyCounterparty(booking, user, {
    type: "bookingCancelled",
    title: "Appointment cancelled",
    message: "An appointment has been cancelled.",
  });

  return { booking: await populateBooking(booking) };
}

/**
 * Move an active booking to a new date/slot. Re-checks capacity and claims a
 * fresh seat in the target slot with the same E11000 retry the create path
 * uses; the old seat frees automatically because the same document moves off
 * its previous (date, slot, seat).
 */
export async function rescheduleBooking(
  id,
  user,
  { bookingDate, timeSlot, reason },
) {
  const booking = await loadBooking(id);
  assertCanManage(booking, user);

  if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
    throw new ApiError(409, `Cannot reschedule a ${booking.status} booking`);
  }

  if (!isValidSlot(timeSlot)) {
    throw new ApiError(
      400,
      `timeSlot must be one of: ${getSlotTimes().join(", ")}`,
    );
  }
  const day = parseBookingDate(bookingDate);
  const slotStart = new Date(`${bookingDate}T${timeSlot}:00.000Z`);
  if (slotStart < new Date()) {
    throw new ApiError(400, "the requested slot is in the past");
  }

  const previousDate = booking.bookingDate;
  const previousSlot = booking.timeSlot;
  if (previousDate.getTime() === day.getTime() && previousSlot === timeSlot) {
    throw new ApiError(400, "New slot is the same as the current one");
  }

  const taken = await takenSeats(day, timeSlot);
  if (taken.size >= SLOT_CAPACITY) {
    throw new ApiError(409, "the requested slot is fully booked");
  }

  let saved = false;
  for (let seatNo = 1; seatNo <= SLOT_CAPACITY; seatNo += 1) {
    if (taken.has(seatNo)) continue;
    booking.bookingDate = day;
    booking.timeSlot = timeSlot;
    booking.seatNo = seatNo;
    booking.status = "rescheduled";
    try {
      await booking.save();
      saved = true;
      break;
    } catch (err) {
      if (err?.code === 11000) {
        taken.add(seatNo);
        continue;
      }
      throw err;
    }
  }
  if (!saved) {
    throw new ApiError(409, "the requested slot is fully booked");
  }

  await bookingHistoryRepository.create({
    bookingId: booking._id,
    changedBy: user.sub,
    action: "rescheduled",
    previousDate,
    previousSlot,
    reason: reason?.trim(),
  });

  await notifyCounterparty(booking, user, {
    type: "bookingRescheduled",
    title: "Appointment rescheduled",
    message: `An appointment was moved to ${bookingDate} at ${timeSlot}.`,
  });

  return { booking: await populateBooking(booking) };
}

/**
 * Staff update an appointment's status through the lifecycle (pending →
 * confirmed → completed, or → cancelled), validated against
 * STATUS_TRANSITIONS. Saving via .save() keeps occupiesSlot in sync, so
 * cancelling/completing frees the seat. Rescheduling (date/slot change) is
 * not handled here — use rescheduleBooking.
 */
export async function updateBookingStatus(id, user, { status, reason }) {
  if (!BOOKING_STATUSES.includes(status)) {
    throw new ApiError(
      400,
      `status must be one of: ${BOOKING_STATUSES.join(", ")}`,
    );
  }
  if (status === "rescheduled") {
    throw new ApiError(
      400,
      "Use the reschedule endpoint to change a booking's date/slot",
    );
  }

  const booking = await loadBooking(id);

  if (booking.status === status) {
    throw new ApiError(409, `Booking is already ${status}`);
  }
  const allowed = STATUS_TRANSITIONS[booking.status] ?? [];
  if (!allowed.includes(status)) {
    throw new ApiError(
      409,
      `Cannot change status from ${booking.status} to ${status}`,
    );
  }

  booking.status = status;
  // Record who confirmed the appointment, matching the dedicated confirm route.
  if (status === "confirmed") {
    booking.advisorId = user.sub;
  }
  await booking.save();

  const meta = STATUS_META[status];
  await bookingHistoryRepository.create({
    bookingId: booking._id,
    changedBy: user.sub,
    action: meta.action,
    reason: reason?.trim(),
  });

  await createNotification({
    userId: booking.customerId,
    type: meta.type,
    title: meta.title,
    message: meta.message,
    refId: booking._id,
    refModel: "Booking",
  });

  return { booking: await populateBooking(booking) };
}

/**
 * Staff marks a booking as a no-show — the customer never arrived for their
 * slot. Only allowed from an active status (pending/confirmed/rescheduled),
 * mirroring cancelBooking's guard. Saving the terminal "noShow" status is
 * what frees the seat: it's not in ACTIVE_BOOKING_STATUSES, so the model's
 * pre-save hook flips occupiesSlot false and the (date, slot, seat) triple
 * drops out of the unique index, same mechanism as cancel/complete.
 *
 * NOTE on BookingHistory: BOOKING_HISTORY_ACTIONS (booking-history.model.js)
 * is a closed enum that does not include "noShow", and that model is outside
 * this change's scope, so a no-show is not mirrored into BookingHistory here.
 * The Booking document's own `status` field remains the source of truth for
 * no-shows; extend BOOKING_HISTORY_ACTIONS in a follow-up if an audit-trail
 * entry is also needed.
 */
export async function markNoShow(id, actorId) {
  const booking = await loadBooking(id);

  if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
    throw new ApiError(
      409,
      `Cannot mark a ${booking.status} booking as no-show`
    );
  }

  booking.status = "noShow";
  await booking.save();

  await bookingHistoryRepository.create({
    bookingId: booking._id,
    changedBy: actorId,
    action: "noShow",
    changedAt: new Date(),
  });

  return { booking: await populateBooking(booking) };
}

/**
 * Staff callback list: every no-show booking, most-recent appointment first.
 * This is the queue staff work through to re-book customers who missed their
 * slot, so it's sorted by the missed appointment's own date/slot rather than
 * by record-creation time.
 */
export async function listNoShows() {
  const bookings = await bookingRepository.model
    .find({ status: "noShow" })
    .populate("customerId", "fullName phone")
    .populate("vehicleId", "licensePlate brand model")
    .populate("serviceId", "name basePrice estimatedDuration")
    .populate("advisorId", "fullName")
    .sort({ bookingDate: -1, timeSlot: -1 });

  return { bookings };
}

/** Zero-pads a UTC-midnight bookingDate into a dd/mm/yyyy string. */
function formatSlotDate(date) {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const y = date.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Finds active bookings (pending/confirmed/rescheduled) whose appointment
 * instant — bookingDate + timeSlot — falls within the next 24 hours, and
 * fires an in-app "appointmentReminder" notification to each customer.
 * Meant to be triggered periodically (e.g. by a daily cron hitting the
 * route); no persistent dedupe is kept across runs — only the notification
 * itself is the artifact, per this phase's scope — but a single run never
 * double-notifies the same booking.
 */
export async function generateAppointmentReminders() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // bookingDate is stored at UTC midnight, so the real appointment instant is
  // bookingDate + timeSlot. Pre-filter by day (today..tomorrow covers any
  // 24h window) with an indexed range query, then compute the exact instant
  // in memory and keep only what truly falls inside (now, now + 24h].
  const candidates = await bookingRepository.model
    .find(
      {
        status: { $in: ACTIVE_BOOKING_STATUSES },
        bookingDate: { $gte: todayUtc(), $lte: in24h },
      },
      { customerId: 1, bookingDate: 1, timeSlot: 1 }
    )
    .lean();

  const seen = new Set(); // in-run dedupe guard, keyed by booking id
  let count = 0;
  for (const booking of candidates) {
    const key = String(booking._id);
    if (seen.has(key)) continue;

    const slotStart = new Date(
      `${booking.bookingDate.toISOString().slice(0, 10)}T${booking.timeSlot}:00.000Z`
    );
    if (slotStart <= now || slotStart > in24h) continue;

    seen.add(key);
    await createNotification({
      userId: booking.customerId,
      type: "appointmentReminder",
      title: "Upcoming appointment reminder",
      message: `You have a service appointment at ${booking.timeSlot} on ${formatSlotDate(
        booking.bookingDate
      )}. Please arrive on time.`,
      refId: booking._id,
      refModel: "Booking",
    });
    count += 1;
  }

  return { count };
}
