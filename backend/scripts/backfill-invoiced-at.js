/**
 * One-off backfill for repair orders invoiced before RepairOrder.invoicedAt
 * existed. Without this, an order that was billed directly (accountant
 * generated an invoice without the SA ever clicking "Forward to accountant")
 * has no signal recorded on the order itself, so it keeps showing up in the
 * SA's Quality Check queue forever even though it's already fully invoiced.
 *
 * Safe to re-run: only touches orders that have a real invoice and are
 * still missing invoicedAt.
 *
 * Usage: node scripts/backfill-invoiced-at.js   (from backend/)
 */
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { InvoiceModel, RepairOrderModel } from "../src/models/index.js";

async function main() {
  await mongoose.connect(env.mongoUri);
  console.log("[backfill] connected to MongoDB");

  const invoices = await InvoiceModel.find({}).select("repairOrderId issuedAt");
  let updated = 0;

  for (const invoice of invoices) {
    const result = await RepairOrderModel.updateOne(
      { _id: invoice.repairOrderId, invoicedAt: { $exists: false } },
      { $set: { invoicedAt: invoice.issuedAt } }
    );
    if (result.modifiedCount > 0) updated += 1;
  }

  console.log(`[backfill] checked ${invoices.length} invoices, stamped invoicedAt on ${updated} repair order(s).`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[backfill] failed:", err);
  process.exit(1);
});
