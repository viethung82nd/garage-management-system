import { RepairOrderModel, ServiceQuoteModel, UserModel } from "../models/index.js";
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

/** POST /api/quotations — create (or save as draft) a quotation. */
export async function createQuotation(req, res) {
  const {
    code,
    repairOrderId,
    customerName,
    customerPhone,
    vehicleName,
    vehiclePlate,
    lines,
    discountPercent,
    taxPercent,
    note,
    validUntil,
    status,
  } = req.body ?? {};

  if (!Array.isArray(lines) || lines.length === 0) {
    throw new HttpError(400, "At least one line item is required");
  }

  // repairOrderId is a free-text field in the SA's quotation form (its own
  // placeholder shows a human-readable example like "RO-2026-0882"), not a
  // picker bound to a real order — treat anything that isn't a real ObjectId
  // as "no repair order linked" instead of rejecting the whole quotation.
  const validRepairOrderId = repairOrderId && OID_RE.test(repairOrderId) ? repairOrderId : undefined;

  let customerId;
  if (validRepairOrderId) {
    const repairOrder = await RepairOrderModel.findById(validRepairOrderId).populate(
      "vehicleId",
      "customerId",
    );
    customerId = repairOrder?.vehicleId?.customerId;
  }

  const quote = await ServiceQuoteModel.create({
    code: code?.trim() || `QT-${Date.now()}`,
    repairOrderId: validRepairOrderId,
    customerId,
    advisorId: req.user.sub,
    customerName,
    customerPhone,
    vehicleName,
    vehiclePlate,
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

  quote.status = "sent";
  await quote.save();

  // customerId is only set when repairOrderId (a free-text field in the SA
  // form) happened to resolve to a real repair order at creation time — fall
  // back to matching the customer by phone, the same de-dup key
  // resolveCustomer() uses for walk-ins/bookings.
  let customer = null;
  if (quote.customerId) {
    customer = await UserModel.findById(quote.customerId);
  } else if (quote.customerPhone) {
    customer = await UserModel.findOne({
      phone: quote.customerPhone,
      role: { $in: ["onlineCustomer", "walkInCustomer"] },
    });
  }

  if (customer) {
    await createNotification({
      userId: customer._id,
      type: "quotationSent",
      title: "New repair quote",
      message: `Your quote for ${quote.vehicleName || "your vehicle"} is ready to review.`,
      refId: quote.repairOrderId,
      refModel: quote.repairOrderId ? "RepairOrder" : undefined,
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
