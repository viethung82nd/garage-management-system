import mongoose, { Schema } from "mongoose";

export const AUDIT_ACTIONS = [
  // Billing (original set)
  "invoiceGenerated",
  "invoiceSent",
  "paymentRecorded",
  // Quote / approval trail
  "quoteApproved",
  "quoteRejected",
  // Repair-order lifecycle & quality
  "qcSubmitted",
  "orderStatusChanged",
  "orderReopened",
  "priceOverridden",
  "discountApplied",
  // Inventory
  "stockAdjusted",
  // Staff / access control
  "userRoleChanged",
  "userDeactivated",
];

const auditLogSchema = new Schema(
  {
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
    },
    repairOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
    },
    // Generic reference for actions that aren't about an invoice/order — a
    // quote approval, a user role change, a stock adjustment. `targetModel` is
    // the referenced collection name so the entry is self-describing without a
    // dedicated FK column per entity type.
    targetModel: {
      type: String,
      trim: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
    },
    details: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// The audit log's whole value is being queryable and time-ordered: "what
// happened to this order", "everything this actor did", newest-first.
auditLogSchema.index({ repairOrderId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLogModel = mongoose.model("AuditLog", auditLogSchema);
