import * as reportingService from "../services/reporting.service.js";

/** GET /api/admin/reports/gross-profit?startDate=&endDate= */
export async function getGrossProfitReport(req, res) {
  const report = await reportingService.getGrossProfitReport(req.query ?? {});
  res.json({ report });
}

/** GET /api/admin/reports/receivables */
export async function getReceivablesReport(_req, res) {
  const report = await reportingService.getReceivablesReport();
  res.json({ report });
}

/** GET /api/admin/reports/kpis?startDate=&endDate= */
export async function getWorkshopKpis(req, res) {
  const report = await reportingService.getWorkshopKpis(req.query ?? {});
  res.json({ report });
}
