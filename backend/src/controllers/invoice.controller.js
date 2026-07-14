import mongoose from "mongoose";
import {
  InvoiceModel,
  PaymentModel,
  RepairOrderModel,
  VehicleModel,
} from "../models/index.js";
import { HttpError } from "../middleware/error.js";
import { createNotification } from "../utils/notify.js";
import { sendEmail } from "../utils/mailer.js";

const invoicePopulate = [
  { path: "accountantId", select: "fullName email phone role" },
  {
    path: "repairOrderId",
    populate: [
      {
        path: "vehicleId",
        select: "licensePlate brand model year color chassisNumber engineNumber customerId",
        populate: {
          path: "customerId",
          select: "fullName phone email accountType role",
        },
      },
      { path: "advisorId", select: "fullName email phone role" },
      { path: "technicianId", select: "fullName email phone role" },
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
    sentAt: invoice.sentAt || null,
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    total: invoice.total,
    lineItems: invoice.lineItems.map((item, index) => ({
      id: `${invoice._id}-${index}`,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.quantity * item.unitPrice,
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

  const payments = await PaymentModel.find({
    invoiceId: { $in: invoiceIds },
  }).sort({ paidAt: -1, _id: -1 });

  const paymentMap = new Map();
  for (const payment of payments) {
    const key = String(payment.invoiceId);
    if (!paymentMap.has(key)) {
      paymentMap.set(key, payment);
    }
  }

  return paymentMap;
}

export async function listInvoices(_req, res) {
  const invoices = await InvoiceModel.find()
    .populate(invoicePopulate)
    .sort({ issuedAt: -1 });

  const paymentMap = await getLatestPayments(invoices.map((invoice) => invoice._id));

  res.json({
    invoices: invoices.map((invoice) =>
      serializeInvoice(invoice, paymentMap.get(String(invoice._id))),
    ),
  });
}

export async function listMyInvoices(req, res) {
  const vehicles = await VehicleModel.find({ customerId: req.user.sub }).select("_id");
  const vehicleIds = vehicles.map((vehicle) => vehicle._id);

  if (vehicleIds.length === 0) {
    res.json({ invoices: [] });
    return;
  }

  const repairOrders = await RepairOrderModel.find({
    vehicleId: { $in: vehicleIds },
  }).select("_id");
  const repairOrderIds = repairOrders.map((order) => order._id);

  if (repairOrderIds.length === 0) {
    res.json({ invoices: [] });
    return;
  }

  const invoices = await InvoiceModel.find({
    repairOrderId: { $in: repairOrderIds },
  })
    .populate(invoicePopulate)
    .sort({ issuedAt: -1 });

  const paymentMap = await getLatestPayments(invoices.map((invoice) => invoice._id));

  res.json({
    invoices: invoices.map((invoice) =>
      serializeInvoice(invoice, paymentMap.get(String(invoice._id))),
    ),
  });
}

export async function getInvoiceById(req, res) {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(400, "invoice id is not a valid id");
  }

  const invoice = await InvoiceModel.findById(id).populate(invoicePopulate);
  if (!invoice) {
    throw new HttpError(404, "invoice not found");
  }

  const latestPayment = await PaymentModel.findOne({ invoiceId: invoice._id }).sort({
    paidAt: -1,
    _id: -1,
  });

  res.json({ invoice: serializeInvoice(invoice, latestPayment) });
}

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
    throw new HttpError(
      400,
      "discount must be a number between 0 and the subtotal",
    );
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

  await invoice.populate(invoicePopulate);

  res.status(201).json({
    invoice: serializeInvoice(invoice, null),
  });
}

/**
 * PATCH /api/invoices/:id/send — email the invoice to the customer and
 * record an in-app notification. Marks sentAt regardless of whether the
 * email actually went out (SMTP may not be configured), since the
 * notification itself is the primary "customer was informed" signal.
 */
export async function sendInvoiceToCustomer(req, res) {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(400, "invoice id is not a valid id");
  }

  const invoice = await InvoiceModel.findById(id).populate(invoicePopulate);
  if (!invoice) {
    throw new HttpError(404, "invoice not found");
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

  const latestPayment = await PaymentModel.findOne({ invoiceId: invoice._id }).sort({
    paidAt: -1,
    _id: -1,
  });

  res.json({ invoice: serializeInvoice(invoice, latestPayment) });
}
