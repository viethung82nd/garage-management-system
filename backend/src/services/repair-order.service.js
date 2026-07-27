import { repairOrderRepository } from "../repositories/repair-order.repository.js";
import { serviceRepository } from "../repositories/service.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { invoiceRepository } from "../repositories/invoice.repository.js";
import { TimeLogModel } from "../models/index.js";
import {
  REPAIR_ORDER_STATUSES,
  ORDER_SERVICE_STATUSES,
  WAITING_STATUSES,
  TERMINAL_ORDER_STATUSES,
} from "../models/repair-order.model.js";
import { ApiError } from "../utils/apiError.js";
import { createNotification, notifyRole } from "../utils/notify.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";
import { generateCode } from "../utils/sequence.js";
import { recordStatusChange } from "../utils/orderStatus.js";
import { logAudit } from "../utils/audit.js";
import { runInTransaction } from "../utils/transaction.js";
import { issueReservedStock, releaseReservations } from "../utils/stock.js";
import { createFollowUpForDelivery } from "./follow-up.service.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;

// Default service-warranty window stamped at handover — whichever limit the
// vehicle reaches first. Kept as constants so a shop can tune its guarantee in
// one place.
const WARRANTY_MONTHS = 3;
const WARRANTY_KM = 5000;

// BR-JOB-05: how far actual clocked time may run past a line's catalog
// estimate before it's worth a supervisor's attention. Fires once per line,
// the first time the threshold is crossed — not on every subsequent clock-off
// of an already-flagged line.
const HOURS_OVERRUN_THRESHOLD_PERCENT = 30;

const vehicleCustomerPopulate = {
  path: "customerId",
  select: "fullName phone email accountType role",
};

const repairOrderPopulate = [
  {
    path: "vehicleId",
    select: "licensePlate brand model year color chassisNumber engineNumber customerId lastKnownMileage",
    populate: vehicleCustomerPopulate,
  },
  { path: "inspectionId" },
  { path: "advisorId", select: "fullName email phone role" },
  { path: "services.serviceId", select: "name category" },
  { path: "services.technicianId", select: "fullName email phone role" },
  { path: "stepNotes.technicianId", select: "fullName email phone role" },
];

/** Distinct technician ObjectIds (as strings) across a repair order's service lines. */
function getAssignedTechnicianIds(order) {
  const ids = new Set();
  for (const service of order.services || []) {
    if (service.technicianId) ids.add(String(service.technicianId._id || service.technicianId));
  }
  return ids;
}

/** Fetch all repair orders with optional filters. */
export async function getAllRepairOrders({
  status,
  vehicleId,
  serviceAdvisorId,
  advisorId,
  technicianId,
  readyToInvoice,
}) {
  const normalizedServiceAdvisorId = serviceAdvisorId || advisorId;

  const filter = {};
  if (status) filter.status = status;
  if (vehicleId) filter.vehicleId = vehicleId;
  if (normalizedServiceAdvisorId) filter.advisorId = normalizedServiceAdvisorId;
  if (technicianId) filter["services.technicianId"] = technicianId;

  // The accountant's billing queue. "Ready to invoice" is not a status — since
  // QC now moves a passed order to readyForDelivery, keying the queue off a
  // status string silently missed every QC-passed order. The real condition is:
  // it passed quality control and hasn't been invoiced yet.
  if (readyToInvoice === "true" || readyToInvoice === true) {
    filter.qcPassedAt = { $ne: null };
    filter.invoicedAt = null;
    filter.status = { $nin: ["cancelled", "delivered", "closed"] };
  }

  return repairOrderRepository.model
    .find(filter)
    .populate(repairOrderPopulate)
    .select("-__v")
    .sort({ createdAt: -1 });
}

/** Fetch only the authenticated online customer's repair orders. */
export async function getMyRepairOrders(customerId) {
  const vehicles = await vehicleRepository.model.find({ customerId }).select("_id");
  const vehicleIds = vehicles.map((vehicle) => vehicle._id);

  if (vehicleIds.length === 0) {
    return [];
  }

  return repairOrderRepository.model
    .find({ vehicleId: { $in: vehicleIds } })
    .populate(repairOrderPopulate)
    .select("-__v")
    .sort({ completedAt: -1, startedAt: -1, _id: -1 });
}

/** Fetch a single repair order by ID. */
export async function getRepairOrderById(id) {
  if (!id.match(OID_RE)) {
    throw new ApiError(400, "Invalid repair order ID format");
  }

  const order = await repairOrderRepository.model
    .findById(id)
    .populate(repairOrderPopulate)
    .select("-__v");

  if (!order) {
    throw new ApiError(404, "Repair order not found");
  }

  return order;
}

async function processServices(services) {
  let totalCost = 0;
  const processedServices = [];

  for (const service of services) {
    if (!service.serviceId) {
      throw new ApiError(400, "Service ID is required for all services");
    }

    const serviceDoc = await serviceRepository.findById(service.serviceId);
    if (!serviceDoc) {
      throw new ApiError(404, `Service with ID ${service.serviceId} not found`);
    }

    const quantity = service.quantity || 1;
    const priceAtTime = service.priceAtTime ?? serviceDoc.basePrice;

    processedServices.push({
      serviceId: service.serviceId,
      name: serviceDoc.name,
      priceAtTime,
      quantity,
    });

    totalCost += priceAtTime * quantity;
  }

  return { processedServices, totalCost };
}

/** Create a new repair order. */
export async function createRepairOrder({ vehicleId, serviceAdvisorId, advisorId, services, inspectionId }) {
  const normalizedServiceAdvisorId = serviceAdvisorId || advisorId;

  if (!vehicleId) {
    throw new ApiError(400, "vehicleId is required");
  }

  if (!Array.isArray(services) || services.length === 0) {
    throw new ApiError(400, "At least one service is required");
  }

  const { processedServices, totalCost } = await processServices(services);

  if (normalizedServiceAdvisorId) {
    const serviceAdvisor = await userRepository.findById(normalizedServiceAdvisorId);
    if (!serviceAdvisor) {
      throw new ApiError(404, "Service advisor not found");
    }
  }

  const newOrder = new repairOrderRepository.model({
    code: await generateCode("RO"),
    vehicleId,
    advisorId: normalizedServiceAdvisorId || null,
    inspectionId: inspectionId || null,
    services: processedServices,
    totalCost,
    status: "pending",
  });

  await newOrder.save();

  await recordStatusChange({
    repairOrderId: newOrder._id,
    from: null,
    to: "pending",
    changedBy: normalizedServiceAdvisorId || undefined,
    reason: "Repair order created",
  });

  await newOrder.populate([
    ...repairOrderPopulate.filter((item) => item.path !== "stepNotes.technicianId"),
  ]);

  return newOrder;
}

/** Update a repair order. */
export async function updateRepairOrder(id, { status, serviceAdvisorId, advisorId, services, reason }) {
  const normalizedServiceAdvisorId =
    serviceAdvisorId !== undefined ? serviceAdvisorId : advisorId;

  if (!id.match(OID_RE)) {
    throw new ApiError(400, "Invalid repair order ID format");
  }

  const order = await repairOrderRepository.findById(id);
  if (!order) {
    throw new ApiError(404, "Repair order not found");
  }

  const previousStatus = order.status;

  if (status) {
    if (!REPAIR_ORDER_STATUSES.includes(status)) {
      throw new ApiError(400, `Invalid status. Must be one of: ${REPAIR_ORDER_STATUSES.join(", ")}`);
    }

    // A terminal order (closed/cancelled) is finished business — it must not
    // be casually re-statused through a routine update, same as the
    // progress-update endpoint below.
    if (TERMINAL_ORDER_STATUSES.includes(previousStatus) && status !== previousStatus) {
      throw new ApiError(400, `Cannot change status of a ${previousStatus} repair order`);
    }

    // Exception states exist specifically so a wait has to be explainable —
    // an unexplained "waitingParts" is exactly the blind spot they replace.
    if (WAITING_STATUSES.includes(status) && !reason?.trim()) {
      throw new ApiError(400, "A reason is required when moving a repair order into a waiting/on-hold status");
    }

    order.status = status;

    if (status === "inProgress" && !order.startedAt) {
      order.startedAt = new Date();
    }
    if (status === "completed" && !order.completedAt) {
      order.completedAt = new Date();
    }

    // clockOn already refuses to open a time log while an order sits in a
    // WAITING_STATUS (see the comment above it) — but nothing stopped an SA
    // moving an order into one of these states from here while a technician
    // already had a span open on it, leaving that span running indefinitely
    // uncounted against a job that's supposedly paused. Closing it here is
    // the other half of that same guarantee: a waiting order can never have
    // an open time log, regardless of which side caused the transition.
    if (WAITING_STATUSES.includes(status)) {
      const openTimeLog = await TimeLogModel.findOne({ repairOrderId: order._id, endedAt: null });
      if (openTimeLog) {
        const endedAt = new Date();
        openTimeLog.endedAt = endedAt;
        openTimeLog.durationMinutes = Math.max(
          0,
          Math.round((endedAt - openTimeLog.startedAt) / 60000),
        );
        openTimeLog.pauseReason = reason?.trim() || `Order moved to ${status}`;
        await openTimeLog.save();
      }
    }
  }

  if (normalizedServiceAdvisorId !== undefined) {
    if (normalizedServiceAdvisorId && !normalizedServiceAdvisorId.match(OID_RE)) {
      throw new ApiError(400, "Invalid service advisor ID format");
    }
    if (normalizedServiceAdvisorId) {
      const serviceAdvisor = await userRepository.findById(normalizedServiceAdvisorId);
      if (!serviceAdvisor) {
        throw new ApiError(404, "Service advisor not found");
      }
    }
    order.advisorId = normalizedServiceAdvisorId || null;
  }

  if (services && Array.isArray(services)) {
    if (services.length === 0) {
      throw new ApiError(400, "At least one service is required");
    }
    const { processedServices, totalCost } = await processServices(services);
    order.services = processedServices;
    order.totalCost = totalCost;
  }

  await order.save();

  if (status) {
    await recordStatusChange({
      repairOrderId: order._id,
      from: previousStatus,
      to: order.status,
      changedBy: normalizedServiceAdvisorId || undefined,
      reason: reason?.trim() || undefined,
    });
  }

  await order.populate([
    ...repairOrderPopulate.filter((item) => item.path !== "stepNotes.technicianId"),
  ]);

  return order;
}

/**
 * Assigns (or reassigns/clears) the technician for one or more service lines
 * on a repair order — the only place that writes RepairOrder.services[].technicianId.
 * A repair order can end up with several distinct technicians this way, one
 * per line, instead of the single whole-order assignment this replaces.
 */
export async function assignServiceTechnicians(id, assignments) {
  if (!id.match(OID_RE)) {
    throw new ApiError(400, "Invalid repair order ID format");
  }
  if (!Array.isArray(assignments) || assignments.length === 0) {
    throw new ApiError(400, "At least one assignment is required");
  }

  const order = await repairOrderRepository.findById(id);
  if (!order) {
    throw new ApiError(404, "Repair order not found");
  }

  if (TERMINAL_ORDER_STATUSES.includes(order.status) || ["readyForDelivery", "delivered"].includes(order.status)) {
    throw new ApiError(409, `Cannot reassign technicians on a ${order.status} repair order`);
  }

  const technicianCache = new Map();
  async function resolveTechnician(technicianId) {
    if (!technicianId) return null;
    if (!technicianId.match(OID_RE)) {
      throw new ApiError(400, "Invalid technician ID format");
    }
    if (technicianCache.has(technicianId)) return technicianCache.get(technicianId);
    const technician = await userRepository.findById(technicianId);
    if (!technician || technician.role !== "technician") {
      throw new ApiError(404, `Technician ${technicianId} not found`);
    }
    technicianCache.set(technicianId, technician);
    return technician;
  }

  // Newly-assigned technician (id) -> the names of the line(s) they just got,
  // so each gets exactly one notification even if they picked up several lines.
  const newlyAssigned = new Map();

  for (const assignment of assignments) {
    const lineIndex = Number(assignment?.lineIndex);
    if (!Number.isInteger(lineIndex) || lineIndex < 0 || lineIndex >= order.services.length) {
      throw new ApiError(400, `Invalid lineIndex: ${assignment?.lineIndex}`);
    }
    const line = order.services[lineIndex];
    if (line.status === "completed") {
      throw new ApiError(409, `Line ${lineIndex} (${line.name}) is already completed and cannot be reassigned`);
    }

    const nextTechnicianId = assignment.technicianId || null;
    const previousTechnicianId = line.technicianId ? String(line.technicianId) : null;
    if (String(nextTechnicianId) === previousTechnicianId) continue;

    if (nextTechnicianId) {
      await resolveTechnician(nextTechnicianId);
      const names = newlyAssigned.get(nextTechnicianId) || [];
      names.push(line.name);
      newlyAssigned.set(nextTechnicianId, names);
    }

    line.technicianId = nextTechnicianId;
  }

  await order.save();
  await order.populate([
    ...repairOrderPopulate.filter((item) => item.path !== "stepNotes.technicianId"),
  ]);

  if (newlyAssigned.size > 0) {
    const vehicleLabel = order.vehicleId?.licensePlate
      ? `${order.vehicleId.licensePlate}${order.vehicleId.model ? ` (${order.vehicleId.model})` : ""}`
      : "a vehicle";
    await Promise.all(
      [...newlyAssigned.entries()].map(([technicianId, names]) =>
        createNotification({
          userId: technicianId,
          type: "repairOrderAssigned",
          title: names.length > 1 ? "New repair order services assigned" : "New repair order service assigned",
          message: `You've been assigned ${names.length} service(s) on a repair order for ${vehicleLabel}: ${names.join(", ")}.`,
          refId: order._id,
          refModel: "RepairOrder",
        }),
      ),
    );
  }

  return order;
}

/** Update repair order progress (status + optional notes). */
export async function updateRepairProgress(id, { status, notes, stepIndex, cause, correction }, actorId, actorRole) {
  if (!id.match(OID_RE)) {
    throw new ApiError(400, "Invalid repair order ID format");
  }

  if (!status) {
    throw new ApiError(400, "Status is required");
  }

  const order = await repairOrderRepository.findById(id);
  if (!order) {
    throw new ApiError(404, "Repair order not found");
  }

  if (order.status === "completed" && status !== "completed") {
    throw new ApiError(400, "Cannot change status of a completed repair order");
  }

  // A terminal order (closed/cancelled) is finished business — it must not be
  // casually re-statused via a routine progress update.
  if (TERMINAL_ORDER_STATUSES.includes(order.status) && status !== order.status) {
    throw new ApiError(400, `Cannot change status of a ${order.status} repair order`);
  }

  const previousStatus = order.status;
  const hasStepIndex = stepIndex !== undefined && stepIndex !== null;

  if (hasStepIndex) {
    // Per-line update — a technician working one service on a multi-line
    // order shouldn't be able to mark the whole order (and therefore the
    // whole job) complete by finishing just one line. The order's own
    // status is derived from the aggregate of its lines below, never set
    // directly from the request in this branch.
    const index = Number(stepIndex);
    if (!Number.isInteger(index) || index < 0 || index >= order.services.length) {
      throw new ApiError(400, "Invalid stepIndex");
    }
    if (!ORDER_SERVICE_STATUSES.includes(status)) {
      throw new ApiError(400, `A step's status must be one of: ${ORDER_SERVICE_STATUSES.join(", ")}`);
    }

    // BR-JOB-01 at line scope: a technician may only touch the line assigned
    // to them, not any line on the order. Admin/SA are trusted more broadly.
    if (actorRole === "technician") {
      const lineTechnicianId = order.services[index].technicianId;
      if (!lineTechnicianId || String(lineTechnicianId) !== String(actorId)) {
        throw new ApiError(403, "Only the technician assigned to this service line can update it");
      }
    }

    // BR-JOB-04: 3C (Cause/Correction — the line itself is the Complaint) is
    // warranty and dispute documentation, not a nice-to-have note. A line
    // can't reach "completed" without it on record, whether it was already
    // saved on an earlier partial update or is arriving with this one.
    if (status === "completed") {
      const nextCause =
        (typeof cause === "string" && cause.trim()) || order.services[index].cause;
      const nextCorrection =
        (typeof correction === "string" && correction.trim()) || order.services[index].correction;
      if (!nextCause || !nextCorrection) {
        throw new ApiError(
          400,
          "Cause and correction (3C) must be recorded before this line can be marked complete",
        );
      }
    }

    order.services[index].status = status;
    // 3C record for this line (Cause / Correction) — the technician's account
    // of why it failed and what they did, kept for warranty and disputes.
    if (typeof cause === "string" && cause.trim()) order.services[index].cause = cause.trim();
    if (typeof correction === "string" && correction.trim()) {
      order.services[index].correction = correction.trim();
    }
    // Per-line completion timestamp — needed to time-bound per-technician
    // reporting (a multi-tech order's own completedAt only fires once every
    // line is done, which would misattribute everyone to that last moment).
    if (status === "completed") {
      if (!order.services[index].completedAt) order.services[index].completedAt = new Date();
    } else {
      order.services[index].completedAt = undefined;
    }

    // Only recompute the order's own status from its lines while the order
    // is still in one of its normal working states. Once it has moved past
    // that — QC passed (readyForDelivery/delivered/closed) or parked in a
    // waiting/on-hold state — a technician touching a single line must not
    // silently drag the whole order back into "inProgress" or forward into
    // "completed"; those transitions now go through their own gated actions
    // (QC, delivery, the waiting-status reason requirement below).
    const DERIVABLE_ORDER_STATUSES = ["pending", "inProgress", "completed", "reworkRequired"];
    if (DERIVABLE_ORDER_STATUSES.includes(previousStatus)) {
      const serviceStatuses = order.services.map((service) => service.status || "pending");
      if (serviceStatuses.every((value) => value === "completed")) {
        order.status = "completed";
      } else if (serviceStatuses.some((value) => value === "inProgress" || value === "completed")) {
        order.status = "inProgress";
      } else {
        order.status = "pending";
      }
    }
  } else {
    if (!REPAIR_ORDER_STATUSES.includes(status)) {
      throw new ApiError(400, `Invalid status. Must be one of: ${REPAIR_ORDER_STATUSES.join(", ")}`);
    }

    // A technician acting on the whole order (no stepIndex) must at least be
    // assigned to one of its lines — otherwise they have no business on this
    // order at all. Which of several assigned technicians may do this isn't
    // further restricted.
    if (actorRole === "technician" && !getAssignedTechnicianIds(order).has(String(actorId))) {
      throw new ApiError(403, "You are not assigned to any service on this repair order");
    }

    // Exception states exist specifically so a wait has to be explainable —
    // an unexplained "waitingParts" is exactly the blind spot they replace.
    if (WAITING_STATUSES.includes(status) && !notes?.trim()) {
      throw new ApiError(400, "A reason is required when moving a repair order into a waiting/on-hold status");
    }

    order.status = status;
  }

  if (order.status === "inProgress" && !order.startedAt) {
    order.startedAt = new Date();
  }

  if (order.status === "completed" && !order.completedAt) {
    order.completedAt = new Date();
  }

  if (notes && notes.trim()) {
    const newNote = {
      content: `[${previousStatus} → ${order.status}] ${notes.trim()}`,
      technicianId: actorId,
      createdAt: new Date(),
    };
    if (hasStepIndex) newNote.stepIndex = Number(stepIndex);

    order.stepNotes.push(newNote);
  }

  await order.save();

  await recordStatusChange({
    repairOrderId: order._id,
    from: previousStatus,
    to: order.status,
    changedBy: actorId || undefined,
    reason: notes?.trim() || undefined,
  });

  await order.populate([
    ...repairOrderPopulate.filter((item) => item.path !== "inspectionId"),
  ]);

  return {
    message: `Repair order status updated from ${previousStatus} to ${order.status}`,
    order,
  };
}

/** Delete a repair order (only if pending). */
export async function deleteRepairOrder(id) {
  if (!id.match(OID_RE)) {
    throw new ApiError(400, "Invalid repair order ID format");
  }

  const order = await repairOrderRepository.findById(id);
  if (!order) {
    throw new ApiError(404, "Repair order not found");
  }

  if (order.status !== "pending") {
    throw new ApiError(400, "Can only delete repair orders with pending status");
  }

  // Any stock held for this order has to go back to being sellable, or it
  // stays invisibly committed to an order that no longer exists.
  await runInTransaction(async (session) => {
    await releaseReservations({ repairOrderId: order._id }, session);
    await repairOrderRepository.model.findByIdAndDelete(id).session(session);
  });

  return { message: "Repair order deleted successfully", id };
}

// ============= STEP NOTES =============

/** Add a step note to a repair order. */
export async function addStepNote(id, { content, stepIndex, technicianId: overrideTechnicianId }, requester, files) {
  // The note author is always the authenticated caller, not a value the
  // client asserts — a technician calling this always leaves a note as
  // themselves; only an admin adding a note on someone else's behalf may
  // override it.
  const technicianId =
    requester.role === "admin" && overrideTechnicianId ? overrideTechnicianId : requester.sub;

  if (!id.match(OID_RE)) {
    throw new ApiError(400, "Invalid repair order ID format");
  }

  if (!content || !content.trim()) {
    throw new ApiError(400, "Note content is required");
  }

  if (!technicianId.match(OID_RE)) {
    throw new ApiError(400, "Invalid technician ID format");
  }

  const technician = await userRepository.findById(technicianId);
  if (!technician) {
    throw new ApiError(404, "Technician not found");
  }

  const order = await repairOrderRepository.findById(id);
  if (!order) {
    throw new ApiError(404, "Repair order not found");
  }

  let normalizedStepIndex;
  if (stepIndex !== undefined && stepIndex !== null) {
    normalizedStepIndex = Number(stepIndex);
    if (
      !Number.isInteger(normalizedStepIndex) ||
      normalizedStepIndex < 0 ||
      normalizedStepIndex >= order.services.length
    ) {
      throw new ApiError(400, "Invalid stepIndex");
    }
  }

  const uploadedPhotos = await Promise.all(
    (files ?? []).map((file) => uploadBufferToCloudinary(file.buffer, "step-note-photos")),
  );

  const newNote = {
    content: content.trim(),
    technicianId,
    createdAt: new Date(),
  };
  if (normalizedStepIndex !== undefined) newNote.stepIndex = normalizedStepIndex;
  if (uploadedPhotos.length) newNote.photos = uploadedPhotos.map((result) => result.secure_url);

  order.stepNotes.push(newNote);
  await order.save();

  await order.populate("stepNotes.technicianId", "fullName email phone role");

  return { message: "Step note added successfully", stepNotes: order.stepNotes };
}

/** Get all step notes for a repair order. */
export async function getStepNotes(id) {
  if (!id.match(OID_RE)) {
    throw new ApiError(400, "Invalid repair order ID format");
  }

  const order = await repairOrderRepository.model
    .findById(id)
    .populate("stepNotes.technicianId", "fullName email phone role");

  if (!order) {
    throw new ApiError(404, "Repair order not found");
  }

  return order.stepNotes;
}

/** Delete a step note from a repair order. */
export async function deleteStepNote(orderId, noteIndex) {
  if (!orderId.match(OID_RE)) {
    throw new ApiError(400, "Invalid repair order ID format");
  }

  const order = await repairOrderRepository.findById(orderId);
  if (!order) {
    throw new ApiError(404, "Repair order not found");
  }

  const index = parseInt(noteIndex);
  if (isNaN(index) || index < 0 || index >= order.stepNotes.length) {
    throw new ApiError(400, "Invalid note index");
  }

  order.stepNotes.splice(index, 1);
  await order.save();

  return { message: "Step note deleted successfully", stepNotes: order.stepNotes };
}

export async function getRepairOrderStatus(id) {
  if (!id.match(OID_RE)) {
    throw new ApiError(400, "Invalid repair order ID format");
  }

  const repairOrder = await repairOrderRepository.model
    .findById(id)
    .populate("vehicleId")
    .populate("services.technicianId", "fullName phone")
    .populate("advisorId", "fullName");

  if (!repairOrder) {
    return null;
  }

  const technicians = new Map();
  for (const service of repairOrder.services) {
    const tech = service.technicianId;
    if (tech) technicians.set(String(tech._id), { id: tech._id, name: tech.fullName, phone: tech.phone });
  }

  return {
    repairOrderId: repairOrder._id,
    status: repairOrder.status,
    vehicle: {
      id: repairOrder.vehicleId._id,
      licensePlate: repairOrder.vehicleId.licensePlate,
      brand: repairOrder.vehicleId.brand,
      model: repairOrder.vehicleId.model,
    },
    technicians: [...technicians.values()],
    services: repairOrder.services.map((service) => ({
      name: service.name,
      price: service.priceAtTime,
      quantity: service.quantity,
    })),
    notes: repairOrder.stepNotes,
    startedAt: repairOrder.startedAt,
    completedAt: repairOrder.completedAt,
    totalCost: repairOrder.totalCost,
  };
}

export async function getRepairOrderSummary(id) {
  if (!id.match(OID_RE)) {
    throw new ApiError(400, "Invalid repair order ID format");
  }
  const order = await repairOrderRepository.model
    .findById(id)
    .select("services totalCost completedAt");
  if (!order) {
    throw new ApiError(404, "Repair order not found");
  }
  return {
    services: order.services,
    totalCost: order.totalCost,
    completedAt: order.completedAt,
  };
}

/**
 * Service Advisor (or QC inspector) reviews a technician-completed order.
 * Pass moves it to "readyForDelivery" — this, not a technician's own
 * "completed", is what actually authorizes invoicing (see
 * invoice.service.js#generateInvoiceFromRepairOrder) and eventual handover.
 * Fail sends it back to the technician as "reworkRequired". Only orders
 * already marked "completed" by a technician can be reviewed — matches the
 * frontend's own ?status=completed query for the review queue.
 */
export async function submitQualityCheck(id, { passed, items, note, reworkReason, testDriveKm }, reviewerId) {
  if (!id.match(OID_RE)) {
    throw new ApiError(400, "Invalid repair order ID format");
  }
  if (typeof passed !== "boolean") {
    throw new ApiError(400, "passed (boolean) is required");
  }

  const order = await repairOrderRepository.findById(id);
  if (!order) {
    throw new ApiError(404, "Repair order not found");
  }
  if (order.status !== "completed") {
    throw new ApiError(400, "Only a repair order marked completed by the technician can be quality-checked");
  }

  // Separation of duties: none of the technicians who did the work can also
  // be the one who passes it — otherwise QC is a rubber stamp instead of an
  // independent check. (No such conflict is possible when no line has a
  // technician assigned, so that case is left alone.)
  if (getAssignedTechnicianIds(order).has(String(reviewerId))) {
    throw new ApiError(403, "A technician who performed this work cannot also pass its quality check");
  }

  const failedItems = Array.isArray(items) ? items.filter((item) => item?.result === "fail") : [];

  // Persist the checklist the inspector actually ran and, for a road-tested
  // job, how far it was driven — so a QC record is auditable, not just a
  // timestamp.
  if (Array.isArray(items)) {
    order.qcChecklist = items.map((item) => ({
      label: item?.label,
      result: item?.result === "fail" ? "fail" : item?.result === "na" ? "na" : "pass",
      note: item?.note,
    }));
  }
  if (testDriveKm !== undefined && testDriveKm !== null && testDriveKm !== "") {
    const km = Number(testDriveKm);
    if (!Number.isNaN(km) && km >= 0) order.qcTestDriveKm = km;
  }

  const previousStatus = order.status;
  let summary;
  if (passed) {
    order.completedAt = order.completedAt || new Date();
    // This — not status === "completed" — is what authorises invoicing and
    // handover from here on.
    order.qcPassedAt = new Date();
    order.qcBy = reviewerId;
    order.status = "readyForDelivery";
    summary = note?.trim() ? `[QC pass] ${note.trim()}` : "[QC pass] Quality check passed.";
  } else {
    order.status = "reworkRequired";
    // A failed check must never leave a stale pass behind: if this order was
    // somehow re-checked after an earlier pass, a fail here must not let it
    // still look QC-approved.
    order.qcPassedAt = undefined;
    order.qcBy = undefined;
    const reason =
      reworkReason?.trim() ||
      failedItems.map((item) => item.label).filter(Boolean).join(", ") ||
      "Quality check failed";
    summary = `[QC fail] ${reason}`;
  }

  order.stepNotes.push({
    content: summary,
    technicianId: reviewerId,
    createdAt: new Date(),
  });

  await order.save();

  // QC is a controlled, auditable event regardless of outcome.
  await logAudit({
    action: "qcSubmitted",
    actorId: reviewerId,
    repairOrderId: order._id,
    details: summary,
  });

  // Every QC outcome moves the order's status now (pass -> readyForDelivery,
  // fail -> reworkRequired) — record both transitions, not just the fail one.
  await recordStatusChange({
    repairOrderId: order._id,
    from: previousStatus,
    to: order.status,
    changedBy: reviewerId,
    reason: summary.replace(/^\[QC (?:pass|fail)\]\s*/, ""),
  });

  await Promise.all(
    [...getAssignedTechnicianIds(order)].map((technicianId) =>
      createNotification({
        userId: technicianId,
        type: passed ? "qualityCheckPassed" : "qualityCheckFailed",
        title: passed ? "Repair order passed quality check" : "Repair order sent back for rework",
        message: passed
          ? "Your work passed quality check and is ready for handover."
          : summary.replace(/^\[QC fail\]\s*/, ""),
        refId: order._id,
        refModel: "RepairOrder",
      }),
    ),
  );

  return {
    message: passed ? "Repair order passed quality check" : "Repair order sent back for rework",
    order,
  };
}

/**
 * The real "end of the SA's part of the job" action: only available once QC
 * has actually passed (order.qcPassedAt set — the order's status by this
 * point is "readyForDelivery", not "completed"; see submitQualityCheck).
 * Notifies every accountant that an order is ready to invoice. Idempotent-ish:
 * forwardedToAccountantAt is set once and the endpoint refuses to re-forward,
 * so the frontend can hide the button afterward instead of risking duplicate
 * accountant notifications.
 */
export async function forwardToAccountant(id) {
  if (!id.match(OID_RE)) {
    throw new ApiError(400, "Invalid repair order ID format");
  }

  const order = await repairOrderRepository.model
    .findById(id)
    .populate("vehicleId", "licensePlate brand model");
  if (!order) {
    throw new ApiError(404, "Repair order not found");
  }
  if (!order.qcPassedAt) {
    throw new ApiError(400, "Only a repair order that passed quality check can be forwarded");
  }
  if (order.forwardedToAccountantAt) {
    throw new ApiError(409, "This repair order has already been forwarded to accounting");
  }

  order.forwardedToAccountantAt = new Date();
  await order.save();

  const vehicleLabel = order.vehicleId
    ? [order.vehicleId.brand, order.vehicleId.model, order.vehicleId.licensePlate].filter(Boolean).join(" ")
    : "a vehicle";

  await notifyRole("accountant", {
    type: "repairOrderReadyToInvoice",
    title: "Repair order ready to invoice",
    message: `Repair order for ${vehicleLabel} passed quality check and is ready to invoice.`,
    refId: order._id,
    refModel: "RepairOrder",
  });

  return { message: "Repair order forwarded to accounting", order };
}

/**
 * Hands the vehicle back to the customer — the last step in the order's
 * lifecycle. Gated on two independent things that both must be true before a
 * car leaves the garage: the work actually passed QC (not just got marked
 * "completed" by whoever did it), and the customer has actually paid for it —
 * an invoice that merely exists but is still unpaid is billed, not settled.
 */
export async function deliverVehicle(id, { note, signature, oldPartsReturned }, actorId) {
  if (!id.match(OID_RE)) {
    throw new ApiError(400, "Invalid repair order ID format");
  }

  const order = await repairOrderRepository.findById(id);
  if (!order) {
    throw new ApiError(404, "Repair order not found");
  }

  if (!order.qcPassedAt) {
    throw new ApiError(409, "This repair order has not passed quality check and cannot be delivered");
  }

  // The vehicle must be billed — and paid for — before it leaves. No invoice
  // at all is refused for the same reason as an unpaid one: either way the
  // customer hasn't settled up yet.
  const invoice = await invoiceRepository.findOne({ repairOrderId: order._id });
  if (!invoice) {
    throw new ApiError(409, "This repair order has not been invoiced yet; bill the customer before handover");
  }
  if (invoice.status !== "paid") {
    throw new ApiError(409, "This repair order's invoice has not been paid in full; settle payment before handover");
  }

  const previousStatus = order.status;

  // Stamp the service warranty at handover. It runs until whichever comes first
  // — WARRANTY_MONTHS from today, or the current odometer + WARRANTY_KM — so a
  // later return is checkable as "still covered" instead of being argued about.
  const deliveredAt = new Date();
  const warrantyUntilDate = new Date(deliveredAt);
  warrantyUntilDate.setMonth(warrantyUntilDate.getMonth() + WARRANTY_MONTHS);
  const vehicleForWarranty = await vehicleRepository.model
    .findById(order.vehicleId)
    .select("lastKnownMileage customerId");
  const warrantyUntilKm =
    typeof vehicleForWarranty?.lastKnownMileage === "number"
      ? vehicleForWarranty.lastKnownMileage + WARRANTY_KM
      : undefined;

  await runInTransaction(async (session) => {
    order.deliveredAt = deliveredAt;
    order.deliveredBy = actorId;
    order.status = "delivered";
    order.warrantyUntilDate = warrantyUntilDate;
    if (warrantyUntilKm !== undefined) order.warrantyUntilKm = warrantyUntilKm;
    if (signature) order.deliverySignature = signature;
    if (oldPartsReturned !== undefined) order.oldPartsReturned = Boolean(oldPartsReturned);
    await order.save({ session });

    // Safety net: normally the store issues parts explicitly (POST
    // /:id/issue-parts) while the job is in progress. If that was skipped, the
    // car must not leave with stock still shown as sitting on the shelf — so
    // any reservation still outstanding is consumed here. Idempotent: an order
    // whose parts were already issued has no active reservations left.
    await issueReservedStock({ repairOrderId: order._id, actorId }, session);
  });

  await recordStatusChange({
    repairOrderId: order._id,
    from: previousStatus,
    to: order.status,
    changedBy: actorId,
    reason: note?.trim() || undefined,
  });

  // Open the post-delivery follow-up (due in 72h) as a side effect of handover,
  // so Step 7 happens automatically instead of only when someone runs the
  // back-fill. Best-effort: a follow-up hiccup must not fail the handover.
  try {
    await createFollowUpForDelivery({
      repairOrderId: order._id,
      vehicleId: order.vehicleId,
      customerId: vehicleForWarranty?.customerId,
      deliveredAt,
    });
  } catch (err) {
    console.warn("[deliverVehicle] failed to open follow-up:", err?.message ?? err);
  }

  await order.populate([
    ...repairOrderPopulate.filter((item) => item.path !== "stepNotes.technicianId"),
  ]);

  return order;
}

/**
 * The store hands the reserved parts to the technician. This is the moment
 * stock physically leaves the shelf, so it is when `stockQuantity` drops and
 * an `issue` ledger entry is written with the cost frozen at that instant.
 *
 * Separate from delivery on purpose: parts are consumed while the job is being
 * worked, not when the customer collects the car, and it gives the parts desk
 * an explicit action rather than making stock a silent side effect.
 */
export async function issuePartsForOrder(id, actorId, actorRole) {
  if (!id.match(OID_RE)) {
    throw new ApiError(400, "Invalid repair order ID format");
  }

  const order = await repairOrderRepository.findById(id);
  if (!order) {
    throw new ApiError(404, "Repair order not found");
  }
  if (TERMINAL_ORDER_STATUSES.includes(order.status)) {
    throw new ApiError(409, `Cannot issue parts for a ${order.status} repair order`);
  }

  // BR-JOB-01, same rule as clockOn: a technician can only act on an order
  // they have at least one assigned line on. The parts desk / advisor / admin
  // roles are trusted more broadly and skip this check.
  if (actorRole === "technician" && !getAssignedTechnicianIds(order).has(String(actorId))) {
    throw new ApiError(403, "Only a technician assigned to this repair order can issue its parts");
  }

  const result = await runInTransaction(async (session) =>
    issueReservedStock({ repairOrderId: order._id, actorId }, session),
  );

  if (result.issued.length === 0) {
    return { message: "No parts were awaiting issue for this repair order", issued: [] };
  }

  return {
    message: `Issued ${result.issued.length} part line(s) to the repair order`,
    issued: result.issued,
  };
}

// ============= TECHNICIAN TIME LOGGING (Phase 4a) =============
//
// clockOn/clockOff bracket a single span of hands-on work by one technician
// on one order (optionally one service line) — see time-log.model.js for why
// this exists: none of the workshop's real KPIs (technician productivity,
// technician efficiency, effective labour rate) can be computed from the
// order's own startedAt/completedAt alone, since those span waiting time too.
//
// Time accrued while an order sits in a WAITING_STATUSES state is never
// captured here. That's not a filter applied afterwards — clockOn refuses
// outright to open a span while the order is waitingParts/waitingCustomer/
// onHold, so there is never an open time log to mis-attribute to the
// technician in the first place. That's what keeps waiting time out of
// technician productivity instead of it having to be subtracted back out of
// the numbers later.

/**
 * Technician clocks on to start hands-on work on a repair order (optionally
 * pinned to one service line). Opens a TimeLog row; the first clock-on on a
 * still-pending order also moves it into "inProgress".
 */
export async function clockOn(orderId, { lineIndex, note }, technicianId, actorRole) {
  if (!orderId.match(OID_RE)) {
    throw new ApiError(400, "Invalid repair order ID format");
  }

  const order = await repairOrderRepository.findById(orderId);
  if (!order) {
    throw new ApiError(404, "Repair order not found");
  }

  if (TERMINAL_ORDER_STATUSES.includes(order.status)) {
    throw new ApiError(409, `Cannot clock on to a ${order.status} repair order`);
  }

  // A technician now always clocks on to one specific line, not "the order"
  // — that's the only way clock-on authorization can mean anything once a
  // single order can have several technicians on different lines.
  if (lineIndex === undefined || lineIndex === null) {
    throw new ApiError(400, "lineIndex is required");
  }
  const normalizedLineIndex = Number(lineIndex);
  if (
    !Number.isInteger(normalizedLineIndex) ||
    normalizedLineIndex < 0 ||
    normalizedLineIndex >= order.services.length
  ) {
    throw new ApiError(400, "Invalid lineIndex");
  }

  // BR-JOB-01: work only happens on what's actually been assigned — a
  // technician can't just pick up any line on the floor. Admin keeps override
  // access for support/testing.
  if (actorRole !== "admin") {
    const lineTechnicianId = order.services[normalizedLineIndex].technicianId;
    if (!lineTechnicianId) {
      throw new ApiError(409, "This service line has no technician assigned yet");
    }
    if (String(lineTechnicianId) !== String(technicianId)) {
      throw new ApiError(403, "Only the technician assigned to this service line can clock on to it");
    }
  }

  // The whole point of the waiting/on-hold states is that the vehicle is
  // parked on something outside the workshop's control — a technician cannot
  // be "working" it while it's there, so no time log may open in this state.
  if (WAITING_STATUSES.includes(order.status)) {
    throw new ApiError(
      409,
      `Cannot clock on to a repair order that is ${order.status} — resolve the wait before logging time on it`,
    );
  }

  // One pair of hands can't be on two jobs at once. This checks across ALL
  // orders, not just this one, so a technician can't forget to clock off job
  // A before clocking on to job B.
  const openElsewhere = await TimeLogModel.findOne({ technicianId, endedAt: null });
  if (openElsewhere) {
    throw new ApiError(
      409,
      "You already have an open time log running; clock off it before starting another",
    );
  }

  const timeLog = await TimeLogModel.create({
    repairOrderId: order._id,
    technicianId,
    lineIndex: normalizedLineIndex,
    startedAt: new Date(),
    endedAt: null,
    ...(note?.trim() ? { note: note.trim() } : {}),
  });

  // A fresh order's first hands-on work is what actually starts the job.
  // An order that's already inProgress/readyForDelivery/etc. is left alone —
  // a second technician (or the same one) clocking on to another line must
  // not reset or otherwise disturb its current status.
  if (order.status === "pending") {
    const previousStatus = order.status;
    order.status = "inProgress";
    if (!order.startedAt) order.startedAt = new Date();
    await order.save();

    await recordStatusChange({
      repairOrderId: order._id,
      from: previousStatus,
      to: order.status,
      changedBy: technicianId,
      reason: "Technician clocked on",
    });
  }

  return timeLog;
}

/**
 * Technician clocks off, closing their own open time log on this order.
 * Purely "hands off for now" — it deliberately does not touch the order's
 * status. Marking the work done is a separate, explicit action
 * (updateRepairProgress), so a technician stepping away for a break doesn't
 * accidentally complete or otherwise progress the job.
 */
export async function clockOff(orderId, { pauseReason, note }, technicianId) {
  if (!orderId.match(OID_RE)) {
    throw new ApiError(400, "Invalid repair order ID format");
  }

  const timeLog = await TimeLogModel.findOne({
    repairOrderId: orderId,
    technicianId,
    endedAt: null,
  });
  if (!timeLog) {
    throw new ApiError(409, "You have no open time log on this repair order");
  }

  const endedAt = new Date();
  const durationMinutes = Math.max(0, Math.round((endedAt - timeLog.startedAt) / 60000));

  timeLog.endedAt = endedAt;
  timeLog.durationMinutes = durationMinutes;
  if (pauseReason !== undefined) timeLog.pauseReason = pauseReason?.trim() || undefined;
  if (note !== undefined) timeLog.note = note?.trim() || undefined;

  await timeLog.save();

  await checkLaborOverrun(orderId, timeLog, durationMinutes);

  return timeLog;
}

/**
 * BR-JOB-05: compare a line's total clocked minutes (across every technician
 * and every clock-on/off span) against its catalog estimate, and alert once
 * if it has just crossed the overrun threshold. Best-effort and non-blocking
 * for the same reason every notification in this file is — a reporting side
 * effect must never fail the clock-off itself.
 */
async function checkLaborOverrun(orderId, closedTimeLog, justClosedMinutes) {
  if (closedTimeLog.lineIndex === undefined || closedTimeLog.lineIndex === null) return;

  try {
    const order = await repairOrderRepository.model
      .findById(orderId)
      .select("code services vehicleId")
      .populate({ path: "services.serviceId", select: "estimatedDuration" })
      .populate({ path: "vehicleId", select: "licensePlate brand model" })
      .lean();
    const line = order?.services?.[closedTimeLog.lineIndex];
    const estimatedMinutes = line?.serviceId?.estimatedDuration;
    if (!estimatedMinutes || estimatedMinutes <= 0) return;

    const lineLogs = await TimeLogModel.find({
      repairOrderId: orderId,
      lineIndex: closedTimeLog.lineIndex,
      endedAt: { $ne: null },
    })
      .select("durationMinutes")
      .lean();
    const actualMinutes = lineLogs.reduce((sum, log) => sum + (log.durationMinutes || 0), 0);
    const overrunPercent = ((actualMinutes - estimatedMinutes) / estimatedMinutes) * 100;
    if (overrunPercent < HOURS_OVERRUN_THRESHOLD_PERCENT) return;

    // Already over threshold before this span closed — already alerted once.
    const priorMinutes = actualMinutes - justClosedMinutes;
    const priorOverrunPercent = ((priorMinutes - estimatedMinutes) / estimatedMinutes) * 100;
    if (priorMinutes > 0 && priorOverrunPercent >= HOURS_OVERRUN_THRESHOLD_PERCENT) return;

    const vehicleLabel = order.vehicleId
      ? [order.vehicleId.brand, order.vehicleId.model, order.vehicleId.licensePlate].filter(Boolean).join(" ")
      : "a vehicle";
    const lineName = line?.name || "a job";
    const payload = {
      type: "laborOverrun",
      title: "Job running over its estimate",
      message: `${lineName} on ${order.code || vehicleLabel} has run ${Math.round(actualMinutes)} min against an estimate of ${estimatedMinutes} min (+${Math.round(overrunPercent)}%).`,
      refId: order._id,
      refModel: "RepairOrder",
    };
    await Promise.all([notifyRole("serviceAdvisor", payload), notifyRole("admin", payload)]);
  } catch (err) {
    console.warn("[repair-order] labor overrun check failed:", err?.message ?? err);
  }
}

/** All time logs for a repair order, plus the total minutes across closed spans. */
export async function getOrderTimeLogs(orderId) {
  if (!orderId.match(OID_RE)) {
    throw new ApiError(400, "Invalid repair order ID format");
  }

  const order = await repairOrderRepository.findById(orderId);
  if (!order) {
    throw new ApiError(404, "Repair order not found");
  }

  const timeLogs = await TimeLogModel.find({ repairOrderId: orderId })
    .populate("technicianId", "fullName")
    .sort({ startedAt: 1 });

  const totalMinutes = timeLogs.reduce((sum, log) => sum + (log.durationMinutes || 0), 0);

  return { timeLogs, totalMinutes };
}
