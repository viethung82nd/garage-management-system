import { AuditLogModel } from "../models/index.js";

function formatDisplayId(prefix, value) {
  if (!value) {
    return "";
  }
  return `${prefix}-${String(value).slice(-6).toUpperCase()}`;
}

// The audit log grew from 3 billing actions to cover the whole system
// (quotes, QC, stock, roles…). The accountant's Audit Trail is a billing
// screen, so it scopes to these — the other actions are still recorded and can
// be surfaced on an admin audit view. Without this scope the accountant's trail
// filled up with stock adjustments and status changes they don't care about.
const BILLING_ACTIONS = ["invoiceGenerated", "invoiceSent", "paymentRecorded"];

/** List the last 200 audit-log entries, newest first. Defaults to the billing
 *  scope for the accountant's Audit Trail; pass scope="all" for everything. */
export async function listAuditLogs({ scope = "billing" } = {}) {
  const query = scope === "all" ? {} : { action: { $in: BILLING_ACTIONS } };
  const entries = await AuditLogModel.find(query)
    .populate({ path: "actorId", select: "fullName" })
    .populate({ path: "invoiceId", select: "total" })
    .sort({ createdAt: -1 })
    .limit(200);

  return {
    entries: entries.map((entry) => ({
      id: String(entry._id),
      action: entry.action,
      actorName: entry.actorId?.fullName || "Unknown",
      invoiceId: entry.invoiceId ? String(entry.invoiceId._id) : null,
      invoiceDisplayId: entry.invoiceId ? formatDisplayId("INV", entry.invoiceId._id) : null,
      details: entry.details || "",
      createdAt: entry.createdAt,
    })),
  };
}
