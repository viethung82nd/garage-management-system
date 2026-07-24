import mongoose from "mongoose";
import { invoiceRepository } from "../repositories/invoice.repository.js";
import { paymentRepository } from "../repositories/payment.repository.js";
import { repairOrderRepository } from "../repositories/repair-order.repository.js";
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { ApiError } from "../utils/apiError.js";
import { createNotification } from "../utils/notify.js";
import { sendEmail } from "../utils/mailer.js";
import { logAudit } from "../utils/audit.js";
import { generateCode } from "../utils/sequence.js";
import { PartModel } from "../models/index.js";

const INVOICE_TERM_DAYS = 15;

const invoicePopulate = [
  { path: "accountantId", select: "fullName email phone role" },
  {
    path: "repairOrderId",
    populate: [
      {
        path: "vehicleId",
        select: "licensePlate brand model year color chassisNumber engineNumber customerId lastKnownMileage",
        populate: { path: "customerId", select: "fullName phone email accountType role" },
      },
      { path: "advisorId", select: "fullName email phone role" },
      { path: "technicianId", select: "fullName email phone role" },
      // Needed so serializeInvoice() can read service.serviceId.category —
      // without this, serviceId stays an unpopulated ObjectId and every
      // line silently falls back to "no category".
      { path: "services.serviceId", select: "name category" },
    ],
  },
];

function formatDisplayId(prefix, value) {
  if (!value) {
    return "";
  }
  return `${prefix}-${String(value).slice(-6).toUpperCase()}`;
}

function serializePayment(payment) {
  if (!payment) {
    return null;
  }

  return {
    id: String(payment._id),
    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    paidAt: payment.paidAt,
    gatewayRef: payment.gatewayRef || null,
    reference: payment.reference || null,
  };
}

function serializeInvoice(invoice, latestPayment) {
  const order = invoice.repairOrderId;
  const vehicle = order?.vehicleId;
  const customer = vehicle?.customerId;

  return {
    id: String(invoice._id),
    displayId: formatDisplayId("INV", invoice._id),
    status: invoice.status,
    issuedAt: invoice.issuedAt,
    dueAt: invoice.dueAt || null,
    sentAt: invoice.sentAt || null,
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    taxAmount: invoice.taxAmount || 0,
    total: invoice.total,
    amountPaid: invoice.amountPaid || 0,
    balanceDue: invoice.total - (invoice.amountPaid || 0),
    quoteId: invoice.quoteId ? String(invoice.quoteId) : null,
    quotedTotal: invoice.quotedTotal ?? null,
    // Snapshot billing identity (name/tax code/address + vehicle/odometer) and
    // the demo e-invoice, so the invoice screen can show a compliant document
    // and its issue state.
    billing: invoice.billing
      ? {
          customerName: invoice.billing.customerName || null,
          taxCode: invoice.billing.taxCode || null,
          address: invoice.billing.address || null,
          vehiclePlate: invoice.billing.vehiclePlate || null,
          vehicleVin: invoice.billing.vehicleVin || null,
          odometer: invoice.billing.odometer ?? null,
        }
      : null,
    einvoice: invoice.einvoice?.status
      ? {
          status: invoice.einvoice.status,
          symbol: invoice.einvoice.symbol || null,
          number: invoice.einvoice.number || null,
          lookupCode: invoice.einvoice.lookupCode || null,
          issuedAt: invoice.einvoice.issuedAt || null,
        }
      : null,
    lineItems: invoice.lineItems.map((item, index) => ({
      id: `${invoice._id}-${index}`,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.quantity * item.unitPrice,
      kind: item.kind || "service",
      source: item.source || "quote",
    })),
    accountant: invoice.accountantId
      ? {
          id: String(invoice.accountantId._id),
          fullName: invoice.accountantId.fullName,
          email: invoice.accountantId.email || "",
          phone: invoice.accountantId.phone || "",
        }
      : null,
    repairOrder: order
      ? {
          id: String(order._id),
          displayId: formatDisplayId("RO", order._id),
          status: order.status,
          totalCost: order.totalCost ?? invoice.total,
          startedAt: order.startedAt || null,
          completedAt: order.completedAt || null,
          services: order.services.map((service, index) => ({
            id: String(service.serviceId?._id || `${order._id}-service-${index}`),
            name: service.name,
            quantity: service.quantity,
            priceAtTime: service.priceAtTime,
            category: service.serviceId?.category || "",
          })),
        }
      : null,
    customer: customer
      ? {
          id: String(customer._id),
          fullName: customer.fullName,
          phone: customer.phone || "",
          email: customer.email || "",
          accountType: customer.accountType,
        }
      : null,
    vehicle: vehicle
      ? {
          id: String(vehicle._id),
          licensePlate: vehicle.licensePlate,
          brand: vehicle.brand || "",
          model: vehicle.model || "",
          year: vehicle.year || null,
          color: vehicle.color || "",
          chassisNumber: vehicle.chassisNumber || "",
          engineNumber: vehicle.engineNumber || "",
          lastKnownMileage: vehicle.lastKnownMileage ?? null,
        }
      : null,
    serviceAdvisor: order?.advisorId
      ? {
          id: String(order.advisorId._id),
          fullName: order.advisorId.fullName,
          phone: order.advisorId.phone || "",
        }
      : null,
    technician: order?.technicianId
      ? {
          id: String(order.technicianId._id),
          fullName: order.technicianId.fullName,
          phone: order.technicianId.phone || "",
        }
      : null,
    latestPayment: serializePayment(latestPayment),
  };
}

/**
 * Total unpaid balance a customer is carrying across all their vehicles —
 * the figure a credit limit is checked against.
 */
async function sumOutstandingForCustomer(customerId) {
  const vehicles = await vehicleRepository.model.find({ customerId }).select("_id");
  if (vehicles.length === 0) return 0;
  const orders = await repairOrderRepository.model
    .find({ vehicleId: { $in: vehicles.map((v) => v._id) } })
    .select("_id");
  if (orders.length === 0) return 0;

  const rows = await invoiceRepository.aggregate([
    {
      $match: {
        repairOrderId: { $in: orders.map((o) => o._id) },
        status: { $in: ["unpaid", "partiallyPaid"] },
      },
    },
    { $group: { _id: null, outstanding: { $sum: { $subtract: ["$total", "$amountPaid"] } } } },
  ]);
  return rows[0]?.outstanding || 0;
}

async function getLatestPayments(invoiceIds) {
  if (invoiceIds.length === 0) {
    return new Map();
  }

  const payments = await paymentRepository.model
    .find({ invoiceId: { $in: invoiceIds } })
    .sort({ paidAt: -1, _id: -1 });

  const paymentMap = new Map();
  for (const payment of payments) {
    const key = String(payment.invoiceId);
    if (!paymentMap.has(key)) {
      paymentMap.set(key, payment);
    }
  }

  return paymentMap;
}

export async function listInvoices() {
  const invoices = await invoiceRepository.model
    .find()
    .populate(invoicePopulate)
    .sort({ issuedAt: -1 });

  const paymentMap = await getLatestPayments(invoices.map((invoice) => invoice._id));

  return {
    invoices: invoices.map((invoice) => serializeInvoice(invoice, paymentMap.get(String(invoice._id)))),
  };
}

export async function listMyInvoices(customerId) {
  const vehicles = await vehicleRepository.model.find({ customerId }).select("_id");
  const vehicleIds = vehicles.map((vehicle) => vehicle._id);

  if (vehicleIds.length === 0) {
    return { invoices: [] };
  }

  const repairOrders = await repairOrderRepository.model
    .find({ vehicleId: { $in: vehicleIds } })
    .select("_id");
  const repairOrderIds = repairOrders.map((order) => order._id);

  if (repairOrderIds.length === 0) {
    return { invoices: [] };
  }

  const invoices = await invoiceRepository.model
    .find({ repairOrderId: { $in: repairOrderIds } })
    .populate(invoicePopulate)
    .sort({ issuedAt: -1 });

  const paymentMap = await getLatestPayments(invoices.map((invoice) => invoice._id));

  return {
    invoices: invoices.map((invoice) => serializeInvoice(invoice, paymentMap.get(String(invoice._id)))),
  };
}

export async function getInvoiceById(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "invoice id is not a valid id");
  }

  const invoice = await invoiceRepository.model.findById(id).populate(invoicePopulate);
  if (!invoice) {
    throw new ApiError(404, "invoice not found");
  }

  const latestPayment = await paymentRepository.model
    .findOne({ invoiceId: invoice._id })
    .sort({ paidAt: -1, _id: -1 });

  return { invoice: serializeInvoice(invoice, latestPayment) };
}

/**
 * Generate an invoice from a completed repair order.
 *
 * Line items, subtotal and total are derived server-side from the order's
 * services. An optional discount may be applied. One invoice per repair order.
 */
export async function generateInvoiceFromRepairOrder({ repairOrderId, discount }, accountantId) {
  if (!mongoose.isValidObjectId(repairOrderId)) {
    throw new ApiError(400, "repairOrderId is not a valid id");
  }

  const order = await repairOrderRepository.findById(repairOrderId);
  if (!order) {
    throw new ApiError(404, "repair order not found");
  }

  // qcPassedAt, not status === "completed", is what actually authorizes
  // invoicing — a technician marking their own work "completed" is not a
  // quality check. See repair-order.service.js#submitQualityCheck.
  if (!order.qcPassedAt) {
    throw new ApiError(409, "repair order has not passed quality check");
  }

  const existing = await invoiceRepository.findOne({ repairOrderId });
  if (existing) {
    throw new ApiError(409, "invoice already exists for this repair order");
  }

  // A customer is entitled to know whether they were charged for a new, OEM,
  // reconditioned or used part, so the invoice carries each part's condition
  // rather than just a description and a price. Looked up in one batch.
  const partIds = order.services.map((s) => s.partId).filter(Boolean);
  const partConditions = new Map();
  if (partIds.length > 0) {
    const parts = await PartModel.find({ _id: { $in: partIds } }).select("condition");
    for (const part of parts) {
      partConditions.set(String(part._id), part.condition);
    }
  }

  const lineItems = order.services.map((s) => ({
    description: s.name,
    quantity: s.quantity,
    unitPrice: s.priceAtTime,
    kind: s.kind || "service",
    partId: s.partId || undefined,
    partCondition: s.partId ? partConditions.get(String(s.partId)) : undefined,
    source: s.source || "quote",
  }));

  const subtotal = lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  // Default to the discount the SA already quoted the customer, so the
  // invoice matches the quote unless the accountant deliberately overrides
  // it. Orders with no linked quote fall back to 0 (today's behavior).
  const defaultDiscount = Math.round((subtotal * (order.quotedDiscountPercent || 0)) / 100);
  const appliedDiscount = discount ?? defaultDiscount;
  if (
    typeof appliedDiscount !== "number" ||
    Number.isNaN(appliedDiscount) ||
    appliedDiscount < 0 ||
    appliedDiscount > subtotal
  ) {
    throw new ApiError(400, "discount must be a number between 0 and the subtotal");
  }

  const taxAmount = Math.round(((subtotal - appliedDiscount) * (order.quotedTaxPercent || 0)) / 100);
  const total = subtotal - appliedDiscount + taxAmount;
  const issuedAt = new Date();
  const dueAt = new Date(issuedAt.getTime() + INVOICE_TERM_DAYS * 24 * 60 * 60 * 1000);

  // Snapshot who and what is being billed, so the invoice stays correct even
  // if the customer or vehicle record changes later. A company customer's tax
  // identity (needed on a VAT invoice) comes from their profile; the vehicle
  // and odometer make the invoice a complete record of the job.
  const vehicle = await vehicleRepository.model
    .findById(order.vehicleId)
    .populate("customerId", "fullName taxCode billingName billingAddress creditLimit");
  const customer = vehicle?.customerId;

  // Credit control. A creditLimit of 0 is an ordinary cash customer — no credit
  // extended, and the paid-before-handover gate already covers them, so the
  // check is skipped. A trade customer with a positive limit may carry unpaid
  // invoices up to it; once their outstanding balance has reached the limit,
  // more billable work is refused until they settle up (BR-ACC-03).
  if (customer?.creditLimit > 0) {
    const outstanding = await sumOutstandingForCustomer(customer._id);
    if (outstanding >= customer.creditLimit) {
      throw new ApiError(
        409,
        `Customer is at their credit limit (${outstanding.toLocaleString("vi-VN")} ₫ outstanding of ${customer.creditLimit.toLocaleString("vi-VN")} ₫). Settle outstanding invoices before billing more work.`,
      );
    }
  }
  const billing = {
    customerName: customer?.billingName || customer?.fullName,
    taxCode: customer?.taxCode,
    address: customer?.billingAddress,
    vehiclePlate: vehicle?.licensePlate,
    vehicleVin: vehicle?.chassisNumber,
    odometer: vehicle?.lastKnownMileage,
  };

  const invoice = await invoiceRepository.create({
    code: await generateCode("INV"),
    repairOrderId,
    accountantId,
    lineItems,
    subtotal,
    discount: appliedDiscount,
    taxAmount,
    total,
    status: "unpaid",
    issuedAt,
    dueAt,
    billing,
    quoteId: order.quoteId || undefined,
    quotedTotal: order.quotedTotal ?? undefined,
  });

  await invoice.populate(invoicePopulate);

  order.invoicedAt = issuedAt;
  await order.save();

  await logAudit({
    action: "invoiceGenerated",
    actorId: accountantId,
    invoiceId: invoice._id,
    repairOrderId,
    details: `${invoice.code || formatDisplayId("INV", invoice._id)} generated for ${total.toLocaleString("vi-VN")} ₫`,
  });

  return { invoice: serializeInvoice(invoice, null) };
}

/**
 * Issues a legal e-invoice for an existing invoice — DEMO ONLY.
 *
 * Vietnam requires a registered e-invoice carrying a symbol, a number and a
 * lookup code, normally minted by an authorised provider that reports to the
 * tax authority. This mints those values locally so the full lifecycle (issue,
 * then adjust/replace on a correction) can be shown end to end, WITHOUT any
 * real external call — the scope decision for this project. Swapping the mint
 * step for a provider SDK is the only change a real integration would need.
 */
export async function issueEInvoice(id, actorId) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "invoice id is not a valid id");
  }

  const invoice = await invoiceRepository.model.findById(id);
  if (!invoice) {
    throw new ApiError(404, "invoice not found");
  }
  if (invoice.einvoice?.status && invoice.einvoice.status !== "none") {
    throw new ApiError(409, `An e-invoice has already been issued for this invoice (${invoice.einvoice.status})`);
  }

  const now = new Date();
  // Symbol format mirrors the real one (e.g. "C26TAA"): 1 letter + 2-digit
  // year + a series code. The number is a monthly sequence, the lookup code a
  // random token a customer could "verify" against the mock portal.
  const seq = await generateCode("EINV", { date: now, pad: 8 });
  invoice.einvoice = {
    status: "issued",
    symbol: `C${String(now.getFullYear()).slice(-2)}TAA`,
    number: seq.split("-").pop(),
    lookupCode: `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
    issuedAt: now,
  };
  await invoice.save();

  await logAudit({
    action: "invoiceGenerated",
    actorId,
    invoiceId: invoice._id,
    repairOrderId: invoice.repairOrderId,
    details: `E-invoice issued: ${invoice.einvoice.symbol} No.${invoice.einvoice.number} (lookup ${invoice.einvoice.lookupCode})`,
  });

  await invoice.populate(invoicePopulate);
  return { invoice: serializeInvoice(invoice, null) };
}

/**
 * Email the invoice to the customer and record an in-app notification. Marks
 * sentAt regardless of whether the email actually went out (SMTP may not be
 * configured), since the notification itself is the primary "customer was
 * informed" signal.
 */
export async function sendInvoiceToCustomer(id, actorId) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "invoice id is not a valid id");
  }

  const invoice = await invoiceRepository.model.findById(id).populate(invoicePopulate);
  if (!invoice) {
    throw new ApiError(404, "invoice not found");
  }

  const vehicle = invoice.repairOrderId?.vehicleId;
  const customer = vehicle?.customerId;
  const hasEmailOnFile = Boolean(customer?.email);

  if (customer) {
    await createNotification({
      userId: customer._id,
      type: "invoiceSent",
      title: "Invoice ready",
      message: `Your invoice for ${vehicle.licensePlate || "your vehicle"} is ready — total ${invoice.total.toLocaleString("vi-VN")} ₫.`,
      refId: invoice.repairOrderId._id,
      refModel: "RepairOrder",
    });

    if (hasEmailOnFile) {
      // Fire-and-forget — see quotation.service.js's sendQuotation() for why
      // this must not block the request on a slow/unreachable SMTP server.
      void sendEmail({
        to: customer.email,
        subject: `Invoice ${formatDisplayId("INV", invoice._id)} — ${invoice.total.toLocaleString("vi-VN")} ₫`,
        html: `<p>Hi ${customer.fullName || "there"},</p><p>Your invoice for <strong>${vehicle.brand || ""} ${vehicle.model || ""} (${vehicle.licensePlate || ""})</strong> is ready.</p><p>Total due: <strong>${invoice.total.toLocaleString("vi-VN")} ₫</strong></p><p>Please settle at the service desk or by bank transfer as agreed.</p>`,
      }).catch(() => {});
    }
  }

  invoice.sentAt = new Date();
  await invoice.save();

  await logAudit({
    action: "invoiceSent",
    actorId,
    invoiceId: invoice._id,
    repairOrderId: invoice.repairOrderId?._id,
    details: `${formatDisplayId("INV", invoice._id)} sent to ${customer?.fullName || "customer"}`,
  });

  const latestPayment = await paymentRepository.model
    .findOne({ invoiceId: invoice._id })
    .sort({ paidAt: -1, _id: -1 });

  return { invoice: serializeInvoice(invoice, latestPayment), hasEmailOnFile };
}
