/**
 * Concurrency check for slot booking: fires SLOT_CAPACITY + 15 simultaneous
 * POST /api/bookings at one slot and asserts exactly SLOT_CAPACITY succeed.
 * Requires the dev server running on http://localhost:4000.
 * Usage: node scripts/test-slot-concurrency.js
 */
import { connectDb } from "../src/config/db.js";
import { BookingModel, VehicleModel, UserModel } from "../src/models/index.js";
import { SLOT_CAPACITY } from "../src/config/constants.js";
import mongoose from "mongoose";

const BASE = "http://localhost:4000";
const TEST_DATE = "2099-12-31"; // far future: passes past-slot guards, won't clash with real data
const TEST_SLOT = "08:00";
const TEST_DATE_OBJ = new Date(`${TEST_DATE}T00:00:00.000Z`);
const PLATE_PREFIX = "ZZSLOTTEST";
const PHONE_PREFIX = "0900111";
const ATTEMPTS = SLOT_CAPACITY + 15;

async function cleanup() {
  await BookingModel.deleteMany({ bookingDate: TEST_DATE_OBJ, timeSlot: TEST_SLOT });
  await VehicleModel.deleteMany({ licensePlate: { $regex: new RegExp(`^${PLATE_PREFIX}`) } });
  await UserModel.deleteMany({ phone: { $regex: new RegExp(`^${PHONE_PREFIX}`) } });
}

function postBooking(i) {
  return fetch(`${BASE}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: { fullName: `Slot Test ${i}`, phone: `${PHONE_PREFIX}${String(i).padStart(3, "0")}` },
      vehicle: { licensePlate: `${PLATE_PREFIX}${i}`, brand: "Test", model: "Test" },
      bookingDate: TEST_DATE,
      timeSlot: TEST_SLOT,
    }),
  }).then((r) => r.status);
}

await connectDb();
await cleanup();

const statuses = await Promise.all(
  Array.from({ length: ATTEMPTS }, (_, i) => postBooking(i)),
);
const created = statuses.filter((s) => s === 201).length;
const rejected = statuses.filter((s) => s === 409).length;

const slotsRes = await fetch(`${BASE}/api/bookings/slots?date=${TEST_DATE}`).then((r) => r.json());
const booked = slotsRes.slots.find((s) => s.timeSlot === TEST_SLOT)?.booked ?? -1;

console.log(`attempts=${ATTEMPTS} created=${created} rejected=${rejected} booked(reported)=${booked}`);

const ok = created === SLOT_CAPACITY && rejected === ATTEMPTS - SLOT_CAPACITY && booked === SLOT_CAPACITY;

await cleanup();
await mongoose.disconnect();

if (!ok) {
  console.error(`FAIL: expected created=${SLOT_CAPACITY}, rejected=${ATTEMPTS - SLOT_CAPACITY}, booked=${SLOT_CAPACITY}`);
  process.exit(1);
}
console.log("PASS: slot capacity held under concurrency");
process.exit(0);
