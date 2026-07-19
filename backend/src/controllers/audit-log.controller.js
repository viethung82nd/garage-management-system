import * as auditLogService from "../services/audit-log.service.js";

/** GET /api/audit-logs — the last 200 billing audit-log entries, newest first. */
export async function listAuditLogs(_req, res) {
  const result = await auditLogService.listAuditLogs();
  res.json(result);
}
