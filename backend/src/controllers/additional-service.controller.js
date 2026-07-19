import { RepairOrderModel, ServiceRequestModel, VehicleModel } from "../models/index.js";
import { SERVICE_REQUEST_STATUSES } from "../models/ServiceRequest.js";
import { HttpError } from "../middleware/error.js";
import { createNotification } from "../utils/notify.js";
import { sendEmail } from "../utils/mailer.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;
const FE_STATUSES = ["pending", "sent", "approved", "rejected"];
// Once an SA has approved or rejected a proposal, that decision is final —
// re-approving would push a duplicate service line onto the repair order
// (see the "approved" branch below), and re-rejecting an approved proposal
// would leave a phantom line on the order with no way to remove it.
const TERMINAL_STATUSES = ["approved", "rejected"];

/** GET /api/additional-service-proposals — SA review queue. */
export async function listAdditionalServiceProposals(req, res) {
  const { repairOrderId } = req.query;
  const filter = {};
  if (repairOrderId) {
    if (!OID_RE.test(repairOrderId)) {
      throw new HttpError(400, "Invalid repairOrderId format");
    }
    filter.repairOrderId = repairOrderId;
  }

  const proposals = await ServiceRequestModel.find(filter)
    .populate("technicianId", "fullName email phone role")
    .sort({ createdAt: -1 });

  res.json({ proposals });
}

/**
 * POST /api/additional-service-proposals — technician flags extra work
 * found mid-repair for SA review.
 */
export async function createAdditionalServiceProposal(req, res) {
  const {
    repairOrderId,
    serviceName,
    affectedPart,
    reason,
    customerImpact,
    laborCost,
    partsCost,
    estimateMinutes,
    evidenceCount,
    priority,
  } = req.body ?? {};

  if (!repairOrderId || !OID_RE.test(repairOrderId)) {
    throw new HttpError(400, "A valid repairOrderId is required");
  }
  if (!serviceName?.trim()) {
    throw new HttpError(400, "serviceName is required");
  }

  const repairOrderForNotify = await RepairOrderModel.findById(repairOrderId).select("advisorId");

  const proposal = await ServiceRequestModel.create({
    repairOrderId,
    technicianId: req.user.sub,
    serviceName: serviceName.trim(),
    affectedPart,
    reason,
    customerImpact,
    laborCost,
    partsCost,
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

  res.status(201).json(proposal);
}

/** PATCH /api/additional-service-proposals/:id — SA sends/approves/rejects. */
export async function updateAdditionalServiceProposal(req, res) {
  const { id } = req.params;
  const { status } = req.body ?? {};

  if (!OID_RE.test(id)) {
    throw new HttpError(400, "Invalid proposal ID format");
  }
  if (!FE_STATUSES.includes(status)) {
    throw new HttpError(400, `status must be one of: ${FE_STATUSES.join(", ")}`);
  }
  if (!SERVICE_REQUEST_STATUSES.includes(status)) {
    throw new HttpError(400, "Unsupported status value");
  }

  const proposal = await ServiceRequestModel.findById(id);
  if (!proposal) {
    throw new HttpError(404, "Proposal not found");
  }
  if (TERMINAL_STATUSES.includes(proposal.status)) {
    throw new HttpError(
      409,
      `This proposal was already ${proposal.status} and can no longer be changed`,
    );
  }

  proposal.status = status;
  proposal.reviewedBy = req.user.sub;
  if (status === "approved" || status === "rejected") {
    proposal.resolvedAt = new Date();
  }
  await proposal.save();
  await proposal.populate("technicianId", "fullName email phone role");

  // Approved extra work must actually land on the order, or it's invisible
  // on the eventual invoice (which is derived purely from RepairOrder.services).
  if (status === "approved") {
    const order = await RepairOrderModel.findById(proposal.repairOrderId);
    if (order) {
      order.services.push({
        serviceId: proposal.serviceId || undefined,
        name: proposal.serviceName,
        priceAtTime: (proposal.laborCost || 0) + (proposal.partsCost || 0),
        quantity: 1,
      });
      order.totalCost = order.services.reduce(
        (sum, service) => sum + service.priceAtTime * (service.quantity || 1),
        0,
      );
      await order.save();
    }
  }

  if (status === "sent") {
    const order = await RepairOrderModel.findById(proposal.repairOrderId);
    const vehicle = order?.vehicleId
      ? await VehicleModel.findById(order.vehicleId).populate(
          "customerId",
          "fullName email"
        )
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
        await sendEmail({
          to: customer.email,
          subject: `Additional service recommended: ${proposal.serviceName}`,
          html: `<p>Hi ${customer.fullName || "there"},</p><p>While working on your vehicle, our technician recommended an additional service:</p><p><strong>${proposal.serviceName}</strong></p><p>${proposal.reason || ""}</p><p>Estimated cost: <strong>${((proposal.laborCost || 0) + (proposal.partsCost || 0)).toLocaleString("vi-VN")} ₫</strong>.</p><p>Please log in to your account to approve or decline it.</p>`,
        });
      }
    }
  }

  res.json(proposal);
}
