import { SystemConfigModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const systemConfigRepository = createRepository(SystemConfigModel);
