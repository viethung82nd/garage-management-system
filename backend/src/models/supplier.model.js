import mongoose, { Schema } from "mongoose";

/**
 * A vendor the garage buys parts from.
 *
 * Deliberately thin — this is a purchasing/payables contact record, not a
 * duplicate of the parts catalog. `paymentTermDays` and `leadTimeDays` exist
 * because they drive two other things directly: a purchase order's default
 * `dueAt` (created date + paymentTermDays, so the payables ageing report has
 * something to measure against without anyone typing a due date by hand), and
 * eventually the reorder point math (how much lead time to buffer for).
 *
 * Soft delete only: once a supplier has been raised against a purchase order
 * it is permanently referenced by that order's history, so it is retired
 * (`isActive: false`) rather than removed.
 */
const supplierSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Short internal code (e.g. "SUP-001" or a vendor's own short name) used
    // on purchase order printouts and for quick lookup — separate from the
    // Mongo _id, same reasoning as Part.sku.
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    contactName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    taxCode: {
      type: String,
      trim: true,
    },
    // Standard credit window this supplier extends to us. Feeds the default
    // due date on every PO raised against them.
    paymentTermDays: {
      type: Number,
      min: 0,
      default: 30,
    },
    // Typical days from "sent" to goods arriving — informs expectedAt
    // defaults and, later, reorder-point buffering.
    leadTimeDays: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    // Soft delete: historical purchase orders reference this supplier by id,
    // so it is retired rather than removed.
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Supplier pickers filter to active vendors and sort by name.
supplierSchema.index({ isActive: 1, name: 1 });

export const SupplierModel = mongoose.model("Supplier", supplierSchema);
