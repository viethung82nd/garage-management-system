import {
  RepairOrderModel,
  TransferRequestModel,
  UserModel,
} from "../models/index.js";
import { HttpError } from "../middleware/error.js";
import { TRANSFER_REQUEST_STATUSES } from "../models/TransferRequest.js";
import { createNotification } from "../utils/notify.js";

/** GET /api/transfer-requests — SA review queue for technician transfer requests. */
export async function listTransferRequests(req, res) {
  const { status, repairOrderId } = req.query;
  const filter = {};

  if (status) {
    if (!TRANSFER_REQUEST_STATUSES.includes(status)) {
      throw new HttpError(
        400,
        `status must be one of: ${TRANSFER_REQUEST_STATUSES.join(", ")}`,
      );
    }
    filter.status = status;
  }

  if (repairOrderId) {
    if (!repairOrderId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new HttpError(400, "Invalid repairOrderId format");
    }
    filter.repairOrderId = repairOrderId;
  }

  const transferRequests = await TransferRequestModel.find(filter)
    .populate("repairOrderId")
    .populate("fromTechnicianId", "fullName email phone role")
    .populate("toTechnicianId", "fullName email phone role")
    .sort({ requestedAt: -1 });

  res.json({ transferRequests });
}

export async function createTransferRequest(req, res) {
  const fromTechnicianId = req.user?.sub;
  const { repairOrderId, toTechnicianId, reason } = req.body ?? {};

  if (!repairOrderId) {
    throw new HttpError(400, "repairOrderId is required");
  }
  if (!toTechnicianId) {
    throw new HttpError(400, "toTechnicianId is required");
  }

  if (!repairOrderId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid repairOrderId format");
  }
  if (!toTechnicianId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid toTechnicianId format");
  }

  const repairOrder = await RepairOrderModel.findById(repairOrderId);
  if (!repairOrder) {
    throw new HttpError(404, "Repair order not found");
  }

  if (String(repairOrder.technicianId) !== String(fromTechnicianId)) {
    throw new HttpError(
      403,
      "Only the assigned technician can request a transfer for this repair order",
    );
  }

  if (repairOrder.status === "completed" || repairOrder.status === "cancelled") {
    throw new HttpError(
      409,
      `Cannot request a transfer for a ${repairOrder.status} repair order`,
    );
  }

  const toTechnician = await UserModel.findById(toTechnicianId);
  if (!toTechnician || toTechnician.role !== "technician") {
    throw new HttpError(404, "Target technician not found");
  }

  const existingRequest = await TransferRequestModel.findOne({
    repairOrderId,
    fromTechnicianId,
    toTechnicianId,
    status: "pending",
  });

  if (existingRequest) {
    throw new HttpError(
      409,
      "A pending transfer request to this technician already exists for this repair order",
    );
  }

  const transferRequest = new TransferRequestModel({
    repairOrderId,
    fromTechnicianId,
    toTechnicianId,
    reason: reason?.trim(),
    status: "pending",
  });

  await transferRequest.save();

  if (repairOrder.advisorId) {
    const toTechnicianDoc = toTechnician;
    await createNotification({
      userId: repairOrder.advisorId,
      type: "transferRequested",
      title: "Technician transfer requested",
      message: `A technician requested to hand this repair order off to ${toTechnicianDoc.fullName || "another technician"}.`,
      refId: repairOrder._id,
      refModel: "RepairOrder",
    });
  }

  res.status(201).json(transferRequest);
}

async function resolveTransferRequest(req, res, newStatus) {
  const { id } = req.params;
  const { resolveNote } = req.body ?? {};
  const resolvedBy = req.user?.sub;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid transfer request ID format");
  }

  const transferRequest = await TransferRequestModel.findById(id);
  if (!transferRequest) {
    throw new HttpError(404, "Transfer request not found");
  }

  if (transferRequest.status !== "pending") {
    throw new HttpError(400, "Only pending transfer requests can be resolved");
  }

  const repairOrder = await RepairOrderModel.findById(
    transferRequest.repairOrderId,
  );
  if (!repairOrder) {
    throw new HttpError(404, "Repair order not found");
  }

  if (
    String(repairOrder.technicianId) !==
    String(transferRequest.fromTechnicianId)
  ) {
    throw new HttpError(
      400,
      "Repair order technician assignment has changed and this transfer request cannot be approved",
    );
  }

  if (newStatus === "approved") {
    repairOrder.technicianId = transferRequest.toTechnicianId;
    await repairOrder.save();
  }

  transferRequest.status = newStatus;
  transferRequest.resolvedBy = resolvedBy;
  transferRequest.resolveNote = resolveNote?.trim();
  transferRequest.resolvedAt = new Date();
  await transferRequest.save();

  await createNotification({
    userId: transferRequest.fromTechnicianId,
    type: newStatus === "approved" ? "transferApproved" : "transferRejected",
    title: newStatus === "approved" ? "Transfer request approved" : "Transfer request rejected",
    message:
      newStatus === "approved"
        ? "Your transfer request was approved — the order has moved to the other technician."
        : "Your transfer request was rejected — this order is still yours.",
    refId: repairOrder._id,
    refModel: "RepairOrder",
  });

  if (newStatus === "approved") {
    await createNotification({
      userId: transferRequest.toTechnicianId,
      type: "repairOrderAssigned",
      title: "Repair order transferred to you",
      message: "A colleague transferred a repair order to you.",
      refId: repairOrder._id,
      refModel: "RepairOrder",
    });
  }

  res.json(transferRequest);
}

export async function approveTransferRequest(req, res) {
  return resolveTransferRequest(req, res, "approved");
}

export async function rejectTransferRequest(req, res) {
  return resolveTransferRequest(req, res, "rejected");
}
