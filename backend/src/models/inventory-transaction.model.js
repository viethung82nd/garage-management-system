import mongoose, { Schema } from "mongoose";

/**
 * Every movement of physical stock. `receipt` and `return` add, `issue` and
 * `writeOff` remove, `adjustment` reconciles a count against reality.
 * Reservations are deliberately NOT here — holding stock for an order moves
 * nothing, so it lives in StockReservation.
 */
export const INVENTORY_TRANSACTION_TYPES = [
  "receipt", // received from a supplier
  "issue", // handed to a technician for a repair order
  "return", // unused part handed back to the store
  "adjustment", // stock count correction
  "writeOff", // damaged / lost / expired
];

/**
 * The append-only ledger of stock movements — the answer to "why does the
 * shelf hold 3 of these and not 5". Previously stockQuantity was a bare number
 * an admin could type over, with no record of what actually happened to it, so
 * shrinkage was invisible and cost of goods sold could not be computed.
 *
 * Rows are written once and never edited: a mistake is corrected by posting a
 * compensating adjustment, exactly as a physical stock ledger works.
 */
const inventoryTransactionSchema = new Schema(
  {
    partId: {
      type: Schema.Types.ObjectId,
      ref: "Part",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: INVENTORY_TRANSACTION_TYPES,
      required: true,
    },
    // Always positive; `type` carries the direction. Storing a signed number
    // instead invites "-(-5)" bugs at every call site.
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    // Unit cost AT THE MOMENT OF THE MOVEMENT, frozen. Recomputing historical
    // margin from today's cost price would silently rewrite past profit.
    unitCost: {
      type: Number,
      min: 0,
      default: 0,
    },
    // On-hand quantity immediately after this movement, so the ledger can be
    // replayed and reconciled without summing from the beginning of time.
    balanceAfter: {
      type: Number,
      min: 0,
    },

    // What caused the movement. Exactly one of these is normally set.
    repairOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
      index: true,
    },
    purchaseOrderId: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder",
    },

    reason: {
      type: String,
      trim: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false },
);

inventoryTransactionSchema.index({ partId: 1, createdAt: -1 });

export const InventoryTransactionModel = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema,
);
