import { TimeLogModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const timeLogRepository = createRepository(TimeLogModel);
