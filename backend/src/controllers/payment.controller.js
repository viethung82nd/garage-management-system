import mongoose from "mongoose";
import {
  InvoiceModel,
  PaymentModel,
} from "../models/index.js";
import { PAYMENT_METHODS } from "../models/Payment.js";
import { HttpError } from "../middleware/error.js";
import { charge } from "../utils/paymentGateway.js";

/** Throws a 400 unless `id` is a well-formed Mongo ObjectId. */
function assertObjectId(id, label) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(400, `${label} is not a valid id`);
  }
}

/** Resolves the customer who owns an invoice, via its repair order's vehicle. */
async function resolveInvoiceCustomer(invoiceId) {
  return InvoiceModel.findById(invoiceId).populate({
    path: "repairOrderId",
    select: "vehicleId",
    populate: { path: "vehicleId", select: "customerId" },
  });
}

/**
 * POST /api/payments — record a payment for an invoice through the mock gateway.
 *
 * Creates a pending payment, runs it through the gateway, then settles both the
 * payment status (succeeded/failed, with `paidAt`) and — on success — the
 * invoice status (→ paid). The charged amount always comes from the invoice
 * total, never the client, so a request can't under/over-pay.
 */
export async function recordPayment(req, res) {
  const { invoiceId, method, simulate } = req.body ?? {};

  assertObjectId(invoiceId, "invoiceId");
  if (!PAYMENT_METHODS.includes(method)) {
    throw new HttpError(
      400,
      `method must be one of: ${PAYMENT_METHODS.join(", ")}`
    );
  }

  const invoice = await resolveInvoiceCustomer(invoiceId);
  if (!invoice) {
    throw new HttpError(404, "invoice not found");
  }
  if (invoice.status === "paid") {
    throw new HttpError(409, "invoice is already paid");
  }
  if (invoice.status === "cancelled") {
    throw new HttpError(409, "invoice is cancelled");
  }

  const customerId = invoice.repairOrderId?.vehicleId?.customerId;
  if (!customerId) {
    throw new HttpError(422, "invoice has no associated customer");
  }

  // Record the attempt up front so a gateway failure still leaves an audit trail.
  const payment = await PaymentModel.create({
    invoiceId: invoice._id,
    customerId,
    amount: invoice.total,
    method,
    status: "pending",
  });

  const result = await charge({
    amount: invoice.total,
    method,
    simulate,
  });

  payment.status = result.status;
  payment.gatewayRef = result.gatewayRef;
  payment.gatewayPayload = result.payload;
  if (result.status === "succeeded") {
    payment.paidAt = new Date();
  }
  await payment.save();

  // Only a successful charge settles the invoice.
  if (result.status === "succeeded") {
    invoice.status = "paid";
    await invoice.save();
  }

  res.status(201).json({
    payment,
    invoiceStatus: invoice.status,
  });
}

/** GET /api/payments/:id — fetch a single payment with its invoice summary. */
export async function getPayment(req, res) {
  assertObjectId(req.params.id, "id");

  const payment = await PaymentModel.findById(req.params.id)
    .populate({ path: "invoiceId", select: "total status issuedAt" })
    .populate({ path: "customerId", select: "fullName phone" });

  if (!payment) {
    throw new HttpError(404, "payment not found");
  }

  res.json({ payment });
}
