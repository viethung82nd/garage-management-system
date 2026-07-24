import { serviceRequestRepository } from "../repositories/service-request.repository.js";
import { repairOrderRepository } from "../repositories/repair-order.repository.js";
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { serviceRepository } from "../repositories/service.repository.js";
import { SERVICE_REQUEST_STATUSES } from "../models/service-request.model.js";
import { ApiError } from "../utils/apiError.js";
import { createNotification } from "../utils/notify.js";
import { sendEmail } from "../utils/mailer.js";
import { runInTransaction } from "../utils/transaction.js";
import { APPROVAL_CHANNELS } from "../models/index.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;
const FE_STATUSES = ["pending", "sent", "approved", "rejected"];
// Once an SA has approved or rejected a proposal, that decision is final —
// re-approving would push a duplicate service line onto the repair order
// (see the "approved" branch below), and re-rejecting an approved proposal
// would leave a phantom line on the order with no way to remove it.
const TERMINAL_STATUSES = ["approved", "rejected"];

/** SA review queue. */
export async function listAdditionalServiceProposals({ repairOrderId }) {
  const filter = {};
  if (repairOrderId) {
    if (!OID_RE.test(repairOrderId)) {
      throw new ApiError(400, "Invalid repairOrderId format");
    }
    filter.repairOrderId = repairOrderId;
  }

  const proposals = await serviceRequestRepository.model
    .find(filter)
    .populate("technicianId", "fullName email phone role")
    .sort({ createdAt: -1 });

  return { proposals };
}

/**
 * Technician flags extra work found mid-repair for SA review. Deliberately
 * takes no laborCost/partsCost — pricing extra work is the service advisor's
 * call (see updateAdditionalServiceProposal), not the technician's, so this
 * never accepts a price even if one is sent.
 */
export async function createAdditionalServiceProposal(
  {
    repairOrderId,
    serviceId,
    serviceName,
    affectedPart,
    reason,
    customerImpact,
    estimateMinutes,
    evidenceCount,
    priority,
  },
  technicianId,
) {
  if (!repairOrderId || !OID_RE.test(repairOrderId)) {
    throw new ApiError(400, "A valid repairOrderId is required");
  }
  if (!serviceName?.trim()) {
    throw new ApiError(400, "serviceName is required");
  }

  // Optional: the technician picked this from the SA's service catalog
  // instead of (or in addition to) typing a custom name — carries the real
  // catalog link through to the order line if the proposal is approved.
  let catalogServiceId;
  if (serviceId) {
    if (!OID_RE.test(serviceId)) {
      throw new ApiError(400, "Invalid serviceId format");
    }
    const catalogService = await serviceRepository.findById(serviceId);
    if (!catalogService) {
      throw new ApiError(404, "Service not found in the catalog");
    }
    catalogServiceId = catalogService._id;
  }

  const repairOrderForNotify = await repairOrderRepository.model
    .findById(repairOrderId)
    .select("advisorId");

  const proposal = await serviceRequestRepository.create({
    repairOrderId,
    technicianId,
    serviceId: catalogServiceId,
    serviceName: serviceName.trim(),
    affectedPart,
    reason,
    customerImpact,
    estimateMinutes,
    evidenceCount,
    priority: ["high", "medium", "low"].includes(priority) ? priority : "medium",
    status: "pending",
  });

  await proposal.populate("technicianId", "fullName email phone role");

  if (repairOrderForNotify?.advisorId) {
    await createNotification({
      userId: repairOrderForNotify.advisorId,
      type: "additionalServiceProposed",
      title: "New additional service proposal",
      message: `${proposal.technicianId?.fullName || "A technician"} flagged extra work: ${proposal.serviceName}.`,
      refId: proposal.repairOrderId,
      refModel: "RepairOrder",
    });
  }

  return proposal;
}

/**
 * Commits an authorised change order: stamps the approval evidence onto the
 * proposal, pushes the extra work onto the repair order, and records the
 * revised order total the customer was told.
 *
 * The two writes are one logical act — a partial commit would leave the
 * proposal terminally "approved" while the work stayed invisible on the
 * invoice (which is derived purely from RepairOrder.services).
 *
 * `revisedOrderTotal` is captured deliberately: a change order has to state
 * the NEW overall figure, not merely the increment, or "it's only 500k more"
 * quietly hides where the total actually landed.
 */
async function applyProposalApproval(proposal, approvalRecord) {
  const lineTotal = (proposal.laborCost || 0) + (proposal.partsCost || 0);

  await runInTransaction(async (session) => {
    const order = await repairOrderRepository.model
      .findById(proposal.repairOrderId)
      .session(session);

    if (order) {
      order.services.push({
        serviceId: proposal.serviceId || undefined,
        name: proposal.serviceName,
        priceAtTime: lineTotal,
        quantity: 1,
        kind: "service",
        source: "additionalService",
      });
      order.totalCost = order.services.reduce(
        (sum, service) => sum + service.priceAtTime * (service.quantity || 1),
        0,
      );
      await order.save({ session });
      proposal.revisedOrderTotal = order.totalCost;
    }

    proposal.approval = { ...approvalRecord, decidedAt: new Date(), approvedTotal: lineTotal };
    await proposal.save({ session });
  });
}

/**
 * The customer decides on a change order themselves.
 *
 * This is the authorisation path the standard actually asks for: the person
 * paying agrees, in their own name, before the work is billed. Ownership is
 * verified through the proposal's repair order → vehicle → customer chain so
 * one customer can never act on another's proposal.
 */
export async function customerDecideProposal(id, { approved, note }, customerId) {
  if (!OID_RE.test(id)) {
    throw new ApiError(400, "Invalid proposal ID format");
  }
  if (typeof approved !== "boolean") {
    throw new ApiError(400, "approved (boolean) is required");
  }

  const proposal = await serviceRequestRepository.findById(id);
  if (!proposal) {
    throw new ApiError(404, "Proposal not found");
  }
  if (TERMINAL_STATUSES.includes(proposal.status) || proposal.status === "approvedByCustomer") {
    throw new ApiError(409, `This proposal was already ${proposal.status} and can no longer be changed`);
  }

  const order = await repairOrderRepository.model
    .findById(proposal.repairOrderId)
    .populate({ path: "vehicleId", select: "customerId" });
  const ownerId = order?.vehicleId?.customerId;
  if (!ownerId || ownerId.toString() !== String(customerId)) {
    // 404 rather than 403 — don't reveal other customers' proposals to
    // someone guessing ids.
    throw new ApiError(404, "Proposal not found");
  }

  proposal.status = approved ? "approvedByCustomer" : "rejectedByCustomer";
  proposal.resolvedAt = new Date();

  if (approved) {
    await applyProposalApproval(proposal, {
      decidedBy: customerId,
      channel: "app",
      note: note?.trim(),
    });
  } else {
    await proposal.save();
  }

  await proposal.populate("technicianId", "fullName email phone role");
  return proposal;
}

/**
 * SA sends/approves/rejects a proposal. `overrides` lets the SA set the
 * final price before it goes anywhere — the technician's labor/parts cost is
 * only ever an estimate; pricing what the customer actually gets billed is
 * the SA's call, not the technician's.
 */
export async function updateAdditionalServiceProposal(id, status, reviewedBy, overrides = {}) {
  if (!OID_RE.test(id)) {
    throw new ApiError(400, "Invalid proposal ID format");
  }
  if (!FE_STATUSES.includes(status)) {
    throw new ApiError(400, `status must be one of: ${FE_STATUSES.join(", ")}`);
  }
  if (!SERVICE_REQUEST_STATUSES.includes(status)) {
    throw new ApiError(400, "Unsupported status value");
  }

  const proposal = await serviceRequestRepository.findById(id);
  if (!proposal) {
    throw new ApiError(404, "Proposal not found");
  }
  if (TERMINAL_STATUSES.includes(proposal.status)) {
    throw new ApiError(409, `This proposal was already ${proposal.status} and can no longer be changed`);
  }

  const { laborCost, partsCost } = overrides;
  if (laborCost !== undefined) {
    const parsedLaborCost = Number(laborCost);
    if (Number.isNaN(parsedLaborCost) || parsedLaborCost < 0) {
      throw new ApiError(400, "laborCost must be a non-negative number");
    }
    proposal.laborCost = parsedLaborCost;
  }
  if (partsCost !== undefined) {
    const parsedPartsCost = Number(partsCost);
    if (Number.isNaN(parsedPartsCost) || parsedPartsCost < 0) {
      throw new ApiError(400, "partsCost must be a non-negative number");
    }
    proposal.partsCost = parsedPartsCost;
  }

  proposal.status = status;
  proposal.reviewedBy = reviewedBy;
  if (status === "approved" || status === "rejected") {
    proposal.resolvedAt = new Date();
  }

  // Approving extra work means charging the customer beyond the estimate they
  // already agreed to. That requires the CUSTOMER's authorisation — an
  // advisor's own click is not consent. Account holders approve through
  // /customer-decision; this staff-facing path exists for walk-ins with no
  // account, and therefore demands the evidence of that conversation: how it
  // was obtained, who authorised it, and on what contact.
  if (status === "approved") {
    const { approval } = overrides;
    if (!approval?.channel) {
      throw new ApiError(
        400,
        `Approving extra work requires the customer's authorisation: supply approval.channel (one of: ${APPROVAL_CHANNELS.join(", ")}), approval.decidedByName and approval.contactValue. Customers with an account should approve via PATCH /api/additional-service-proposals/:id/customer-decision instead.`,
      );
    }
    if (!APPROVAL_CHANNELS.includes(approval.channel)) {
      throw new ApiError(400, `approval.channel must be one of: ${APPROVAL_CHANNELS.join(", ")}`);
    }
    if (!approval.decidedByName?.trim()) {
      throw new ApiError(400, "approval.decidedByName is required — name the person who authorised the extra work");
    }

    await applyProposalApproval(proposal, {
      decidedByName: approval.decidedByName.trim(),
      channel: approval.channel,
      contactValue: approval.contactValue?.trim(),
      recordedBy: reviewedBy,
      note: approval.note?.trim(),
    });
  } else {
    await proposal.save();
  }
  await proposal.populate("technicianId", "fullName email phone role");

  // Only meaningful when status === "sent" — undefined otherwise, so the
  // frontend can tell "not applicable" apart from "no email on file".
  let hasEmailOnFile;

  if (status === "sent") {
    const order = await repairOrderRepository.findById(proposal.repairOrderId);
    const vehicle = order?.vehicleId
      ? await vehicleRepository.model.findById(order.vehicleId).populate("customerId", "fullName email")
      : null;
    const customer = vehicle?.customerId;
    hasEmailOnFile = Boolean(customer?.email);

    if (customer) {
      await createNotification({
        userId: customer._id,
        type: "additionalServiceSent",
        title: "Additional service recommended",
        message: `Your service advisor sent a quote for an additional service: ${proposal.serviceName}.`,
        refId: proposal.repairOrderId,
        refModel: "RepairOrder",
      });

      if (hasEmailOnFile) {
        // Fire-and-forget — see sendQuotation() for why this must not block
        // the request on a slow/unreachable SMTP server.
        void sendEmail({
          to: customer.email,
          subject: `Additional service recommended: ${proposal.serviceName}`,
          html: `<p>Hi ${customer.fullName || "there"},</p><p>While working on your vehicle, our technician recommended an additional service:</p><p><strong>${proposal.serviceName}</strong></p><p>${proposal.reason || ""}</p><p>Estimated cost: <strong>${((proposal.laborCost || 0) + (proposal.partsCost || 0)).toLocaleString("vi-VN")} ₫</strong>.</p><p>Please log in to your account to approve or decline it.</p>`,
        }).catch(() => {});
      }
    }
  }

  return { ...proposal.toObject(), hasEmailOnFile };
}
