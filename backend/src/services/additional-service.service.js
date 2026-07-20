import { serviceRequestRepository } from "../repositories/service-request.repository.js";
import { repairOrderRepository } from "../repositories/repair-order.repository.js";
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { serviceRepository } from "../repositories/service.repository.js";
import { SERVICE_REQUEST_STATUSES } from "../models/service-request.model.js";
import { ApiError } from "../utils/apiError.js";
import { createNotification } from "../utils/notify.js";
import { sendEmail } from "../utils/mailer.js";

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
  await proposal.save();
  await proposal.populate("technicianId", "fullName email phone role");

  // Approved extra work must actually land on the order, or it's invisible
  // on the eventual invoice (which is derived purely from RepairOrder.services).
  if (status === "approved") {
    const order = await repairOrderRepository.findById(proposal.repairOrderId);
    if (order) {
      order.services.push({
        serviceId: proposal.serviceId || undefined,
        name: proposal.serviceName,
        priceAtTime: (proposal.laborCost || 0) + (proposal.partsCost || 0),
        quantity: 1,
        kind: "service",
        source: "additionalService",
      });
      order.totalCost = order.services.reduce(
        (sum, service) => sum + service.priceAtTime * (service.quantity || 1),
        0,
      );
      await order.save();
    }
  }

  if (status === "sent") {
    const order = await repairOrderRepository.findById(proposal.repairOrderId);
    const vehicle = order?.vehicleId
      ? await vehicleRepository.model.findById(order.vehicleId).populate("customerId", "fullName email")
      : null;
    const customer = vehicle?.customerId;

    if (customer) {
      await createNotification({
        userId: customer._id,
        type: "additionalServiceSent",
        title: "Additional service recommended",
        message: `Your service advisor sent a quote for an additional service: ${proposal.serviceName}.`,
        refId: proposal.repairOrderId,
        refModel: "RepairOrder",
      });

      if (customer.email) {
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

  return proposal;
}
