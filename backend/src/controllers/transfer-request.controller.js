import {
  RepairOrderModel,
  TransferRequestModel,
  UserModel,
} from "../models/index.js";
import { HttpError } from "../middleware/error.js";

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

  res.status(201).json(transferRequest);
}
