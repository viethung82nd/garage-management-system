import { PurchaseOrderModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const purchaseOrderRepository = createRepository(PurchaseOrderModel);
