import { ServiceRequestModel } from "../models/index.js";
import { SERVICE_REQUEST_STATUSES } from "../models/ServiceRequest.js";
import { HttpError } from "../middleware/error.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;
const FE_STATUSES = ["pending", "sent", "approved", "rejected"];

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

  proposal.status = status;
  proposal.reviewedBy = req.user.sub;
  if (status === "approved" || status === "rejected") {
    proposal.resolvedAt = new Date();
  }
  await proposal.save();
  await proposal.populate("technicianId", "fullName email phone role");

  res.json(proposal);
}
