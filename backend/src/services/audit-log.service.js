import { AuditLogModel } from "../models/index.js";

function formatDisplayId(prefix, value) {
  if (!value) {
    return "";
  }
  return `${prefix}-${String(value).slice(-6).toUpperCase()}`;
}

/** List the last 200 billing audit-log entries, newest first. */
export async function listAuditLogs() {
  const entries = await AuditLogModel.find()
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
