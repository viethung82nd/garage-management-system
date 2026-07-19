import { AuditLogModel } from "../models/index.js";

/**
 * Persists a single billing audit-log entry. Best-effort: a logging failure
 * must never break the business action that triggered it, so errors are
 * logged and swallowed rather than propagated (same convention as
 * createNotification in utils/notify.js).
 *
 * @param {{ action: "invoiceGenerated" | "invoiceSent" | "paymentRecorded",
 *           actorId: any, invoiceId?: any, repairOrderId?: any, details?: string }} payload
 */
export async function logAudit({ action, actorId, invoiceId, repairOrderId, details }) {
  try {
    return await AuditLogModel.create({
      action,
      actorId,
      invoiceId,
      repairOrderId,
      details,
    });
  } catch (err) {
    console.warn("[audit] failed to log:", err?.message ?? err);
    return null;
  }
}
