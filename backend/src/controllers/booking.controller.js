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
import { todayUtc } from "../utils/date.js";

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

/**
 * GET /api/bookings — authenticated booking list for back-office screens.
 * Query: status, source, limit
 */
export async function listBookings(req, res) {
  const { status, source } = req.query ?? {};
  const rawLimit = Number.parseInt(String(req.query?.limit ?? "20"), 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), 100)
    : 20;

  const filter = {};
  if (status) {
    filter.status = status;
  }
  if (source) {
    filter.source = source;
  }

  const bookings = await BookingModel.find(filter)
    .populate("customerId", "fullName phone email accountType role")
    .populate("vehicleId", "licensePlate brand model year")
    .populate("serviceId", "name basePrice estimatedDuration")
    .populate("advisorId", "fullName role")
    .sort({ bookingDate: -1, timeSlot: -1 })
    .limit(limit);

  res.json({ bookings });
}

/**
 * GET /api/bookings/mine — authenticated online customer's own bookings.
 */
export async function listMyBookings(req, res) {
  const bookings = await BookingModel.find({ customerId: req.user.sub })
    .populate("customerId", "fullName phone email accountType role")
    .populate("vehicleId", "licensePlate brand model year chassisNumber engineNumber color")
    .populate("serviceId", "name basePrice estimatedDuration")
    .populate("advisorId", "fullName role")
    .sort({ bookingDate: -1, timeSlot: -1 });

  res.json({ bookings });
}

/** Returns the set of seat numbers already taken by occupying bookings in a slot. */
async function takenSeats(bookingDate, timeSlot) {
  const rows = await BookingModel.find(
    { bookingDate, timeSlot, occupiesSlot: true },
    { seatNo: 1, _id: 0 }
  ).lean();
  return new Set(rows.map((r) => r.seatNo));
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
async function resolveCustomer({ fullName, phone, email }) {
  const existing = await UserModel.findOne({
    phone,
    role: { $in: ["onlineCustomer", "walkInCustomer"] },
  });
  if (existing) {
    let shouldSave = false;
    if (!existing.email && email?.trim()) {
      existing.email = email.trim().toLowerCase();
      shouldSave = true;
    }
    if (existing.accountType === "walkIn" && fullName?.trim() && existing.fullName !== fullName.trim()) {
      existing.fullName = fullName.trim();
      shouldSave = true;
    }
    if (shouldSave) {
      await existing.save();
    }
    return existing;
  }
  return UserModel.create({
    fullName: fullName.trim(),
    phone,
    email: email?.trim()?.toLowerCase() || undefined,
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

  // Fast-path rejection of a full slot before any find-or-create side effects.
  const taken = await takenSeats(day, timeSlot);
  if (taken.size >= SLOT_CAPACITY) {
    throw new HttpError(409, "the requested slot is fully booked");
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
      booking = await BookingModel.create({
        customerId: customerDoc._id,
        vehicleId: vehicleDoc._id,
        serviceId: serviceId || undefined,
        bookingDate: day,
        timeSlot,
        source: "online",
        status: "pending",
        note,
        seatNo,
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
    throw new HttpError(409, "the requested slot is fully booked");
  }

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
