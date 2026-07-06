/**
 * Assigns seatNo + occupiesSlot to existing active bookings so the slot-lock
 * unique index accounts for them. Idempotent: skips bookings that already have a
 * seatNo, and seeds from already-assigned seats so a re-run never reuses one.
 * Warns (does not fail) on pre-existing overbooking beyond SLOT_CAPACITY.
 * Usage: node scripts/backfill-booking-seats.js
 */
import { connectDb } from "../src/db/connect.js";
import { BookingModel } from "../src/models/index.js";
import { ACTIVE_BOOKING_STATUSES, SLOT_CAPACITY } from "../src/config/slots.js";
import mongoose from "mongoose";

await connectDb();

const keyOf = (b) => `${b.bookingDate.toISOString()}|${b.timeSlot}`;

// Seed used-seats per (day|slot) from active bookings that already have a seat.
const used = new Map();
const seeded = await BookingModel.find(
  { status: { $in: ACTIVE_BOOKING_STATUSES }, seatNo: { $exists: true } },
  { bookingDate: 1, timeSlot: 1, seatNo: 1 }
).lean();
for (const b of seeded) {
  if (!used.has(keyOf(b))) used.set(keyOf(b), new Set());
  used.get(keyOf(b)).add(b.seatNo);
}

// Active bookings still missing a seat, oldest first for stable assignment.
const pending = await BookingModel.find({
  status: { $in: ACTIVE_BOOKING_STATUSES },
  seatNo: { $exists: false },
}).sort({ bookingDate: 1, timeSlot: 1, createdAt: 1 });

let updated = 0;
const overflow = [];
for (const b of pending) {
  if (!used.has(keyOf(b))) used.set(keyOf(b), new Set());
  const seats = used.get(keyOf(b));
  let seatNo = 1;
  while (seats.has(seatNo)) seatNo += 1;
  seats.add(seatNo);
  b.seatNo = seatNo;
  await b.save(); // pre-save hook sets occupiesSlot
  updated += 1;
  if (seatNo > SLOT_CAPACITY) {
    overflow.push(`${b.bookingDate.toISOString().slice(0, 10)} ${b.timeSlot} seat ${seatNo} -> ${b._id}`);
  }
}

console.log(`Backfilled ${updated} booking(s).`);
if (overflow.length) {
  console.warn(`WARNING: ${overflow.length} booking(s) exceed SLOT_CAPACITY=${SLOT_CAPACITY} (pre-existing overbooking):`);
  for (const line of overflow) console.warn(`  ${line}`);
}

await mongoose.disconnect();
process.exit(0);
