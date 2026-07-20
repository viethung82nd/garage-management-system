import { serviceQuoteRepository } from "../repositories/service-quote.repository.js";
import { repairOrderRepository } from "../repositories/repair-order.repository.js";
import { serviceRepository } from "../repositories/service.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { ApiError } from "../utils/apiError.js";
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
 * Create (or save as draft) a quotation against an existing repair order.
 * repairOrderId is a real, required link (the SA UI picks it up from
 * ?orderId= rather than typing it) — customer/vehicle details are read
 * server-side from that order's vehicle/customer chain instead of trusting
 * hand-typed strings, so they can't silently drift from what
 * Reception/Inspection recorded.
 */
export async function createQuotation(
  { code, repairOrderId, lines, discountPercent, taxPercent, note, validUntil, status },
  advisorId,
) {
  if (!repairOrderId || !OID_RE.test(repairOrderId)) {
    throw new ApiError(400, "A valid repairOrderId is required");
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new ApiError(400, "At least one line item is required");
  }

  const repairOrder = await repairOrderRepository.model.findById(repairOrderId).populate({
    path: "vehicleId",
    populate: { path: "customerId", select: "fullName phone" },
  });
  if (!repairOrder) {
    throw new ApiError(404, "Repair order not found");
  }
  const vehicle = repairOrder.vehicleId;
  const customer = vehicle?.customerId;

  return serviceQuoteRepository.create({
    code: code?.trim() || `QT-${Date.now()}`,
    repairOrderId,
    vehicleId: vehicle?._id,
    customerId: customer?._id,
    advisorId,
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
}

/**
 * Update a draft's line items/terms in place. Only drafts can be edited;
 * once sent, the customer is looking at a fixed quote and it shouldn't
 * change out from under them.
 */
export async function updateQuotation(id, { lines, discountPercent, taxPercent, note, validUntil }) {
  if (!OID_RE.test(id)) {
    throw new ApiError(400, "Invalid quotation ID format");
  }

  const quote = await serviceQuoteRepository.findById(id);
  if (!quote) {
    throw new ApiError(404, "Quotation not found");
  }
  if (quote.status !== "draft") {
    throw new ApiError(409, "Only a draft quotation can be edited");
  }
  if (lines !== undefined && (!Array.isArray(lines) || lines.length === 0)) {
    throw new ApiError(400, "At least one line item is required");
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
  return quote;
}

/** Mark a quotation sent, notify the customer. */
export async function sendQuotation(id) {
  if (!OID_RE.test(id)) {
    throw new ApiError(400, "Invalid quotation ID format");
  }

  const quote = await serviceQuoteRepository.findById(id);
  if (!quote) {
    throw new ApiError(404, "Quotation not found");
  }
  if (quote.status !== "draft") {
    throw new ApiError(409, `Only a draft quotation can be sent (this one is ${quote.status})`);
  }

  quote.status = "sent";
  await quote.save();

  // repairOrderId is always a real link (set server-side in createQuotation
  // from the order's vehicle), so customerId is always resolvable — no more
  // phone-matching fallback needed.
  const customer = quote.customerId ? await userRepository.findById(quote.customerId) : null;
  const hasEmailOnFile = Boolean(customer?.email);

  if (customer) {
    await createNotification({
      userId: customer._id,
      type: "quotationSent",
      title: "New repair quote",
      message: `Your quote for ${quote.vehicleName || "your vehicle"} is ready to review.`,
      refId: quote.repairOrderId,
      refModel: "RepairOrder",
    });

    if (hasEmailOnFile) {
      // Fire-and-forget: sendEmail already swallows its own errors, and the
      // customer was already informed via the in-app notification above — no
      // caller should have "Send quote" hang on a slow/unreachable SMTP server.
      void sendEmail({
        to: customer.email,
        subject: `Your repair quote ${quote.code} is ready`,
        html: `<p>Hi ${customer.fullName || "there"},</p><p>Your quote for <strong>${quote.vehicleName || "your vehicle"}</strong> (${quote.vehiclePlate || ""}) is ready — total estimate <strong>${quote.totalEstimate?.toLocaleString("vi-VN")} ₫</strong>.</p><p>Please log in to your account to review and approve it.</p>`,
      }).catch(() => {});
    }
  }

  // hasEmailOnFile tells the SA whether an email was actually attempted —
  // the customer was often created as a walk-in with no email at all, in
  // which case "Send quote" silently only ever notified them in-app.
  return { quote, hasEmailOnFile };
}

/**
 * "Record confirmation of Customer": the SA logs what the customer decided
 * (e.g. over the phone), not a customer-facing self-service action.
 * Approving is what actually populates the linked RepairOrder's
 * services/totalCost — this is the one place a Quotation's line items become
 * the Repair Order's line items, instead of the SA retyping them a second
 * time on the assignment page.
 */
export async function confirmQuotation(id, approved) {
  if (!OID_RE.test(id)) {
    throw new ApiError(400, "Invalid quotation ID format");
  }
  if (typeof approved !== "boolean") {
    throw new ApiError(400, "approved (boolean) is required");
  }

  const quote = await serviceQuoteRepository.findById(id);
  if (!quote) {
    throw new ApiError(404, "Quotation not found");
  }
  if (quote.status !== "sent") {
    throw new ApiError(409, "Only a sent quotation can be confirmed");
  }

  quote.status = approved ? "approved" : "rejected";
  await quote.save();

  if (approved) {
    const order = await repairOrderRepository.findById(quote.repairOrderId);
    if (order) {
      const processedServices = [];
      let totalCost = 0;

      for (const line of quote.lines) {
        let name = line.description;
        const priceAtTime = Number(line.unitPrice) || 0;

        if (line.serviceId) {
          const serviceDoc = await serviceRepository.findById(line.serviceId);
          if (serviceDoc) name = serviceDoc.name;
        }

        const quantity = Number(line.quantity) || 1;
        processedServices.push({
          serviceId: line.serviceId || undefined,
          name: name || "Line item",
          priceAtTime,
          quantity,
          kind: line.kind || "service",
          source: "quote",
        });
        totalCost += priceAtTime * quantity;
      }

      order.services = processedServices;
      order.totalCost = totalCost;
      // Snapshot the quote's discount/tax/total — these live only on the
      // ServiceQuote and would otherwise be lost the moment it's approved,
      // leaving the eventual invoice with no way to match what was quoted.
      order.quoteId = quote._id;
      order.quotedDiscountPercent = quote.discountPercent;
      order.quotedTaxPercent = quote.taxPercent;
      order.quotedTotal = quote.totalEstimate;
      await order.save();
    }
  }

  return quote;
}

/** Fetch a single quotation — read access extended to the accountant role so
 *  they can cross-check an invoice against what was originally quoted. */
export async function getQuotationById(id) {
  if (!OID_RE.test(id)) {
    throw new ApiError(400, "Invalid quotation ID format");
  }

  const quote = await serviceQuoteRepository.findById(id);
  if (!quote) {
    throw new ApiError(404, "Quotation not found");
  }

  return quote;
}

/** List quotations, optionally scoped to a repair order. */
export async function listQuotations({ repairOrderId }) {
  const filter = {};
  if (repairOrderId) {
    if (!OID_RE.test(repairOrderId)) {
      throw new ApiError(400, "Invalid repairOrderId format");
    }
    filter.repairOrderId = repairOrderId;
  }

  const quotes = await serviceQuoteRepository.model.find(filter).sort({ createdAt: -1 });
  return { quotations: quotes };
}
