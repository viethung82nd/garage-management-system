import { InspectionReportModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const inspectionReportRepository = createRepository(InspectionReportModel);
