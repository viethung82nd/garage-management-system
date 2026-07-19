import mongoose from "mongoose";
import { invoiceRepository } from "../repositories/invoice.repository.js";
import { paymentRepository } from "../repositories/payment.repository.js";
import { PAYMENT_METHODS } from "../models/payment.model.js";
import { ApiError } from "../utils/apiError.js";
import { charge } from "../utils/paymentGateway.js";
import { logAudit } from "../utils/audit.js";

/** Throws a 400 unless `id` is a well-formed Mongo ObjectId. */
function assertObjectId(id, label) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, `${label} is not a valid id`);
  }
}

/** Resolves the customer who owns an invoice, via its repair order's vehicle. */
async function resolveInvoiceCustomer(invoiceId) {
  return invoiceRepository.model.findById(invoiceId).populate({
    path: "repairOrderId",
    select: "vehicleId",
    populate: { path: "vehicleId", select: "customerId" },
  });
}

/**
 * Record a payment for an invoice through the mock gateway.
 *
 * Creates a pending payment, runs it through the gateway, then settles both the
 * payment status (succeeded/failed, with `paidAt`) and — on success — the
 * invoice's running `amountPaid`/status. `amount` may be less than the
 * remaining balance (a partial payment, e.g. a deposit); omitting it pays the
 * full remaining balance in one shot, same as before. It can never exceed the
 * remaining balance — the client can under-pay, never over-pay.
 */
export async function recordPayment({ invoiceId, method, amount, reference, simulate }, actorId) {
  assertObjectId(invoiceId, "invoiceId");
  if (!PAYMENT_METHODS.includes(method)) {
    throw new ApiError(400, `method must be one of: ${PAYMENT_METHODS.join(", ")}`);
  }

  const invoice = await resolveInvoiceCustomer(invoiceId);
  if (!invoice) {
    throw new ApiError(404, "invoice not found");
  }
  if (invoice.status === "paid") {
    throw new ApiError(409, "invoice is already paid");
  }
  if (invoice.status === "cancelled") {
    throw new ApiError(409, "invoice is cancelled");
  }

  const balanceDue = invoice.total - (invoice.amountPaid || 0);
  const chargeAmount = amount ?? balanceDue;
  if (typeof chargeAmount !== "number" || Number.isNaN(chargeAmount) || chargeAmount <= 0 || chargeAmount > balanceDue) {
    throw new ApiError(400, `amount must be a number between 0 and the remaining balance (${balanceDue})`);
  }

  const customerId = invoice.repairOrderId?.vehicleId?.customerId;
  if (!customerId) {
    throw new ApiError(422, "invoice has no associated customer");
  }

  const trimmedReference = typeof reference === "string" ? reference.trim() : "";

  // Record the attempt up front so a gateway failure still leaves an audit trail.
  const payment = await paymentRepository.create({
    invoiceId: invoice._id,
    customerId,
    amount: chargeAmount,
    method,
    reference: trimmedReference || undefined,
    status: "pending",
  });

  const result = await charge({ amount: chargeAmount, method, simulate });

  payment.status = result.status;
  payment.gatewayRef = result.gatewayRef;
  payment.gatewayPayload = result.payload;
  if (result.status === "succeeded") {
    payment.paidAt = new Date();
  }
  await payment.save();

  // Only a successful charge settles the invoice.
  if (result.status === "succeeded") {
    invoice.amountPaid = (invoice.amountPaid || 0) + chargeAmount;
    const remaining = invoice.total - invoice.amountPaid;
    invoice.status = remaining <= 0 ? "paid" : "partiallyPaid";
    await invoice.save();

    const refSuffix = trimmedReference ? ` (ref ${trimmedReference})` : "";
    await logAudit({
      action: "paymentRecorded",
      actorId,
      invoiceId: invoice._id,
      repairOrderId: invoice.repairOrderId?._id,
      details:
        remaining <= 0
          ? `${chargeAmount.toLocaleString("vi-VN")} ₫ via ${method} — paid in full${refSuffix}`
          : `${chargeAmount.toLocaleString("vi-VN")} ₫ via ${method} — ${remaining.toLocaleString("vi-VN")} ₫ remaining${refSuffix}`,
    });
  }

  return { payment, invoiceStatus: invoice.status };
}

/** List every payment attempt, newest first — the accountant's payments ledger. */
export async function listPayments() {
  const payments = await paymentRepository.model
    .find()
    .populate({ path: "invoiceId", select: "total status issuedAt" })
    .populate({ path: "customerId", select: "fullName phone" })
    .sort({ paidAt: -1, _id: -1 });

  return { payments };
}

/** Fetch a single payment with its invoice summary. */
export async function getPayment(id) {
  assertObjectId(id, "id");

  const payment = await paymentRepository.model
    .findById(id)
    .populate({ path: "invoiceId", select: "total status issuedAt" })
    .populate({ path: "customerId", select: "fullName phone" });

  if (!payment) {
    throw new ApiError(404, "payment not found");
  }

  return { payment };
}
