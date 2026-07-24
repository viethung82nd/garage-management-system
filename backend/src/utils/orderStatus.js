import { RepairOrderStatusHistoryModel } from "../models/repair-order-status-history.model.js";
import { logAudit } from "./audit.js";

/**
 * Appends an immutable RepairOrder status-transition record and (best-effort)
 * an `orderStatusChanged` audit entry. Call this at every point a repair
 * order's `status` actually changes, so "how did this order get here, who moved
 * it, and why" is always answerable — the basis for measuring where vehicles
 * wait and for internal-control review.
 *
 * Best-effort like logAudit: history/audit failures must never break the
 * business action. Pass `session` when inside a transaction so the history row
 * commits/rolls back with the status change it describes.
 *
 * @param {{ repairOrderId: any, from?: string|null, to: string,
 *           changedBy?: any, reason?: string,
 *           session?: import("mongoose").ClientSession }} payload
 */
export async function recordStatusChange({
  repairOrderId,
  from,
  to,
  changedBy,
  reason,
  session,
}) {
  // No-op when nothing actually changed — keeps the history free of noise.
  if (from === to) return null;

  try {
    const [entry] = await RepairOrderStatusHistoryModel.create(
      [{ repairOrderId, from: from ?? null, to, changedBy, reason }],
      { session },
    );

    // Audit is a separate, non-transactional concern (it's an observation, not
    // part of the business write) — don't attach the session so it survives
    // even if the outer transaction later aborts for an unrelated reason.
    await logAudit({
      action: "orderStatusChanged",
      actorId: changedBy,
      repairOrderId,
      details: `${from ?? "(new)"} → ${to}${reason ? ` — ${reason}` : ""}`,
    });

    return entry;
  } catch (err) {
    console.warn("[orderStatus] failed to record transition:", err?.message ?? err);
    return null;
  }
}
