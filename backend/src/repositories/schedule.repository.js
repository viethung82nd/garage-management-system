import { ScheduleModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const scheduleRepository = createRepository(ScheduleModel);
