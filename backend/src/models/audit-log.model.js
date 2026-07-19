import mongoose, { Schema } from "mongoose";

export const AUDIT_ACTIONS = ["invoiceGenerated", "invoiceSent", "paymentRecorded"];

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

export const AuditLogModel = mongoose.model("AuditLog", auditLogSchema);
