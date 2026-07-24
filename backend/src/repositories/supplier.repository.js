import { SupplierModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const supplierRepository = createRepository(SupplierModel);
