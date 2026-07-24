import * as auditLogService from "../services/audit-log.service.js";

/** GET /api/audit-logs?scope=billing|all — audit-log entries, newest first.
 *  Defaults to the billing scope (the accountant's Audit Trail). */
export async function listAuditLogs(req, res) {
  const result = await auditLogService.listAuditLogs({ scope: req.query?.scope });
  res.json(result);
}
