import { RevenueReportModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const revenueReportRepository = createRepository(RevenueReportModel);
