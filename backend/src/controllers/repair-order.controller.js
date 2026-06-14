import { RepairOrderModel, ServiceModel, UserModel } from "../models/index.js";
import { HttpError } from "../middleware/error.js";

// ============= REPAIR ORDER CONTROLLERS =============

/**
 * GET /api/repair-orders
 * Fetch all repair orders with optional filters
 * Query: status, vehicleId, advisorId, technicianId
 */
export async function getAllRepairOrders(req, res) {
  const { status, vehicleId, advisorId, technicianId } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (vehicleId) filter.vehicleId = vehicleId;
  if (advisorId) filter.advisorId = advisorId;
  if (technicianId) filter.technicianId = technicianId;

  const orders = await RepairOrderModel.find(filter)
    .populate("vehicleId", "licensePlate model")
    .populate("advisorId", "firstName lastName email")
    .populate("technicianId", "firstName lastName email")
    .populate("services.serviceId", "name category")
    .populate("stepNotes.technicianId", "firstName lastName")
    .select("-__v")
    .sort({ createdAt: -1 });

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
    .populate("vehicleId")
    .populate("inspectionId")
    .populate("advisorId", "firstName lastName email phone")
    .populate("technicianId", "firstName lastName email phone")
    .populate("services.serviceId")
    .populate("stepNotes.technicianId", "firstName lastName")
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
  const { vehicleId, advisorId, services, inspectionId } = req.body ?? {};

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
    const priceAtTime = service.priceAtTime || serviceDoc.price;

    processedServices.push({
      serviceId: service.serviceId,
      name: serviceDoc.name,
      priceAtTime,
      quantity,
    });

    totalCost += priceAtTime * quantity;
  }

  // Validate advisor if provided
  if (advisorId) {
    const advisor = await UserModel.findById(advisorId);
    if (!advisor) {
      throw new HttpError(404, "Advisor not found");
    }
  }

  const newOrder = new RepairOrderModel({
    vehicleId,
    advisorId: advisorId || null,
    inspectionId: inspectionId || null,
    services: processedServices,
    totalCost,
    status: "pending",
  });

  await newOrder.save();

  await newOrder.populate([
    { path: "vehicleId", select: "licensePlate model" },
    { path: "advisorId", select: "firstName lastName email" },
    { path: "inspectionId" },
    { path: "services.serviceId", select: "name category" },
  ]);

  res.status(201).json(newOrder);
}

/**
 * PUT /api/repair-orders/:id
 * Update a repair order
 */
export async function updateRepairOrder(req, res) {
  const { id } = req.params;
  const { status, advisorId, technicianId, services } = req.body ?? {};

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid repair order ID format");
  }

  const order = await RepairOrderModel.findById(id);
  if (!order) {
    throw new HttpError(404, "Repair order not found");
  }

  // Validate status if provided
  if (status) {
    const validStatuses = ["pending", "inProgress", "completed", "cancelled"];
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

  // Validate and update advisor
  if (advisorId !== undefined) {
    if (advisorId && !advisorId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new HttpError(400, "Invalid advisor ID format");
    }
    if (advisorId) {
      const advisor = await UserModel.findById(advisorId);
      if (!advisor) {
        throw new HttpError(404, "Advisor not found");
      }
    }
    order.advisorId = advisorId || null;
  }

  // Validate and update technician
  if (technicianId !== undefined) {
    if (technicianId && !technicianId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new HttpError(400, "Invalid technician ID format");
    }
    if (technicianId) {
      const technician = await UserModel.findById(technicianId);
      if (!technician) {
        throw new HttpError(404, "Technician not found");
      }
    }
    order.technicianId = technicianId || null;
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
      const priceAtTime = service.priceAtTime || serviceDoc.price;

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
    { path: "vehicleId", select: "licensePlate model" },
    { path: "advisorId", select: "firstName lastName email" },
    { path: "technicianId", select: "firstName lastName email" },
    { path: "inspectionId" },
    { path: "services.serviceId", select: "name category" },
  ]);

  res.json(order);
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
  const { content, technicianId } = req.body ?? {};

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid repair order ID format");
  }

  if (!content || !content.trim()) {
    throw new HttpError(400, "Note content is required");
  }

  if (!technicianId) {
    throw new HttpError(400, "Technician ID is required");
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

  const newNote = {
    content: content.trim(),
    technicianId,
    createdAt: new Date(),
  };

  order.stepNotes.push(newNote);
  await order.save();

  await order.populate("stepNotes.technicianId", "firstName lastName email");

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
    "firstName lastName email",
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
