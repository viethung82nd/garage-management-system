import mongoose, { Schema } from "mongoose";

export const PURCHASE_ORDER_STATUSES = [
  "draft", // being assembled, not yet sent to the supplier
  "sent", // sent to the supplier, awaiting delivery
  "partiallyReceived", // some lines fully/partly delivered, at least one still outstanding
  "received", // every line fully delivered
  "cancelled", // abandoned before anything arrived
];

export const PURCHASE_ORDER_PAYMENT_STATUSES = ["unpaid", "partiallyPaid", "paid"];

const purchaseOrderLineSchema = new Schema(
  {
    partId: {
      type: Schema.Types.ObjectId,
      ref: "Part",
      required: true,
    },
    // Free-text label frozen at order time (defaults to the part's name) —
    // survives even if the part is later renamed or deactivated.
    description: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0,
    },
    // How much of `quantity` has actually arrived so far. A PO is routinely
    // delivered across several shipments, so this — not the order's own
    // status — is the source of truth for "how much of this line is still
    // outstanding". Bumped only via purchase-order.service#receiveGoods,
    // which is the sole path that also moves physical stock.
    receivedQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Set when this specific line was bought for one job rather than to
    // restock the shelf — a "special order" part sourced because a repair is
    // waiting on it. Lets that shortage be traced forward to the exact line
    // that will resolve it, distinct from the PO-level
    // `backorderForRepairOrderId` below (a whole run raised because of one
    // job, even if some of its lines also happen to restock the shelf).
    repairOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
    },
  },
  { _id: false },
);

/**
 * A purchase order raised against a supplier for one or more parts.
 *
 * Two jobs live on this one document, deliberately: fulfilment (draft → sent
 * → partially/fully received, tracked per-line via `receivedQuantity`) and
 * payables (`amountDue`/`amountPaid`/`paymentStatus`/`dueAt`), because in a
 * garage this size the same PO is what the accountant reconciles against the
 * supplier's invoice — splitting them into separate documents would just mean
 * keeping two totals in sync by hand.
 *
 * Receiving goods is the one operation with real consequences elsewhere: it
 * has to add stock, roll the moving-average cost forward, and write the
 * inventory ledger, all in the same transaction as bumping this document's
 * `receivedQuantity`/`status` — see utils/stock.js#receiveStock and
 * purchase-order.service.js#receiveGoods.
 */
const purchaseOrderSchema = new Schema(
  {
    // Human-readable order number, e.g. "PO-202607-00001". Assigned via
    // utils/sequence.js at creation.
    code: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: PURCHASE_ORDER_STATUSES,
      default: "draft",
      index: true,
    },
    lines: {
      type: [purchaseOrderLineSchema],
      default: [],
    },
    // Sum of quantity × unitCost across all lines, recomputed whenever lines
    // change (draft only — lines are frozen once sent).
    subtotal: {
      type: Number,
      min: 0,
      default: 0,
    },
    expectedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    // Set when this whole PO exists to resolve a stock shortfall against one
    // repair order sitting in waitingParts — the payables/reporting side of
    // the same traceability the per-line repairOrderId gives on the
    // fulfilment side.
    backorderForRepairOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
    },

    // ===== Payables =====
    // What we owe the supplier for this order — starts equal to `subtotal`
    // and is deliberately a separate field (not read live off subtotal) so a
    // later manual adjustment (a supplier credit, a shipping charge) doesn't
    // require touching the line items.
    amountDue: {
      type: Number,
      min: 0,
      default: 0,
    },
    amountPaid: {
      type: Number,
      min: 0,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: PURCHASE_ORDER_PAYMENT_STATUSES,
      default: "unpaid",
    },
    // When payment is due — defaults to created date + supplier.paymentTermDays
    // at creation time, so the payables ageing report always has something to
    // measure against.
    dueAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// The two hot reads: "every order for this supplier" (payables chasing,
// reorder history) and "what's overdue" (ageing report).
purchaseOrderSchema.index({ supplierId: 1, status: 1 });
purchaseOrderSchema.index({ paymentStatus: 1, dueAt: 1 });

export const PurchaseOrderModel = mongoose.model("PurchaseOrder", purchaseOrderSchema);
