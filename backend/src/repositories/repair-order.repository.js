import { RepairOrderModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const repairOrderRepository = createRepository(RepairOrderModel);
