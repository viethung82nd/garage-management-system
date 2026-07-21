import { repairOrderRepository } from "../repositories/repair-order.repository.js";
import { serviceRepository } from "../repositories/service.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { REPAIR_ORDER_STATUSES, ORDER_SERVICE_STATUSES } from "../models/repair-order.model.js";
import { ApiError } from "../utils/apiError.js";
import { createNotification, notifyRole } from "../utils/notify.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;

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
  { path: "technicianId", select: "fullName email phone role" },
  { path: "services.serviceId", select: "name category" },
  { path: "stepNotes.technicianId", select: "fullName email phone role" },
];

/** Fetch all repair orders with optional filters. */
export async function getAllRepairOrders({ status, vehicleId, serviceAdvisorId, advisorId, technicianId }) {
  const normalizedServiceAdvisorId = serviceAdvisorId || advisorId;

  const filter = {};
  if (status) filter.status = status;
  if (vehicleId) filter.vehicleId = vehicleId;
  if (normalizedServiceAdvisorId) filter.advisorId = normalizedServiceAdvisorId;
  if (technicianId) filter.technicianId = technicianId;

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
    vehicleId,
    advisorId: normalizedServiceAdvisorId || null,
    inspectionId: inspectionId || null,
    services: processedServices,
    totalCost,
    status: "pending",
  });

  await newOrder.save();

  await newOrder.populate([
    ...repairOrderPopulate.filter((item) => item.path !== "stepNotes.technicianId"),
  ]);

  return newOrder;
}

/** Update a repair order. */
export async function updateRepairOrder(id, { status, serviceAdvisorId, advisorId, technicianId, services }) {
  const normalizedServiceAdvisorId =
    serviceAdvisorId !== undefined ? serviceAdvisorId : advisorId;

  if (!id.match(OID_RE)) {
    throw new ApiError(400, "Invalid repair order ID format");
  }

  const order = await repairOrderRepository.findById(id);
  if (!order) {
    throw new ApiError(404, "Repair order not found");
  }

  if (status) {
    if (!REPAIR_ORDER_STATUSES.includes(status)) {
      throw new ApiError(400, `Invalid status. Must be one of: ${REPAIR_ORDER_STATUSES.join(", ")}`);
    }
    order.status = status;

    if (status === "inProgress" && !order.startedAt) {
      order.startedAt = new Date();
    }
    if (status === "completed" && !order.completedAt) {
      order.completedAt = new Date();
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

  const previousTechnicianId = order.technicianId ? String(order.technicianId) : null;
  let technicianChanged = false;
  if (technicianId !== undefined) {
    if (technicianId && !technicianId.match(OID_RE)) {
      throw new ApiError(400, "Invalid technician ID format");
    }
    if (technicianId) {
      const technician = await userRepository.findById(technicianId);
      if (!technician || technician.role !== "technician") {
        throw new ApiError(404, "Technician not found");
      }
    }
    const nextTechnicianId = technicianId || null;
    technicianChanged = String(nextTechnicianId) !== String(previousTechnicianId);
    order.technicianId = nextTechnicianId;
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

  await order.populate([
    ...repairOrderPopulate.filter((item) => item.path !== "stepNotes.technicianId"),
  ]);

  if (technicianChanged && order.technicianId) {
    const vehicleLabel = order.vehicleId?.licensePlate
      ? `${order.vehicleId.licensePlate}${order.vehicleId.model ? ` (${order.vehicleId.model})` : ""}`
      : "a vehicle";
    await createNotification({
      userId: order.technicianId._id || order.technicianId,
      type: "repairOrderAssigned",
      title: "New repair order assigned",
      message: `You've been assigned to a repair order for ${vehicleLabel}.`,
      refId: order._id,
      refModel: "RepairOrder",
    });
  }

  return order;
}

/** Update repair order progress (status + optional notes). */
export async function updateRepairProgress(id, { status, notes, technicianId, stepIndex }) {
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

  if (order.status === "cancelled" && status !== "cancelled") {
    throw new ApiError(400, "Cannot change status of a cancelled repair order");
  }

  if (technicianId) {
    if (!technicianId.match(OID_RE)) {
      throw new ApiError(400, "Invalid technician ID format");
    }
    const technicianDoc = await userRepository.findById(technicianId);
    if (!technicianDoc) {
      throw new ApiError(404, "Technician not found");
    }
    order.technicianId = technicianId;
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

    order.services[index].status = status;

    const serviceStatuses = order.services.map((service) => service.status || "pending");
    if (serviceStatuses.every((value) => value === "completed")) {
      order.status = "completed";
    } else if (serviceStatuses.some((value) => value === "inProgress" || value === "completed")) {
      order.status = "inProgress";
    } else {
      order.status = "pending";
    }
  } else {
    if (!REPAIR_ORDER_STATUSES.includes(status)) {
      throw new ApiError(400, `Invalid status. Must be one of: ${REPAIR_ORDER_STATUSES.join(", ")}`);
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
    const techId = technicianId || order.technicianId;

    if (!techId) {
      throw new ApiError(400, "Technician ID is required when adding progress notes");
    }

    const newNote = {
      content: `[${previousStatus} → ${order.status}] ${notes.trim()}`,
      technicianId: techId,
      createdAt: new Date(),
    };
    if (hasStepIndex) newNote.stepIndex = Number(stepIndex);

    order.stepNotes.push(newNote);
  }

  await order.save();

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

  await repairOrderRepository.deleteById(id);

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
    .populate("technicianId", "fullName phone")
    .populate("advisorId", "fullName");

  if (!repairOrder) {
    return null;
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
    technician: repairOrder.technicianId
      ? {
          id: repairOrder.technicianId._id,
          name: repairOrder.technicianId.fullName,
          phone: repairOrder.technicianId.phone,
        }
      : null,
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
 * Service Advisor reviews a technician-completed order. Pass leaves it
 * "completed" (ready to forward to accounting); fail sends it back to the
 * technician as "reworkRequired". Only orders already marked "completed" by
 * a technician can be reviewed — matches the frontend's own ?status=completed
 * query for the review queue.
 */
export async function submitQualityCheck(id, { passed, items, note, reworkReason }, reviewerId) {
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

  const failedItems = Array.isArray(items) ? items.filter((item) => item?.result === "fail") : [];

  let summary;
  if (passed) {
    order.completedAt = order.completedAt || new Date();
    summary = note?.trim() ? `[QC pass] ${note.trim()}` : "[QC pass] Quality check passed.";
  } else {
    order.status = "reworkRequired";
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

  if (order.technicianId) {
    await createNotification({
      userId: order.technicianId,
      type: passed ? "qualityCheckPassed" : "qualityCheckFailed",
      title: passed ? "Repair order passed quality check" : "Repair order sent back for rework",
      message: passed
        ? "Your work passed quality check and is ready for handover."
        : summary.replace(/^\[QC fail\]\s*/, ""),
      refId: order._id,
      refModel: "RepairOrder",
    });
  }

  return {
    message: passed ? "Repair order passed quality check" : "Repair order sent back for rework",
    order,
  };
}

/**
 * The real "end of the SA's part of the job" action: only available once QC
 * has passed (status "completed"). Notifies every accountant that an order is
 * ready to invoice. Idempotent-ish: forwardedToAccountantAt is set once and
 * the endpoint refuses to re-forward, so the frontend can hide the button
 * afterward instead of risking duplicate accountant notifications.
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
  if (order.status !== "completed") {
    throw new ApiError(400, "Only a repair order that passed quality check (status completed) can be forwarded");
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
