import { AuditLogModel } from "../models/index.js";

/**
 * Persists a single audit-log entry. Best-effort: a logging failure must never
 * break the business action that triggered it, so errors are logged and
 * swallowed rather than propagated (same convention as createNotification in
 * utils/notify.js).
 *
 * Covers billing actions plus the wider set of sensitive operations
 * (quote approval, QC, status changes, price/discount overrides, stock
 * adjustments, role changes) — see AUDIT_ACTIONS. Use `targetModel`/`targetId`
 * for actions not naturally keyed to an invoice or repair order.
 *
 * @param {{ action: string, actorId: any, invoiceId?: any, repairOrderId?: any,
 *           targetModel?: string, targetId?: any, details?: string }} payload
 */
export async function logAudit({
  action,
  actorId,
  invoiceId,
  repairOrderId,
  targetModel,
  targetId,
  details,
}) {
  try {
    return await AuditLogModel.create({
      action,
      actorId,
      invoiceId,
      repairOrderId,
      targetModel,
      targetId,
      details,
    });
  } catch (err) {
    console.warn("[audit] failed to log:", err?.message ?? err);
    return null;
  }
}
