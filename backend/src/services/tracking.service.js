import { repairOrderRepository } from "../repositories/repair-order.repository.js";
import { invoiceRepository } from "../repositories/invoice.repository.js";
import { paymentRepository } from "../repositories/payment.repository.js";
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { ApiError } from "../utils/apiError.js";

function normalizePhone(value) {
  return String(value || "").replace(/\D+/g, "");
}

const GARAGE_NAME = "Kapa Auto Care Center";

function formatDisplayId(prefix, value) {
  return `${prefix}-${String(value).slice(-6).toUpperCase()}`;
}

function getStatusMeta(status) {
  switch (status) {
    case "completed":
      return {
        label: "Ready for handover",
        tone: "ready",
        stageValue: "Quality check complete",
        progress: "5 / 5 steps",
        completedSteps: 5,
      };
    case "inProgress":
      return {
        label: "Repair in progress",
        tone: "in-progress",
        stageValue: "Technician working",
        progress: "4 / 5 steps",
        completedSteps: 4,
      };
    case "cancelled":
      return {
        label: "Repair cancelled",
        tone: "pending",
        stageValue: "Cancelled by service team",
        progress: "1 / 5 steps",
        completedSteps: 1,
      };
    // A car being re-worked has clearly been taken in and worked on — showing it
    // as "awaiting intake" (the old fall-through) told the customer the opposite
    // of what was happening.
    case "reworkRequired":
      return {
        label: "Quality re-check in progress",
        tone: "in-progress",
        stageValue: "Addressing a quality issue before handover",
        progress: "4 / 5 steps",
        completedSteps: 4,
      };
    case "waitingParts":
      return {
        label: "Waiting for parts",
        tone: "in-progress",
        stageValue: "Sourcing the parts your repair needs",
        progress: "3 / 5 steps",
        completedSteps: 3,
      };
    case "waitingCustomer":
      return {
        label: "Waiting for your approval",
        tone: "in-progress",
        stageValue: "Awaiting your decision to proceed",
        progress: "3 / 5 steps",
        completedSteps: 3,
      };
    case "onHold":
      return {
        label: "On hold",
        tone: "pending",
        stageValue: "Temporarily paused",
        progress: "3 / 5 steps",
        completedSteps: 3,
      };
    case "readyForDelivery":
      return {
        label: "Ready for handover",
        tone: "ready",
        stageValue: "Quality check passed — ready to collect",
        progress: "5 / 5 steps",
        completedSteps: 5,
      };
    case "delivered":
    case "closed":
      return {
        label: "Handed over",
        tone: "completed",
        stageValue: "Vehicle returned to the customer",
        progress: "5 / 5 steps",
        completedSteps: 5,
      };
    case "pending":
    default:
      return {
        label: "Awaiting service intake",
        tone: "pending",
        stageValue: "Waiting for advisor review",
        progress: "2 / 5 steps",
        completedSteps: 2,
      };
  }
}

function getPaymentMeta(payment, invoice) {
  if (payment?.status === "succeeded") {
    return { label: "Paid", tone: "completed", method: payment.method };
  }

  if (invoice?.status === "paid") {
    return { label: "Paid", tone: "completed", method: payment?.method || "cash" };
  }

  if (invoice?.status === "cancelled") {
    return { label: "Invoice cancelled", tone: "pending", method: payment?.method || null };
  }

  return {
    label: invoice ? "Awaiting payment" : "Invoice pending",
    tone: invoice ? "pending" : "ready",
    method: payment?.method || null,
  };
}

function formatMethod(method) {
  switch (method) {
    case "bankTransfer":
      return "Bank transfer";
    case "eWallet":
      return "E-wallet";
    case "card":
      return "Card";
    case "cash":
      return "Cash";
    default:
      return "Updating";
  }
}

function buildTimeline(order, statusMeta) {
  const createdAt =
    typeof order._id?.getTimestamp === "function" ? order._id.getTimestamp() : null;

  const receivedTime = createdAt?.toISOString() || null;
  const startedTime = order.startedAt ? new Date(order.startedAt).toISOString() : null;
  const completedTime = order.completedAt ? new Date(order.completedAt).toISOString() : null;

  const states = [1, 2, 3, 4, 5].map((index) => {
    if (statusMeta.completedSteps > index) return "complete";
    if (statusMeta.completedSteps === index) return "current";
    return "pending";
  });

  return [
    {
      id: "received",
      label: "Repair order received",
      description: "Lookup details verified.",
      timestamp: receivedTime,
      state: states[0],
    },
    {
      id: "intake",
      label: "Vehicle intake",
      description: "Service advisor review.",
      timestamp: startedTime || receivedTime,
      state: states[1],
    },
    {
      id: "diagnosis",
      label: "Diagnosis confirmed",
      description: "Approved work added to order.",
      timestamp: startedTime || receivedTime,
      state: states[2],
    },
    {
      id: "repair",
      label: "Repair in progress",
      description: "Technician working on approved items.",
      timestamp: startedTime,
      state: states[3],
    },
    {
      id: "handover",
      label: "Ready for handover",
      description: "Invoice review and pickup.",
      timestamp: completedTime,
      state: states[4],
    },
  ];
}

/**
 * Public lookup of a repair order's status. Supports the current customer UX
 * (plate + phone) and the imported branch contract (plate + orderId).
 */
export async function trackRepairOrder({ plate, orderId, phone }) {
  if (!plate) {
    throw new ApiError(400, "plate is required");
  }
  if (!orderId && !phone) {
    throw new ApiError(400, "Provide plate with phone or orderId");
  }

  const normalizedPlate = String(plate).toUpperCase().trim();
  let order = null;

  if (orderId) {
    if (!String(orderId).match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError(400, "Invalid repair order ID format");
    }

    order = await repairOrderRepository.model
      .findById(orderId)
      .populate({
        path: "vehicleId",
        select: "licensePlate brand model customerId",
        populate: { path: "customerId", select: "fullName phone accountType" },
      })
      .populate("advisorId", "fullName")
      .populate("services.technicianId", "fullName")
      .populate("inspectionId", "photos");

    if (!order || !order.vehicleId || order.vehicleId.licensePlate !== normalizedPlate) {
      throw new ApiError(404, "Repair order not found");
    }
  } else {
    const vehicle = await vehicleRepository.model
      .findOne({ licensePlate: normalizedPlate })
      .populate("customerId", "fullName phone accountType");

    if (
      !vehicle?.customerId?.phone ||
      normalizePhone(vehicle.customerId.phone) !== normalizePhone(phone)
    ) {
      throw new ApiError(404, "Repair order not found");
    }

    order = await repairOrderRepository.model
      .findOne({ vehicleId: vehicle._id })
      .sort({ _id: -1 })
      .populate({
        path: "vehicleId",
        select: "licensePlate brand model customerId",
        populate: { path: "customerId", select: "fullName phone accountType" },
      })
      .populate("advisorId", "fullName")
      .populate("services.technicianId", "fullName")
      .populate("inspectionId", "photos");

    if (!order) {
      throw new ApiError(404, "Repair order not found");
    }
  }

  const invoice = await invoiceRepository.model
    .findOne({ repairOrderId: order._id })
    .sort({ issuedAt: -1 });
  const payment = invoice
    ? await paymentRepository.model.findOne({ invoiceId: invoice._id }).sort({ _id: -1 })
    : null;

  const statusMeta = getStatusMeta(order.status);
  const paymentMeta = getPaymentMeta(payment, invoice);
  const customer = order.vehicleId?.customerId || null;
  const displayRepairOrderId = formatDisplayId("RO", order._id);
  const displayInvoiceId = invoice ? formatDisplayId("INV", invoice._id) : "Pending";
  const services = order.services.map((s) => ({
    name: s.name,
    price: s.priceAtTime,
    quantity: s.quantity,
  }));

  return {
    repairOrderId: order._id,
    displayRepairOrderId,
    status: order.status,
    statusLabel: statusMeta.label,
    statusTone: statusMeta.tone,
    stageLabel: "Current stage",
    stageValue: statusMeta.stageValue,
    progressPercent: statusMeta.progress,
    garageName: GARAGE_NAME,
    customer: customer
      ? { fullName: customer.fullName, phone: customer.phone, accountType: customer.accountType }
      : null,
    intakeType: customer?.accountType === "walkIn" ? "Walk-in" : "Online account",
    vehicle: {
      licensePlate: order.vehicleId.licensePlate,
      brand: order.vehicleId.brand,
      model: order.vehicleId.model,
    },
    serviceAdvisor: order.advisorId?.fullName || "Updating",
    technician:
      [...new Set(order.services.map((s) => s.technicianId?.fullName).filter(Boolean))].join(", ") ||
      "Assigning technician",
    services,
    approvedServices: services.map((service) => service.name),
    // Real inspection photos taken for this order, if any were recorded —
    // never a stand-in stock image unrelated to the actual vehicle/repair.
    photos: order.inspectionId?.photos || [],
    invoice: {
      id: invoice?._id || null,
      displayId: displayInvoiceId,
      status: invoice?.status || null,
      total: invoice?.total ?? order.totalCost ?? 0,
      issuedAt: invoice?.issuedAt || null,
    },
    payment: {
      status: paymentMeta.label,
      tone: paymentMeta.tone,
      method: formatMethod(paymentMeta.method),
    },
    timeline: buildTimeline(order, statusMeta),
    totalCost: order.totalCost,
    startedAt: order.startedAt,
    completedAt: order.completedAt,
  };
}
