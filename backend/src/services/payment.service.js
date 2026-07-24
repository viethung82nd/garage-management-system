import mongoose from "mongoose";
import { invoiceRepository } from "../repositories/invoice.repository.js";
import { paymentRepository } from "../repositories/payment.repository.js";
import { PAYMENT_METHODS } from "../models/payment.model.js";
import { ApiError } from "../utils/apiError.js";
import { charge } from "../utils/paymentGateway.js";
import { logAudit } from "../utils/audit.js";

/**
 * The mock gateway's outcome can be forced via `simulate` ("succeeded"/"fail"),
 * which exists purely so automated tests and manual QA can exercise the
 * failure path deterministically. That is NOT something an API request body
 * may control — a client sending `{"simulate":"succeeded"}` must never be
 * able to mark an invoice paid without a real charge. The only sanctioned
 * source is the `PAYMENT_SIMULATE` server env var, and even that is ignored
 * outright in production so a misconfigured env can't silently fake charges
 * on a live deployment.
 */
function resolveSimulateOverride() {
  if (process.env.NODE_ENV === "production") {
    return undefined;
  }
  return process.env.PAYMENT_SIMULATE || undefined;
}

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
 *
 * Note there is no `simulate` param here even though `charge()` accepts one:
 * that flag must never be attacker/caller-controlled (it can force the mock
 * gateway to fabricate a "succeeded" charge, settling an invoice with no real
 * payment), so it is deliberately NOT part of this function's request-shaped
 * params. See `resolveSimulateOverride` below for the only sanctioned source.
 */
export async function recordPayment({ invoiceId, method, amount, reference }, actorId) {
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

  const result = await charge({ amount: chargeAmount, method, simulate: resolveSimulateOverride() });

  payment.status = result.status;
  payment.gatewayRef = result.gatewayRef;
  payment.gatewayPayload = result.payload;
  if (result.status === "succeeded") {
    payment.paidAt = new Date();
  }
  await payment.save();

  // Only a successful charge settles the invoice.
  let invoiceStatus = invoice.status;
  if (result.status === "succeeded") {
    // Settle atomically. The previous code read amountPaid into memory, added
    // to it and saved — so two payments landing together each read the old
    // total and the second overwrote the first, losing a payment. This applies
    // the increment and recomputes status server-side in one operation, and the
    // $expr guard refuses an increment that would push past the total (two
    // payments can both clear the up-front balance check under concurrency).
    const settled = await invoiceRepository.model.findOneAndUpdate(
      {
        _id: invoice._id,
        $expr: { $lte: [{ $add: ["$amountPaid", chargeAmount] }, "$total"] },
      },
      [
        { $set: { amountPaid: { $add: ["$amountPaid", chargeAmount] } } },
        {
          $set: {
            status: { $cond: [{ $gte: ["$amountPaid", "$total"] }, "paid", "partiallyPaid"] },
          },
        },
      ],
      { new: true },
    );

    if (!settled) {
      // Another payment settled the balance first. Void this charge rather than
      // overshoot the invoice.
      payment.status = "refunded";
      payment.gatewayPayload = {
        ...(payment.gatewayPayload || {}),
        voided: "would exceed invoice balance",
      };
      await payment.save();
      throw new ApiError(409, "This payment would exceed the invoice balance and was not applied");
    }

    invoiceStatus = settled.status;
    const remaining = settled.total - settled.amountPaid;
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

  return { payment, invoiceStatus };
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
