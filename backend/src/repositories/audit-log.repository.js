import { AuditLogModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const auditLogRepository = createRepository(AuditLogModel);
