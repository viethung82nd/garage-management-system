import { transferRequestRepository } from "../repositories/transfer-request.repository.js";
import { repairOrderRepository } from "../repositories/repair-order.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { TRANSFER_REQUEST_STATUSES } from "../models/transfer-request.model.js";
import { ApiError } from "../utils/apiError.js";
import { createNotification } from "../utils/notify.js";

/** SA review queue for technician transfer requests. */
export async function listTransferRequests({ status, repairOrderId }) {
  const filter = {};

  if (status) {
    if (!TRANSFER_REQUEST_STATUSES.includes(status)) {
      throw new ApiError(400, `status must be one of: ${TRANSFER_REQUEST_STATUSES.join(", ")}`);
    }
    filter.status = status;
  }

  if (repairOrderId) {
    if (!repairOrderId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError(400, "Invalid repairOrderId format");
    }
    filter.repairOrderId = repairOrderId;
  }

  const transferRequests = await transferRequestRepository.model
    .find(filter)
    .populate("repairOrderId")
    .populate("fromTechnicianId", "fullName email phone role")
    .populate("toTechnicianId", "fullName email phone role")
    .sort({ requestedAt: -1 });

  return { transferRequests };
}

export async function createTransferRequest({ repairOrderId, toTechnicianId, reason }, fromTechnicianId) {
  if (!repairOrderId) {
    throw new ApiError(400, "repairOrderId is required");
  }
  if (!toTechnicianId) {
    throw new ApiError(400, "toTechnicianId is required");
  }

  if (!repairOrderId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(400, "Invalid repairOrderId format");
  }
  if (!toTechnicianId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(400, "Invalid toTechnicianId format");
  }

  const repairOrder = await repairOrderRepository.findById(repairOrderId);
  if (!repairOrder) {
    throw new ApiError(404, "Repair order not found");
  }

  if (String(repairOrder.technicianId) !== String(fromTechnicianId)) {
    throw new ApiError(403, "Only the assigned technician can request a transfer for this repair order");
  }

  if (repairOrder.status === "completed" || repairOrder.status === "cancelled") {
    throw new ApiError(409, `Cannot request a transfer for a ${repairOrder.status} repair order`);
  }

  const toTechnician = await userRepository.findById(toTechnicianId);
  if (!toTechnician || toTechnician.role !== "technician") {
    throw new ApiError(404, "Target technician not found");
  }

  const existingRequest = await transferRequestRepository.findOne({
    repairOrderId,
    fromTechnicianId,
    toTechnicianId,
    status: "pending",
  });

  if (existingRequest) {
    throw new ApiError(409, "A pending transfer request to this technician already exists for this repair order");
  }

  const transferRequest = new transferRequestRepository.model({
    repairOrderId,
    fromTechnicianId,
    toTechnicianId,
    reason: reason?.trim(),
    status: "pending",
  });

  await transferRequest.save();

  if (repairOrder.advisorId) {
    await createNotification({
      userId: repairOrder.advisorId,
      type: "transferRequested",
      title: "Technician transfer requested",
      message: `A technician requested to hand this repair order off to ${toTechnician.fullName || "another technician"}.`,
      refId: repairOrder._id,
      refModel: "RepairOrder",
    });
  }

  return transferRequest;
}

async function resolveTransferRequest(id, resolveNote, resolvedBy, newStatus) {
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(400, "Invalid transfer request ID format");
  }

  const transferRequest = await transferRequestRepository.findById(id);
  if (!transferRequest) {
    throw new ApiError(404, "Transfer request not found");
  }

  if (transferRequest.status !== "pending") {
    throw new ApiError(400, "Only pending transfer requests can be resolved");
  }

  const repairOrder = await repairOrderRepository.findById(transferRequest.repairOrderId);
  if (!repairOrder) {
    throw new ApiError(404, "Repair order not found");
  }

  if (String(repairOrder.technicianId) !== String(transferRequest.fromTechnicianId)) {
    throw new ApiError(400, "Repair order technician assignment has changed and this transfer request cannot be approved");
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

  return transferRequest;
}

export async function approveTransferRequest(id, resolveNote, resolvedBy) {
  return resolveTransferRequest(id, resolveNote, resolvedBy, "approved");
}

export async function rejectTransferRequest(id, resolveNote, resolvedBy) {
  return resolveTransferRequest(id, resolveNote, resolvedBy, "rejected");
}
