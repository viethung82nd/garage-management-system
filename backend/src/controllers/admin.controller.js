import * as adminService from "../services/admin.service.js";

/**
 * GET /api/admin/stats/summary — read-only dashboard figures for admins and
 * accountants.
 */
export async function getStatsSummary(_req, res) {
  const result = await adminService.getStatsSummary();
  res.json(result);
}

/**
 * GET /api/admin/reports/revenue — detailed revenue report for a period, with
 * breakdowns by service, payment method, and technician.
 * Query: startDate, endDate (YYYY-MM-DD, required), period (label, default
 * "monthly"), save ("true" persists a RevenueReport snapshot).
 */
export async function getRevenueReport(req, res) {
  const result = await adminService.getRevenueReport(req.query ?? {}, req.user.sub);
  res.json(result);
}

/**
 * GET /api/admin/stats/daily-intake — booking counts per calendar day for the
 * last `days` days (default 7, max 31), oldest first.
 */
export async function getDailyIntake(req, res) {
  const result = await adminService.getDailyIntake(req.query.days);
  res.json(result);
}

/**
 * GET /api/admin/reports/technicians — technician performance over a period.
 * Query: startDate, endDate (YYYY-MM-DD, required)
 */
export async function getTechnicianPerformance(req, res) {
  const result = await adminService.getTechnicianPerformance(req.query ?? {});
  res.json(result);
}

/**
 * GET /api/admin/users — list users for admin account management. Optional
 * `role` query filters to a single role.
 */
export async function listUsers(req, res) {
  const result = await adminService.listUsers(req.query ?? {}, req.user?.role);
  res.json(result);
}

/**
 * PATCH /api/admin/users/:id/deactivate — soft-disable a user account by
 * setting isActive = false.
 */
export async function deactivateUser(req, res) {
  const result = await adminService.deactivateUser(req.params.id, req.user.sub);
  res.json(result);
}
