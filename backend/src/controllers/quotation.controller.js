import { RepairOrderModel, ServiceModel, ServiceQuoteModel, UserModel } from "../models/index.js";
import { HttpError } from "../middleware/error.js";
import { createNotification } from "../utils/notify.js";
import { sendEmail } from "../utils/mailer.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;

function calculateTotal({ lines, discountPercent, taxPercent }) {
  const subtotal = (lines || []).reduce(
    (sum, line) => sum + (Number(line.unitPrice) || 0) * (Number(line.quantity) || 0),
    0,
  );
  const afterDiscount = subtotal * (1 - (Number(discountPercent) || 0) / 100);
  return Math.round(afterDiscount * (1 + (Number(taxPercent) || 0) / 100));
}

/**
 * POST /api/quotations — create (or save as draft) a quotation against an
 * existing repair order. repairOrderId is now a real, required link (the SA
 * UI picks it up from ?orderId= rather than typing it) — customer/vehicle
 * details are read server-side from that order's vehicle/customer chain
 * instead of trusting hand-typed strings, so they can't silently drift from
 * what Reception/Inspection recorded.
 */
export async function createQuotation(req, res) {
  const {
    code,
    repairOrderId,
    lines,
    discountPercent,
    taxPercent,
    note,
    validUntil,
    status,
  } = req.body ?? {};

  if (!repairOrderId || !OID_RE.test(repairOrderId)) {
    throw new HttpError(400, "A valid repairOrderId is required");
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new HttpError(400, "At least one line item is required");
  }

  const repairOrder = await RepairOrderModel.findById(repairOrderId).populate({
    path: "vehicleId",
    populate: { path: "customerId", select: "fullName phone" },
  });
  if (!repairOrder) {
    throw new HttpError(404, "Repair order not found");
  }
  const vehicle = repairOrder.vehicleId;
  const customer = vehicle?.customerId;

  const quote = await ServiceQuoteModel.create({
    code: code?.trim() || `QT-${Date.now()}`,
    repairOrderId,
    vehicleId: vehicle?._id,
    customerId: customer?._id,
    advisorId: req.user.sub,
    customerName: customer?.fullName,
    customerPhone: customer?.phone,
    vehicleName: [vehicle?.brand, vehicle?.model].filter(Boolean).join(" "),
    vehiclePlate: vehicle?.licensePlate,
    lines,
    discountPercent,
    taxPercent,
    totalEstimate: calculateTotal({ lines, discountPercent, taxPercent }),
    note,
    validUntil: validUntil ? new Date(validUntil) : undefined,
    status: status === "sent" ? "sent" : "draft",
  });

  res.status(201).json(quote);
}

/**
 * PATCH /api/quotations/:id — update a draft's line items/terms in place.
 * Only drafts can be edited; once sent, the customer is looking at a fixed
 * quote and it shouldn't change out from under them.
 */
export async function updateQuotation(req, res) {
  const { id } = req.params;
  const { lines, discountPercent, taxPercent, note, validUntil } = req.body ?? {};

  if (!OID_RE.test(id)) {
    throw new HttpError(400, "Invalid quotation ID format");
  }

  const quote = await ServiceQuoteModel.findById(id);
  if (!quote) {
    throw new HttpError(404, "Quotation not found");
  }
  if (quote.status !== "draft") {
    throw new HttpError(409, "Only a draft quotation can be edited");
  }
  if (lines !== undefined && (!Array.isArray(lines) || lines.length === 0)) {
    throw new HttpError(400, "At least one line item is required");
  }

  if (lines !== undefined) quote.lines = lines;
  if (discountPercent !== undefined) quote.discountPercent = discountPercent;
  if (taxPercent !== undefined) quote.taxPercent = taxPercent;
  if (note !== undefined) quote.note = note;
  if (validUntil !== undefined) quote.validUntil = new Date(validUntil);
  quote.totalEstimate = calculateTotal({
    lines: quote.lines,
    discountPercent: quote.discountPercent,
    taxPercent: quote.taxPercent,
  });

  await quote.save();
  res.json(quote);
}

/** PATCH /api/quotations/:id/send — mark a quotation sent, notify the customer. */
export async function sendQuotation(req, res) {
  const { id } = req.params;
  if (!OID_RE.test(id)) {
    throw new HttpError(400, "Invalid quotation ID format");
  }

  const quote = await ServiceQuoteModel.findById(id);
  if (!quote) {
    throw new HttpError(404, "Quotation not found");
  }
  if (quote.status !== "draft") {
    throw new HttpError(409, `Only a draft quotation can be sent (this one is ${quote.status})`);
  }

  quote.status = "sent";
  await quote.save();

  // repairOrderId is now always a real link (set server-side in
  // createQuotation from the order's vehicle), so customerId is always
  // resolvable — no more phone-matching fallback needed.
  const customer = quote.customerId ? await UserModel.findById(quote.customerId) : null;

  if (customer) {
    await createNotification({
      userId: customer._id,
      type: "quotationSent",
      title: "New repair quote",
      message: `Your quote for ${quote.vehicleName || "your vehicle"} is ready to review.`,
      refId: quote.repairOrderId,
      refModel: "RepairOrder",
    });

    if (customer.email) {
      await sendEmail({
        to: customer.email,
        subject: `Your repair quote ${quote.code} is ready`,
        html: `<p>Hi ${customer.fullName || "there"},</p><p>Your quote for <strong>${quote.vehicleName || "your vehicle"}</strong> (${quote.vehiclePlate || ""}) is ready — total estimate <strong>${quote.totalEstimate?.toLocaleString("vi-VN")} ₫</strong>.</p><p>Please log in to your account to review and approve it.</p>`,
      });
    }
  }

  res.json(quote);
}

/**
 * PATCH /api/quotations/:id/confirm — "Record confirmation of Customer": the
 * SA logs what the customer decided (e.g. over the phone), not a
 * customer-facing self-service action. Approving is what actually populates
 * the linked RepairOrder's services/totalCost — this is the one place a
 * Quotation's line items become the Repair Order's line items, instead of
 * the SA retyping them a second time on the assignment page.
 * Body: { approved: boolean }
 */
export async function confirmQuotation(req, res) {
  const { id } = req.params;
  const { approved } = req.body ?? {};

  if (!OID_RE.test(id)) {
    throw new HttpError(400, "Invalid quotation ID format");
  }
  if (typeof approved !== "boolean") {
    throw new HttpError(400, "approved (boolean) is required");
  }

  const quote = await ServiceQuoteModel.findById(id);
  if (!quote) {
    throw new HttpError(404, "Quotation not found");
  }
  if (quote.status !== "sent") {
    throw new HttpError(409, "Only a sent quotation can be confirmed");
  }

  quote.status = approved ? "approved" : "rejected";
  await quote.save();

  if (approved) {
    const order = await RepairOrderModel.findById(quote.repairOrderId);
    if (order) {
      const processedServices = [];
      let totalCost = 0;

      for (const line of quote.lines) {
        let name = line.description;
        let priceAtTime = Number(line.unitPrice) || 0;

        if (line.serviceId) {
          const serviceDoc = await ServiceModel.findById(line.serviceId);
          if (serviceDoc) name = serviceDoc.name;
        }

        const quantity = Number(line.quantity) || 1;
        processedServices.push({
          serviceId: line.serviceId || undefined,
          name: name || "Line item",
          priceAtTime,
          quantity,
        });
        totalCost += priceAtTime * quantity;
      }

      order.services = processedServices;
      order.totalCost = totalCost;
      await order.save();
    }
  }

  res.json(quote);
}

/** GET /api/quotations?repairOrderId= — list quotations, optionally scoped. */
export async function listQuotations(req, res) {
  const { repairOrderId } = req.query;
  const filter = {};
  if (repairOrderId) {
    if (!OID_RE.test(repairOrderId)) {
      throw new HttpError(400, "Invalid repairOrderId format");
    }
    filter.repairOrderId = repairOrderId;
  }

  const quotes = await ServiceQuoteModel.find(filter).sort({ createdAt: -1 });
  res.json({ quotations: quotes });
}
