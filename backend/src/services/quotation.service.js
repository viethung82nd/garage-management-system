import { serviceQuoteRepository } from "../repositories/service-quote.repository.js";
import { repairOrderRepository } from "../repositories/repair-order.repository.js";
import { serviceRepository } from "../repositories/service.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { ApiError } from "../utils/apiError.js";
import { createNotification } from "../utils/notify.js";
import { sendEmail } from "../utils/mailer.js";
import { renderEmailLayout, SITE_URL } from "../utils/emailTemplate.js";
import { renderQuotationPdf } from "../utils/pdfDocuments.js";
import { runInTransaction } from "../utils/transaction.js";
import { logAudit } from "../utils/audit.js";
import { reserveStock } from "../utils/stock.js";
import { recordStatusChange } from "../utils/orderStatus.js";
import {
  APPROVAL_CHANNELS,
  DeferredWorkModel,
  QuoteVersionModel,
} from "../models/index.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;

/** Roles that represent the customer acting for themselves, as opposed to a
 *  staff member relaying a decision the customer gave elsewhere. */
const CUSTOMER_ROLES = ["onlineCustomer", "walkInCustomer"];

/** How far out to schedule the follow-up on work the customer declined. */
const DEFERRED_REMINDER_DAYS = 30;

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
export async function updateQuotation(
  id,
  { lines, discountPercent, taxPercent, note, validUntil },
  actorId,
) {
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

  // Archive the pre-edit state before touching anything. Even drafts are
  // versioned: the point is that no figure this system ever showed a customer
  // can later be overwritten without a trace.
  await archiveQuoteVersion(quote, { reason: "edited", snapshotBy: actorId });

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
  quote.version = (quote.version || 1) + 1;

  await quote.save();
  return quote;
}

/**
 * Writes an immutable snapshot of a quote's current state to QuoteVersion.
 * Best-effort in the same spirit as the audit log: failing to archive must not
 * block the edit, but it is loud in the logs when it happens.
 */
async function archiveQuoteVersion(quote, { reason, snapshotBy, session } = {}) {
  try {
    await QuoteVersionModel.create(
      [
        {
          quoteId: quote._id,
          version: quote.version || 1,
          lines: quote.lines?.map((line) => (line.toObject ? line.toObject() : line)) ?? [],
          discountPercent: quote.discountPercent,
          taxPercent: quote.taxPercent,
          totalEstimate: quote.totalEstimate,
          status: quote.status,
          reason,
          snapshotBy,
        },
      ],
      { session },
    );
  } catch (err) {
    console.warn("[quotation] failed to archive version:", err?.message ?? err);
  }
}

/** Full version history of a quote, oldest first — "what were they shown, and
 *  when". */
export async function getQuotationVersions(id) {
  if (!OID_RE.test(id)) {
    throw new ApiError(400, "Invalid quotation ID format");
  }
  const versions = await QuoteVersionModel.find({ quoteId: id })
    .populate("snapshotBy", "fullName")
    .sort({ version: 1 });
  return { versions };
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
      void renderQuotationPdf(quote)
        .then((pdfBuffer) =>
          sendEmail({
            to: customer.email,
            subject: `Your repair quote ${quote.code} is ready`,
            html: renderEmailLayout({
              preheader: `Your quote ${quote.code} is ready to review — please approve before work begins.`,
              heading: "Your repair quote is ready",
              bodyHtml: `
                <p style="margin:0 0 8px;">Hi ${customer.fullName || "there"},</p>
                <p style="margin:0;">Your quote <strong>${quote.code}</strong> for <strong>${quote.vehicleName || "your vehicle"}</strong>${quote.vehiclePlate ? ` (${quote.vehiclePlate})` : ""} is ready — the full breakdown is attached as a PDF. Please review and approve it before we begin work.</p>
              `,
              highlight: {
                label: "Total estimate",
                value: `${quote.totalEstimate?.toLocaleString("vi-VN")} ₫`,
              },
              button: {
                label: "Review & approve quote",
                url: `${SITE_URL}/customer/bookings`,
              },
            }),
            attachments: [
              {
                filename: `${quote.code || "quote"}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf",
              },
            ],
          }),
        )
        .catch(() => {});
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
/**
 * Normalises the several shapes a confirmation can arrive in into one
 * per-line decision list.
 *
 * Legacy callers pass a bare boolean (approve/decline everything). The richer
 * form carries `lineDecisions` so a customer can accept the brakes and decline
 * the tyres — the case that actually dominates in practice, and which used to
 * force the advisor to quietly rewrite the quote, erasing what was turned down.
 */
function normaliseDecision(payload, lineCount) {
  const raw = typeof payload === "boolean" ? { approved: payload } : (payload ?? {});

  let decisions;
  if (Array.isArray(raw.lineDecisions) && raw.lineDecisions.length > 0) {
    decisions = Array.from({ length: lineCount }, (_, index) => {
      const entry = raw.lineDecisions.find((d) => Number(d?.index) === index);
      // A line nobody ruled on is treated as declined rather than silently
      // billed — never charge for something the customer didn't say yes to.
      if (!entry) return { approved: false, declineReason: "Not selected by customer" };
      return {
        approved: Boolean(entry.approved),
        declineReason: entry.declineReason?.trim() || undefined,
      };
    });
  } else if (typeof raw.approved === "boolean") {
    decisions = Array.from({ length: lineCount }, () => ({
      approved: raw.approved,
      declineReason: raw.approved ? undefined : raw.declineReason?.trim() || undefined,
    }));
  } else {
    throw new ApiError(400, "Provide either approved (boolean) or lineDecisions[]");
  }

  return {
    decisions,
    channel: raw.channel,
    contactValue: raw.contactValue?.trim(),
    decidedByName: raw.decidedByName?.trim(),
    note: raw.note?.trim(),
    // Signature images (data URLs) — see approval.schema.js. Not trimmed:
    // trimming a data URL string is harmless but pointless: any leading/
    // trailing whitespace would already break the "data:" prefix.
    customerSignature: typeof raw.customerSignature === "string" ? raw.customerSignature : undefined,
    advisorSignature: typeof raw.advisorSignature === "string" ? raw.advisorSignature : undefined,
  };
}

/**
 * Records the customer's decision on a quotation, line by line.
 *
 * Two callers reach this: the customer themselves (self-service, `actorRole`
 * is a customer role) and an advisor relaying a decision given in person or by
 * phone. The distinction matters legally, so it is captured in the approval
 * record rather than flattened — a relayed approval must name the person who
 * authorised it and the number/address actually contacted, otherwise the trail
 * proves only that an employee clicked a button.
 *
 * Approved lines become the repair order's work list. Declined lines are NOT
 * discarded — they become DeferredWork against the vehicle so the shop can
 * follow up instead of forgetting them.
 */
export async function confirmQuotation(id, payload, actorId, actorRole) {
  if (!OID_RE.test(id)) {
    throw new ApiError(400, "Invalid quotation ID format");
  }

  const quote = await serviceQuoteRepository.findById(id);
  if (!quote) {
    throw new ApiError(404, "Quotation not found");
  }
  // The SA now records the customer's decision on the spot (walk-in), so a
  // draft can be confirmed directly without first "sending" it. Already
  // decided quotes are terminal and can't be re-confirmed.
  if (quote.status !== "draft" && quote.status !== "sent") {
    throw new ApiError(409, `Only a draft or sent quotation can be confirmed (this one is ${quote.status})`);
  }
  if (quote.validUntil && quote.validUntil.getTime() < Date.now()) {
    throw new ApiError(
      409,
      "This quotation has expired — issue a revised quote before taking a decision",
    );
  }

  const { decisions, channel, contactValue, decidedByName, note, customerSignature, advisorSignature } =
    normaliseDecision(payload, quote.lines.length);

  const isSelfService = CUSTOMER_ROLES.includes(actorRole);
  // An advisor confirming the initial estimate is, in the overwhelming
  // majority of cases, standing at the desk with the customer — so "inPerson"
  // is an honest default rather than a fiction, and the rest of the trail
  // (who recorded it, when, against which contact, for what total) is captured
  // regardless. Change orders are stricter: see additional-service.service.js,
  // where charging beyond an approved estimate demands the channel be stated
  // explicitly.
  const resolvedChannel = channel || (isSelfService ? "app" : "inPerson");
  if (!APPROVAL_CHANNELS.includes(resolvedChannel)) {
    throw new ApiError(400, `channel must be one of: ${APPROVAL_CHANNELS.join(", ")}`);
  }

  const approvedCount = decisions.filter((d) => d.approved).length;
  const nextStatus =
    approvedCount === 0
      ? "rejected"
      : approvedCount === decisions.length
        ? "approved"
        : "partiallyApproved";

  // Collected while reserving stock below; a non-empty list moves the order to
  // waitingParts so the delay has a recorded, measurable cause.
  const shortages = [];
  let previousOrderStatus = null;

  // Quote decision, repair-order population and deferred-work capture are one
  // logical act. A partial commit would leave a terminally-decided quote whose
  // work never reached the order (or declined lines lost entirely).
  await runInTransaction(async (session) => {
    quote.lines.forEach((line, index) => {
      line.decision = decisions[index].approved ? "approved" : "declined";
      line.declineReason = decisions[index].approved
        ? undefined
        : decisions[index].declineReason;
    });
    quote.status = nextStatus;
    quote.approval = {
      decidedBy: isSelfService ? actorId : undefined,
      decidedByName: decidedByName || quote.customerName,
      decidedAt: new Date(),
      channel: resolvedChannel,
      contactValue: contactValue || quote.customerPhone,
      recordedBy: isSelfService ? undefined : actorId,
      note,
      approvedTotal: quote.totalEstimate,
      customerSignature,
      // In the self-service (app) path there is no advisor physically present
      // to countersign — only a relayed, in-person/phone decision carries an
      // advisor's own signature.
      advisorSignature: isSelfService ? undefined : advisorSignature,
    };
    await quote.save({ session });

    const order = await repairOrderRepository.model
      .findById(quote.repairOrderId)
      .session(session);

    if (order && approvedCount > 0) {
      const processedServices = [];
      let totalCost = 0;

      for (const [index, line] of quote.lines.entries()) {
        if (!decisions[index].approved) continue;

        let name = line.description;
        const priceAtTime = Number(line.unitPrice) || 0;

        if (line.serviceId) {
          const serviceDoc = await serviceRepository.model
            .findById(line.serviceId)
            .session(session);
          if (serviceDoc) name = serviceDoc.name;
        }

        const quantity = Number(line.quantity) || 1;
        processedServices.push({
          serviceId: line.serviceId || undefined,
          partId: line.partId || undefined,
          name: name || "Line item",
          priceAtTime,
          quantity,
          kind: line.kind || "service",
          source: "quote",
          // Who pays. Carried from the quote line; a comeback (redo of the
          // shop's own earlier work) defaults to internal — the garage eats it,
          // it isn't billed to the customer again.
          jobType: line.jobType || (order.isComeback ? "internal" : "customerPay"),
        });
        totalCost += priceAtTime * quantity;

        // The customer has now agreed to this part, so commit the stock to
        // this order. Reserving (rather than deducting) keeps it on the shelf
        // until a technician actually takes it, while making it unavailable to
        // quote against a second job. A shortfall doesn't fail the approval —
        // the sale is already made — it flags the order as waiting on parts.
        if (line.partId && (line.kind === "part" || !line.kind)) {
          const { shortfall } = await reserveStock(
            {
              partId: line.partId,
              repairOrderId: order._id,
              quantity,
              actorId,
            },
            session,
          );
          if (shortfall > 0) {
            shortages.push(`${name || "part"} (short ${shortfall})`);
          }
        }
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

      // Stock couldn't cover the approved parts, so the job cannot start yet.
      // Recording that as waitingParts (with the specific shortage as the
      // reason) is what makes "why has this car been here three days"
      // answerable, and keeps the wait out of technician productivity.
      if (shortages.length > 0 && order.status === "pending") {
        previousOrderStatus = order.status;
        order.status = "waitingParts";
      }

      await order.save({ session });
    }

    // Declined work is a follow-up obligation, not a dead end.
    const declined = quote.lines
      .map((line, index) => ({ line, decision: decisions[index] }))
      .filter(({ decision }) => !decision.approved);

    if (declined.length > 0) {
      await DeferredWorkModel.create(
        declined.map(({ line, decision }) => ({
          vehicleId: quote.vehicleId,
          customerId: quote.customerId,
          sourceQuoteId: quote._id,
          sourceRepairOrderId: quote.repairOrderId,
          serviceId: line.serviceId || undefined,
          description: line.description || "Recommended work",
          estimatedPrice: (Number(line.unitPrice) || 0) * (Number(line.quantity) || 1),
          declineReason: decision.declineReason,
          status: "open",
          // Chase it up at the next service interval rather than immediately.
          remindAt: new Date(Date.now() + DEFERRED_REMINDER_DAYS * 24 * 60 * 60 * 1000),
        })),
        { session },
      );
    }
  });

  // Recorded outside the transaction, like every other status change, so the
  // history entry survives even if auditing itself hiccups.
  if (previousOrderStatus) {
    await recordStatusChange({
      repairOrderId: quote.repairOrderId,
      from: previousOrderStatus,
      to: "waitingParts",
      changedBy: actorId,
      reason: `Waiting on parts: ${shortages.join(", ")}`,
    });
  }

  await logAudit({
    action: nextStatus === "rejected" ? "quoteRejected" : "quoteApproved",
    actorId,
    repairOrderId: quote.repairOrderId,
    targetModel: "ServiceQuote",
    targetId: quote._id,
    details:
      `Quote ${quote.code || quote._id} → ${nextStatus} ` +
      `(${approvedCount}/${decisions.length} lines approved) ` +
      `via ${resolvedChannel}${isSelfService ? " by customer" : " recorded by staff"}`,
  });

  return quote;
}

/**
 * The customer's own quotations. Drafts are excluded — an unsent draft is the
 * advisor's working copy, not something the customer should be reacting to.
 */
export async function listMyQuotations(customerId) {
  const quotes = await serviceQuoteRepository.model
    .find({ customerId, status: { $ne: "draft" } })
    .sort({ createdAt: -1 });
  return { quotations: quotes };
}

/**
 * Self-service approval: the customer decides on their own quotation.
 *
 * This is the path that makes the authorisation trail meaningful — the
 * customer acts directly, so the record needs no "an advisor says they agreed"
 * caveat. Ownership is checked server-side: a customer may only decide on a
 * quote that is actually theirs.
 */
export async function customerDecideQuotation(id, payload, customerId) {
  if (!OID_RE.test(id)) {
    throw new ApiError(400, "Invalid quotation ID format");
  }

  const quote = await serviceQuoteRepository.findById(id);
  if (!quote) {
    throw new ApiError(404, "Quotation not found");
  }
  if (!quote.customerId || quote.customerId.toString() !== String(customerId)) {
    // 404 rather than 403 — don't confirm the existence of other people's
    // quotes to someone probing ids.
    throw new ApiError(404, "Quotation not found");
  }
  if (quote.status === "draft") {
    throw new ApiError(409, "This quotation has not been sent to you yet");
  }

  return confirmQuotation(
    id,
    { ...(typeof payload === "boolean" ? { approved: payload } : (payload ?? {})), channel: "app" },
    customerId,
    "onlineCustomer",
  );
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
