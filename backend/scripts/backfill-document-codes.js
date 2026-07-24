/**
 * One-off backfill for RepairOrder.code / Invoice.code, introduced in Phase 1.
 * Documents created before numbering existed have no `code`; this assigns them
 * one so every order/invoice is referable by a human-readable number.
 *
 * Codes are anchored to each document's own creation month (createdAt /
 * issuedAt) so the historical numbering stays chronologically sensible, and
 * assigned in creation order within each month.
 *
 * Safe to re-run: only touches documents still missing a code.
 *
 * Usage: node scripts/backfill-document-codes.js   (from backend/)
 */
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { RepairOrderModel, InvoiceModel } from "../src/models/index.js";
import { generateCode } from "../src/utils/sequence.js";

async function backfill(Model, prefix, dateField) {
  const docs = await Model.find({ code: { $in: [null, undefined] } }).sort({ [dateField]: 1 });
  let updated = 0;
  for (const doc of docs) {
    const date = doc[dateField] || doc.createdAt || new Date();
    // eslint-disable-next-line no-await-in-loop -- sequential on purpose:
    // generateCode's counter must not be raced, and order matters.
    doc.code = await generateCode(prefix, { date });
    // eslint-disable-next-line no-await-in-loop
    await doc.save();
    updated += 1;
  }
  console.log(`[backfill] ${prefix}: assigned codes to ${updated} of ${docs.length} document(s).`);
}

async function main() {
  await mongoose.connect(env.mongoUri);
  console.log("[backfill] connected to MongoDB");

  await backfill(RepairOrderModel, "RO", "createdAt");
  await backfill(InvoiceModel, "INV", "issuedAt");

  await mongoose.disconnect();
  console.log("[backfill] done");
}

main().catch((err) => {
  console.error("[backfill] failed:", err);
  process.exit(1);
});
