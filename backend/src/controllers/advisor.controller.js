import * as advisorService from "../services/advisor.service.js";

/** GET /api/advisor/dashboard — summary counters for the Service Advisor landing page. */
export async function getAdvisorDashboard(_req, res) {
  const result = await advisorService.getAdvisorDashboard();
  res.json(result);
}
