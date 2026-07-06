import mongoose from "mongoose";
import { RepairOrderModel, InvoiceModel } from "../models/index.js";
import { HttpError } from "../middleware/error.js";

/**
 * POST /api/invoices — generate an invoice from a completed repair order.
 *
 * Line items, subtotal and total are derived server-side from the order's
 * services. An optional discount may be applied. One invoice per repair order.
 */
export async function generateInvoiceFromRepairOrder(req, res) {
  const { repairOrderId, discount } = req.body ?? {};

  if (!mongoose.isValidObjectId(repairOrderId)) {
    throw new HttpError(400, "repairOrderId is not a valid id");
  }

  const order = await RepairOrderModel.findById(repairOrderId);
  if (!order) {
    throw new HttpError(404, "repair order not found");
  }

  if (order.status !== "completed") {
    throw new HttpError(409, "repair order is not completed");
  }

  const existing = await InvoiceModel.findOne({ repairOrderId });
  if (existing) {
    throw new HttpError(409, "invoice already exists for this repair order");
  }

  const lineItems = order.services.map((s) => ({
    description: s.name,
    quantity: s.quantity,
    unitPrice: s.priceAtTime,
  }));

  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  const appliedDiscount = discount ?? 0;
  if (
    typeof appliedDiscount !== "number" ||
    Number.isNaN(appliedDiscount) ||
    appliedDiscount < 0 ||
    appliedDiscount > subtotal
  ) {
    throw new HttpError(400, "discount must be a number between 0 and the subtotal");
  }

  const total = subtotal - appliedDiscount;

  const invoice = await InvoiceModel.create({
    repairOrderId,
    accountantId: req.user.sub,
    lineItems,
    subtotal,
    discount: appliedDiscount,
    total,
    status: "unpaid",
  });

  res.status(201).json(invoice);
}
