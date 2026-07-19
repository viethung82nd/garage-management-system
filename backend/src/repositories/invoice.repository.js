import { InvoiceModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const invoiceRepository = createRepository(InvoiceModel);
