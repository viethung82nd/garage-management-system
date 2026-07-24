import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  listPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  sendPurchaseOrder,
  receiveGoods,
  cancelPurchaseOrder,
  recordSupplierPayment,
  getPayablesReport,
  getReorderSuggestions,
} from "../controllers/purchase-order.controller.js";

export const purchaseOrderRouter = Router();

purchaseOrderRouter.use(requireAuth);

// Fixed-path reports MUST be registered before "/:id" — otherwise Express
// matches "reorder-suggestions"/"payables" as an :id and routes them into
// getPurchaseOrderById instead.
purchaseOrderRouter.get(
  "/reorder-suggestions",
  requireRole("partsStaff", "admin"),
  catchAsync(getReorderSuggestions),
);
purchaseOrderRouter.get(
  "/payables",
  requireRole("accountant", "admin"),
  catchAsync(getPayablesReport),
);

purchaseOrderRouter.get(
  "",
  requireRole("admin", "partsStaff", "accountant"),
  catchAsync(listPurchaseOrders),
);
purchaseOrderRouter.get(
  "/:id",
  requireRole("admin", "partsStaff", "accountant"),
  catchAsync(getPurchaseOrderById),
);
purchaseOrderRouter.post("", requireRole("admin", "partsStaff"), catchAsync(createPurchaseOrder));
purchaseOrderRouter.put("/:id", requireRole("admin", "partsStaff"), catchAsync(updatePurchaseOrder));
purchaseOrderRouter.post(
  "/:id/send",
  requireRole("admin", "partsStaff"),
  catchAsync(sendPurchaseOrder),
);
purchaseOrderRouter.post(
  "/:id/receive",
  requireRole("admin", "partsStaff"),
  catchAsync(receiveGoods),
);
purchaseOrderRouter.post(
  "/:id/cancel",
  requireRole("admin", "partsStaff"),
  catchAsync(cancelPurchaseOrder),
);
purchaseOrderRouter.post(
  "/:id/payments",
  requireRole("accountant", "admin"),
  catchAsync(recordSupplierPayment),
);
