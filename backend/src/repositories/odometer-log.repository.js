import { OdometerLogModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const odometerLogRepository = createRepository(OdometerLogModel);
