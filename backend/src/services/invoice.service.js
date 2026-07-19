import mongoose from "mongoose";
import { invoiceRepository } from "../repositories/invoice.repository.js";
import { paymentRepository } from "../repositories/payment.repository.js";
import { repairOrderRepository } from "../repositories/repair-order.repository.js";
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { ApiError } from "../utils/apiError.js";
import { createNotification } from "../utils/notify.js";
import { sendEmail } from "../utils/mailer.js";
import { logAudit } from "../utils/audit.js";

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

  if (order.status !== "completed") {
    throw new ApiError(409, "repair order is not completed");
  }

  const existing = await invoiceRepository.findOne({ repairOrderId });
  if (existing) {
    throw new ApiError(409, "invoice already exists for this repair order");
  }

  const lineItems = order.services.map((s) => ({
    description: s.name,
    quantity: s.quantity,
    unitPrice: s.priceAtTime,
    kind: s.kind || "service",
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

  const invoice = await invoiceRepository.create({
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
    quoteId: order.quoteId || undefined,
    quotedTotal: order.quotedTotal ?? undefined,
  });

  await invoice.populate(invoicePopulate);

  await logAudit({
    action: "invoiceGenerated",
    actorId: accountantId,
    invoiceId: invoice._id,
    repairOrderId,
    details: `${formatDisplayId("INV", invoice._id)} generated for ${total.toLocaleString("vi-VN")} ₫`,
  });

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

  if (customer) {
    await createNotification({
      userId: customer._id,
      type: "invoiceSent",
      title: "Invoice ready",
      message: `Your invoice for ${vehicle.licensePlate || "your vehicle"} is ready — total ${invoice.total.toLocaleString("vi-VN")} ₫.`,
      refId: invoice.repairOrderId._id,
      refModel: "RepairOrder",
    });

    if (customer.email) {
      await sendEmail({
        to: customer.email,
        subject: `Invoice ${formatDisplayId("INV", invoice._id)} — ${invoice.total.toLocaleString("vi-VN")} ₫`,
        html: `<p>Hi ${customer.fullName || "there"},</p><p>Your invoice for <strong>${vehicle.brand || ""} ${vehicle.model || ""} (${vehicle.licensePlate || ""})</strong> is ready.</p><p>Total due: <strong>${invoice.total.toLocaleString("vi-VN")} ₫</strong></p><p>Please settle at the service desk or by bank transfer as agreed.</p>`,
      });
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

  return { invoice: serializeInvoice(invoice, latestPayment) };
}
