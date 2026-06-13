import {
  BookingModel,
  BookingHistoryModel,
  ServiceModel,
  UserModel,
  VehicleModel,
} from "../models/index.js";
import { HttpError } from "../middleware/error.js";
import {
  SLOT_CAPACITY,
  ACTIVE_BOOKING_STATUSES,
  getSlotTimes,
  isValidSlot,
} from "../config/slots.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a "YYYY-MM-DD" string into a normalized UTC-midnight Date. Bookings are
 * always stored at midnight so an exact-match query is enough to group a day.
 */
function parseBookingDate(dateStr) {
  if (!dateStr || !DATE_RE.test(dateStr)) {
    throw new HttpError(400, "date must be in YYYY-MM-DD format");
  }
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, "date is not a valid calendar date");
  }
  return date;
}

/** UTC midnight of the current day — the earliest date that can still be booked. */
function todayUtc() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

/** Counts active (slot-occupying) bookings for a given day + slot. */
async function countActive(bookingDate, timeSlot) {
  return BookingModel.countDocuments({
    bookingDate,
    timeSlot,
    status: { $in: ACTIVE_BOOKING_STATUSES },
  });
}

/**
 * GET /api/bookings/slots?date=YYYY-MM-DD — public availability for a single day.
 * Returns every configured slot with its capacity, current booked count, and
 * whether it can still take a booking.
 */
export async function getSlots(req, res) {
  const bookingDate = parseBookingDate(req.query.date);
  if (bookingDate < todayUtc()) {
    throw new HttpError(400, "date is in the past");
  }

  // One grouped count for the whole day, then map onto the configured slots.
  const counts = await BookingModel.aggregate([
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

  res.json({ date: req.query.date, capacity: SLOT_CAPACITY, slots });
}

/** Finds a user by phone, or creates a walk-in customer record for them. */
async function resolveCustomer({ fullName, phone }) {
  const existing = await UserModel.findOne({ phone });
  if (existing) {
    return existing;
  }
  return UserModel.create({
    fullName,
    phone,
    role: "walkInCustomer",
    accountType: "walkIn",
  });
}

/** Finds a vehicle by licence plate, or registers a new one for the customer. */
async function resolveVehicle({ licensePlate, brand, model }, customerId) {
  const plate = licensePlate.toUpperCase().trim();
  const existing = await VehicleModel.findOne({ licensePlate: plate });
  if (existing) {
    return existing;
  }
  return VehicleModel.create({ licensePlate: plate, brand, model, customerId });
}

/**
 * POST /api/bookings — public booking creation. Captures the customer and
 * vehicle (find-or-create), re-checks slot capacity, then records the booking.
 */
export async function createBooking(req, res) {
  const { customer, vehicle, serviceId, bookingDate, timeSlot, note } =
    req.body ?? {};

  if (!customer?.fullName?.trim() || !customer?.phone?.trim()) {
    throw new HttpError(400, "customer.fullName and customer.phone are required");
  }
  if (!vehicle?.licensePlate?.trim()) {
    throw new HttpError(400, "vehicle.licensePlate is required");
  }
  if (!isValidSlot(timeSlot)) {
    throw new HttpError(
      400,
      `timeSlot must be one of: ${getSlotTimes().join(", ")}`
    );
  }

  const day = parseBookingDate(bookingDate);
  // Reject a slot whose start time has already passed (covers today's stale slots).
  const slotStart = new Date(`${bookingDate}T${timeSlot}:00.000Z`);
  if (slotStart < new Date()) {
    throw new HttpError(400, "the requested slot is in the past");
  }

  if (serviceId) {
    const service = await ServiceModel.findOne({ _id: serviceId, isActive: true });
    if (!service) {
      throw new HttpError(404, "service not found or inactive");
    }
  }

  // Slot check: re-count right before insert so a slot that filled up since the
  // client last checked is rejected. (Small race window remains under high
  // concurrency — a transaction/optimistic lock would be the next hardening step.)
  if ((await countActive(day, timeSlot)) >= SLOT_CAPACITY) {
    throw new HttpError(409, "the requested slot is fully booked");
  }

  const customerDoc = await resolveCustomer(customer);
  const vehicleDoc = await resolveVehicle(vehicle, customerDoc._id);

  const booking = await BookingModel.create({
    customerId: customerDoc._id,
    vehicleId: vehicleDoc._id,
    serviceId: serviceId || undefined,
    bookingDate: day,
    timeSlot,
    source: "online",
    status: "pending",
    note,
  });

  await BookingHistoryModel.create({
    bookingId: booking._id,
    changedBy: customerDoc._id,
    action: "created",
  });

  const populated = await booking.populate([
    { path: "customerId", select: "fullName phone" },
    { path: "vehicleId", select: "licensePlate brand model" },
    { path: "serviceId", select: "name basePrice estimatedDuration" },
  ]);

  res.status(201).json({ booking: populated });
}
