import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  listSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplier.controller.js";

export const supplierRouter = Router();

// Suppliers are owned by parts/stores staff (and admin). Reads are also open
// to accountant — they chase payables and need to see who a purchase order
// is owed to and on what terms.
supplierRouter.use(requireAuth);

supplierRouter.get("", requireRole("admin", "partsStaff", "accountant"), catchAsync(listSuppliers));
supplierRouter.get("/:id", requireRole("admin", "partsStaff", "accountant"), catchAsync(getSupplierById));
supplierRouter.post("", requireRole("admin", "partsStaff"), catchAsync(createSupplier));
supplierRouter.put("/:id", requireRole("admin", "partsStaff"), catchAsync(updateSupplier));
supplierRouter.delete("/:id", requireRole("admin", "partsStaff"), catchAsync(deleteSupplier));
