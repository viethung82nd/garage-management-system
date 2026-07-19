import * as inspectionReportService from "../services/inspection-report.service.js";

/** GET /api/inspection-reports?vehicleId=&repairOrderId=&bookingId= */
export async function listInspectionReports(req, res) {
  const result = await inspectionReportService.listInspectionReports(req.query ?? {});
  res.json(result);
}

export async function createInspectionReport(req, res) {
  const inspectionReport = await inspectionReportService.createInspectionReport(
    req.body ?? {},
    req.files,
    req.user?.sub,
  );
  res.status(201).json(inspectionReport);
}
