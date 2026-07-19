import {
  RepairOrderModel,
  ServiceModel,
  UserModel,
  VehicleModel,
} from "../models/index.js";
import { REPAIR_ORDER_STATUSES, ORDER_SERVICE_STATUSES } from "../models/RepairOrder.js";
import { HttpError } from "../middleware/error.js";
import { createNotification, notifyRole } from "../utils/notify.js";

// ============= REPAIR ORDER CONTROLLERS =============

const vehicleCustomerPopulate = {
  path: "customerId",
  select: "fullName phone email accountType role",
};

const repairOrderPopulate = [
  {
    path: "vehicleId",
    select: "licensePlate brand model year color chassisNumber engineNumber customerId",
    populate: vehicleCustomerPopulate,
  },
  { path: "inspectionId" },
  { path: "advisorId", select: "fullName email phone role" },
  { path: "technicianId", select: "fullName email phone role" },
  { path: "services.serviceId", select: "name category" },
  { path: "stepNotes.technicianId", select: "fullName email phone role" },
];

/**
 * GET /api/repair-orders
 * Fetch all repair orders with optional filters
 * Query: status, vehicleId, serviceAdvisorId, technicianId
 */
export async function getAllRepairOrders(req, res) {
  const { status, vehicleId, serviceAdvisorId, advisorId, technicianId } = req.query;
  const normalizedServiceAdvisorId = serviceAdvisorId || advisorId;

  const filter = {};
  if (status) filter.status = status;
  if (vehicleId) filter.vehicleId = vehicleId;
  if (normalizedServiceAdvisorId) filter.advisorId = normalizedServiceAdvisorId;
  if (technicianId) filter.technicianId = technicianId;

  const orders = await RepairOrderModel.find(filter)
    .populate(repairOrderPopulate)
    .select("-__v")
    .sort({ createdAt: -1 });

  res.json(orders);
}

/**
 * GET /api/repair-orders/mine
 * Fetch only the authenticated online customer's repair orders.
 */
export async function getMyRepairOrders(req, res) {
  const vehicles = await VehicleModel.find({ customerId: req.user.sub }).select("_id");
  const vehicleIds = vehicles.map((vehicle) => vehicle._id);

  if (vehicleIds.length === 0) {
    res.json([]);
    return;
  }

  const orders = await RepairOrderModel.find({ vehicleId: { $in: vehicleIds } })
    .populate(repairOrderPopulate)
    .select("-__v")
    .sort({ completedAt: -1, startedAt: -1, _id: -1 });

  res.json(orders);
}

/**
 * GET /api/repair-orders/:id
 * Fetch a single repair order by ID
 */
export async function getRepairOrderById(req, res) {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid repair order ID format");
  }

  const order = await RepairOrderModel.findById(id)
    .populate(repairOrderPopulate)
    .select("-__v");

  if (!order) {
    throw new HttpError(404, "Repair order not found");
  }

  res.json(order);
}

/**
 * POST /api/repair-orders
 * Create a new repair order
 */
export async function createRepairOrder(req, res) {
  const { vehicleId, serviceAdvisorId, advisorId, services, inspectionId } = req.body ?? {};
  const normalizedServiceAdvisorId = serviceAdvisorId || advisorId;

  // Validate required fields
  if (!vehicleId) {
    throw new HttpError(400, "vehicleId is required");
  }

  if (!Array.isArray(services) || services.length === 0) {
    throw new HttpError(400, "At least one service is required");
  }

  // Validate all services exist and calculate total cost
  let totalCost = 0;
  const processedServices = [];

  for (const service of services) {
    if (!service.serviceId) {
      throw new HttpError(400, "Service ID is required for all services");
    }

    const serviceDoc = await ServiceModel.findById(service.serviceId);
    if (!serviceDoc) {
      throw new HttpError(
        404,
        `Service with ID ${service.serviceId} not found`,
      );
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

  // Validate service advisor if provided
  if (normalizedServiceAdvisorId) {
    const serviceAdvisor = await UserModel.findById(normalizedServiceAdvisorId);
    if (!serviceAdvisor) {
      throw new HttpError(404, "Service advisor not found");
    }
  }

  const newOrder = new RepairOrderModel({
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

  res.status(201).json(newOrder);
}

/**
 * PUT /api/repair-orders/:id
 * Update a repair order
 */
export async function updateRepairOrder(req, res) {
  const { id } = req.params;
  const { status, serviceAdvisorId, advisorId, technicianId, services } = req.body ?? {};
  const normalizedServiceAdvisorId =
    serviceAdvisorId !== undefined ? serviceAdvisorId : advisorId;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid repair order ID format");
  }

  const order = await RepairOrderModel.findById(id);
  if (!order) {
    throw new HttpError(404, "Repair order not found");
  }

  // Validate status if provided
  if (status) {
    const validStatuses = REPAIR_ORDER_STATUSES;
    if (!validStatuses.includes(status)) {
      throw new HttpError(
        400,
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      );
    }
    order.status = status;

    // Set startedAt and completedAt based on status
    if (status === "inProgress" && !order.startedAt) {
      order.startedAt = new Date();
    }
    if (status === "completed" && !order.completedAt) {
      order.completedAt = new Date();
    }
  }

  // Validate and update service advisor
  if (normalizedServiceAdvisorId !== undefined) {
    if (
      normalizedServiceAdvisorId &&
      !normalizedServiceAdvisorId.match(/^[0-9a-fA-F]{24}$/)
    ) {
      throw new HttpError(400, "Invalid service advisor ID format");
    }
    if (normalizedServiceAdvisorId) {
      const serviceAdvisor = await UserModel.findById(normalizedServiceAdvisorId);
      if (!serviceAdvisor) {
        throw new HttpError(404, "Service advisor not found");
      }
    }
    order.advisorId = normalizedServiceAdvisorId || null;
  }

  // Validate and update technician
  const previousTechnicianId = order.technicianId ? String(order.technicianId) : null;
  let technicianChanged = false;
  if (technicianId !== undefined) {
    if (technicianId && !technicianId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new HttpError(400, "Invalid technician ID format");
    }
    if (technicianId) {
      const technician = await UserModel.findById(technicianId);
      if (!technician || technician.role !== "technician") {
        throw new HttpError(404, "Technician not found");
      }
    }
    const nextTechnicianId = technicianId || null;
    technicianChanged = String(nextTechnicianId) !== String(previousTechnicianId);
    order.technicianId = nextTechnicianId;
  }

  // Validate and update services if provided
  if (services && Array.isArray(services)) {
    if (services.length === 0) {
      throw new HttpError(400, "At least one service is required");
    }

    let totalCost = 0;
    const processedServices = [];

    for (const service of services) {
      if (!service.serviceId) {
        throw new HttpError(400, "Service ID is required for all services");
      }

      const serviceDoc = await ServiceModel.findById(service.serviceId);
      if (!serviceDoc) {
        throw new HttpError(
          404,
          `Service with ID ${service.serviceId} not found`,
        );
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

  res.json(order);
}

/**
 * PATCH /api/repair-orders/:id/progress
 * Update repair order progress (status + optional notes)
 */
export async function updateRepairProgress(req, res) {
  const { id } = req.params;
  const { status, notes, technicianId, stepIndex } = req.body ?? {};

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid repair order ID format");
  }

  if (!status) {
    throw new HttpError(400, "Status is required");
  }

  const order = await RepairOrderModel.findById(id);
  if (!order) {
    throw new HttpError(404, "Repair order not found");
  }

  // Validate status transitions
  if (order.status === "completed" && status !== "completed") {
    throw new HttpError(
      400,
      "Cannot change status of a completed repair order",
    );
  }

  if (order.status === "cancelled" && status !== "cancelled") {
    throw new HttpError(
      400,
      "Cannot change status of a cancelled repair order",
    );
  }

  // Validate technician if provided
  if (technicianId) {
    if (!technicianId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new HttpError(400, "Invalid technician ID format");
    }
    const technicianDoc = await UserModel.findById(technicianId);
    if (!technicianDoc) {
      throw new HttpError(404, "Technician not found");
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
      throw new HttpError(400, "Invalid stepIndex");
    }
    if (!ORDER_SERVICE_STATUSES.includes(status)) {
      throw new HttpError(
        400,
        `A step's status must be one of: ${ORDER_SERVICE_STATUSES.join(", ")}`,
      );
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
      throw new HttpError(
        400,
        `Invalid status. Must be one of: ${REPAIR_ORDER_STATUSES.join(", ")}`,
      );
    }
    order.status = status;
  }

  // Set timestamps
  if (order.status === "inProgress" && !order.startedAt) {
    order.startedAt = new Date();
  }

  if (order.status === "completed" && !order.completedAt) {
    order.completedAt = new Date();
  }

  // Add step note if provided
  if (notes && notes.trim()) {
    const techId = technicianId || order.technicianId;

    if (!techId) {
      throw new HttpError(
        400,
        "Technician ID is required when adding progress notes",
      );
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

  res.json({
    message: `Repair order status updated from ${previousStatus} to ${order.status}`,
    order,
  });
}

/**
 * DELETE /api/repair-orders/:id
 * Delete a repair order (only if pending)
 */
export async function deleteRepairOrder(req, res) {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid repair order ID format");
  }

  const order = await RepairOrderModel.findById(id);
  if (!order) {
    throw new HttpError(404, "Repair order not found");
  }

  // Only allow deletion of pending orders
  if (order.status !== "pending") {
    throw new HttpError(
      400,
      "Can only delete repair orders with pending status",
    );
  }

  await RepairOrderModel.findByIdAndDelete(id);

  res.json({ message: "Repair order deleted successfully", id });
}

// ============= REPAIR ORDER STEP NOTES =============

/**
 * POST /api/repair-orders/:id/step-notes
 * Add a step note to a repair order
 */
export async function addStepNote(req, res) {
  const { id } = req.params;
  const { content, stepIndex } = req.body ?? {};

  // The note author is always the authenticated caller, not a value the
  // client asserts — a technician calling this always leaves a note as
  // themselves; only an admin adding a note on someone else's behalf may
  // override it. (Previously this required the client to supply
  // technicianId at all, which the technician UI never did, so every save
  // failed with a 400.)
  const technicianId =
    req.user.role === "admin" && req.body?.technicianId
      ? req.body.technicianId
      : req.user.sub;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid repair order ID format");
  }

  if (!content || !content.trim()) {
    throw new HttpError(400, "Note content is required");
  }

  if (!technicianId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid technician ID format");
  }

  // Verify technician exists
  const technician = await UserModel.findById(technicianId);
  if (!technician) {
    throw new HttpError(404, "Technician not found");
  }

  const order = await RepairOrderModel.findById(id);
  if (!order) {
    throw new HttpError(404, "Repair order not found");
  }

  let normalizedStepIndex;
  if (stepIndex !== undefined && stepIndex !== null) {
    normalizedStepIndex = Number(stepIndex);
    if (!Number.isInteger(normalizedStepIndex) || normalizedStepIndex < 0 || normalizedStepIndex >= order.services.length) {
      throw new HttpError(400, "Invalid stepIndex");
    }
  }

  const newNote = {
    content: content.trim(),
    technicianId,
    createdAt: new Date(),
  };
  if (normalizedStepIndex !== undefined) newNote.stepIndex = normalizedStepIndex;

  order.stepNotes.push(newNote);
  await order.save();

  await order.populate("stepNotes.technicianId", "fullName email phone role");

  res.status(201).json({
    message: "Step note added successfully",
    stepNotes: order.stepNotes,
  });
}

/**
 * GET /api/repair-orders/:id/step-notes
 * Get all step notes for a repair order
 */
export async function getStepNotes(req, res) {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid repair order ID format");
  }

  const order = await RepairOrderModel.findById(id).populate(
    "stepNotes.technicianId",
    "fullName email phone role",
  );

  if (!order) {
    throw new HttpError(404, "Repair order not found");
  }

  res.json(order.stepNotes);
}

/**
 * DELETE /api/repair-orders/:orderId/step-notes/:noteIndex
 * Delete a step note from a repair order
 */
export async function deleteStepNote(req, res) {
  const { orderId, noteIndex } = req.params;

  if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid repair order ID format");
  }

  const order = await RepairOrderModel.findById(orderId);
  if (!order) {
    throw new HttpError(404, "Repair order not found");
  }

  const index = parseInt(noteIndex);
  if (isNaN(index) || index < 0 || index >= order.stepNotes.length) {
    throw new HttpError(400, "Invalid note index");
  }

  order.stepNotes.splice(index, 1);
  await order.save();

  res.json({
    message: "Step note deleted successfully",
    stepNotes: order.stepNotes,
  });
}

export const getRepairOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const repairOrder = await RepairOrderModel.findById(id)
      .populate("vehicleId")
      .populate("technicianId", "fullName phone")
      .populate("advisorId", "fullName");

    if (!repairOrder) {
      return res.status(404).json({
        message: "Repair order not found",
      });
    }

    return res.status(200).json({
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
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};
export async function getRepairOrderSummary(req, res) {
  const { id } = req.params;
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid repair order ID format");
  }
  const order = await RepairOrderModel.findById(id).select(
    "services totalCost completedAt",
  );
  if (!order) {
    throw new HttpError(404, "Repair order not found");
  }
  res.json({
    services: order.services,
    totalCost: order.totalCost,
    completedAt: order.completedAt,
  });
}

/**
 * POST /api/repair-orders/:id/quality-check
 * Service Advisor reviews a technician-completed order. Pass leaves it
 * "completed" (ready to forward to accounting); fail sends it back to the
 * technician as "reworkRequired". Only orders already marked "completed" by
 * a technician can be reviewed — matches the frontend's own
 * ?status=completed query for the review queue.
 */
export async function submitQualityCheck(req, res) {
  const { id } = req.params;
  const { passed, items, note, reworkReason } = req.body ?? {};

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid repair order ID format");
  }
  if (typeof passed !== "boolean") {
    throw new HttpError(400, "passed (boolean) is required");
  }

  const order = await RepairOrderModel.findById(id);
  if (!order) {
    throw new HttpError(404, "Repair order not found");
  }
  if (order.status !== "completed") {
    throw new HttpError(
      400,
      "Only a repair order marked completed by the technician can be quality-checked",
    );
  }

  const reviewerId = req.user.sub;
  const failedItems = Array.isArray(items)
    ? items.filter((item) => item?.result === "fail")
    : [];

  let summary;
  if (passed) {
    order.completedAt = order.completedAt || new Date();
    summary = note?.trim() ? `[QC pass] ${note.trim()}` : "[QC pass] Nghiệm thu đạt.";
  } else {
    order.status = "reworkRequired";
    const reason = reworkReason?.trim() || failedItems.map((item) => item.label).filter(Boolean).join(", ") || "Chưa đạt nghiệm thu";
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

  res.json({
    message: passed ? "Repair order passed quality check" : "Repair order sent back for rework",
    order,
  });
}

/**
 * POST /api/repair-orders/:id/forward-to-accountant
 * The real "end of the SA's part of the job" action: only available once QC
 * has passed (status "completed"). Notifies every accountant that an order is
 * ready to invoice — the missing push signal that made this step a pure
 * manual-discovery gap before. Idempotent-ish: forwardedToAccountantAt is set
 * once and the endpoint refuses to re-forward, so the frontend can hide the
 * button afterward instead of risking duplicate accountant notifications.
 */
export async function forwardToAccountant(req, res) {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid repair order ID format");
  }

  const order = await RepairOrderModel.findById(id).populate(
    "vehicleId",
    "licensePlate brand model",
  );
  if (!order) {
    throw new HttpError(404, "Repair order not found");
  }
  if (order.status !== "completed") {
    throw new HttpError(
      400,
      "Only a repair order that passed quality check (status completed) can be forwarded",
    );
  }
  if (order.forwardedToAccountantAt) {
    throw new HttpError(409, "This repair order has already been forwarded to accounting");
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

  res.json({ message: "Repair order forwarded to accounting", order });
}
