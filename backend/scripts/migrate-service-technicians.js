/**
 * Backfills each repair order's per-line technicianId from the old
 * order-level RepairOrder.technicianId field, then strips that field from
 * every document. Best-effort assumption: whoever was assigned to the whole
 * order did every one of its lines. Uses the raw MongoDB driver (not the
 * Mongoose model) so it can read `technicianId` off existing documents even
 * after the field is removed from repair-order.model.js.
 * Idempotent: a line that already has its own technicianId is left alone,
 * and the final $unset is a no-op on documents that don't have the field.
 * Usage: node scripts/migrate-service-technicians.js
 */
import { connectDb } from "../src/config/db.js";
import mongoose from "mongoose";

await connectDb();

const col = mongoose.connection.db.collection("repairorders");

let backfilled = 0;
const cursor = col.find({ technicianId: { $ne: null } });
for await (const doc of cursor) {
  if (!Array.isArray(doc.services) || doc.services.length === 0) continue;
  const services = doc.services.map((s) => ({
    ...s,
    technicianId: s.technicianId ?? doc.technicianId,
  }));
  await col.updateOne({ _id: doc._id }, { $set: { services } });
  backfilled += 1;
}
console.log(`[migrate-service-technicians] backfilled ${backfilled} repair order(s)`);

const unsetResult = await col.updateMany({}, { $unset: { technicianId: "" } });
console.log(
  `[migrate-service-technicians] removed top-level technicianId from ${unsetResult.modifiedCount} document(s)`,
);

await mongoose.disconnect();
