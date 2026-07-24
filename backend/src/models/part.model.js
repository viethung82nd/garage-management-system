import mongoose, { Schema } from "mongoose";

/** How a part was sourced. Printed on the invoice: a customer is entitled to
 *  know whether they were charged for a new, used or reconditioned part. */
export const PART_CONDITIONS = ["new", "oem", "aftermarket", "reconditioned", "used"];

const partSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    // Manufacturer's own part number, distinct from our internal SKU — this is
    // what gets cross-referenced against a supplier catalogue.
    oemCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    unit: {
      type: String,
      trim: true,
      default: "pcs",
    },
    category: {
      type: String,
      trim: true,
    },
    condition: {
      type: String,
      enum: PART_CONDITIONS,
      default: "new",
    },

    // ===== Money =====
    // What we sell it for.
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    // What it cost us. Without this the system can report revenue but never
    // margin — which is the number that actually tells the owner whether a job
    // was worth doing. Maintained as a moving average on each receipt.
    costPrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    // ===== Stock =====
    // Physically on the shelf.
    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    // Committed to approved repair orders but not yet handed to a technician.
    // Available = stockQuantity - reservedQuantity; selling against `available`
    // is what stops two orders being promised the same last alternator.
    // Denormalised from StockReservation for cheap availability checks.
    reservedQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },
    minStock: {
      type: Number,
      min: 0,
      default: 0,
    },
    maxStock: {
      type: Number,
      min: 0,
    },
    // Falling to or below this triggers a reorder suggestion.
    reorderPoint: {
      type: Number,
      min: 0,
      default: 0,
    },
    location: {
      type: String,
      trim: true,
    },

    // Preferred supplier, used to seed a purchase order.
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
    },

    // Soft delete: a part is referenced by historical quote/order/invoice
    // lines, so it is retired rather than removed.
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

/** Free-to-sell quantity. */
partSchema.virtual("availableQuantity").get(function availableQuantity() {
  return Math.max(0, (this.stockQuantity || 0) - (this.reservedQuantity || 0));
});

partSchema.set("toJSON", { virtuals: true });
partSchema.set("toObject", { virtuals: true });

// Reorder reporting scans for parts at or below their trigger level.
partSchema.index({ isActive: 1, reorderPoint: 1 });

export const PartModel = mongoose.model("Part", partSchema);
