import { inspectionReportRepository } from "../repositories/inspection-report.repository.js";
import { bookingRepository } from "../repositories/booking.repository.js";
import { repairOrderRepository } from "../repositories/repair-order.repository.js";
import { vehicleRepository } from "../repositories/vehicle.repository.js";
import { ApiError } from "../utils/apiError.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";

/** Accepts an array, a JSON-string-encoded array, or nothing (multipart form
 *  fields arrive as strings; JSON requests send real arrays). */
function parseJsonArrayField(value, fieldName) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        throw new Error("not-array");
      }
      return parsed;
    } catch {
      throw new ApiError(400, `${fieldName} must be a JSON array when sent as a string`);
    }
  }

  return [];
}

const OID_RE = /^[0-9a-fA-F]{24}$/;
const INSPECTION_ITEM_STATUSES = ["ok", "monitor", "repair"];

export async function listInspectionReports({ vehicleId, repairOrderId, bookingId }) {
  const filter = {};

  if (vehicleId) {
    if (!OID_RE.test(vehicleId)) {
      throw new ApiError(400, "Invalid vehicleId format");
    }
    filter.vehicleId = vehicleId;
  }
  if (repairOrderId) {
    if (!OID_RE.test(repairOrderId)) {
      throw new ApiError(400, "Invalid repairOrderId format");
    }
    filter.repairOrderId = repairOrderId;
  }
  if (bookingId) {
    if (!OID_RE.test(bookingId)) {
      throw new ApiError(400, "Invalid bookingId format");
    }
    filter.bookingId = bookingId;
  }

  const inspectionReports = await inspectionReportRepository.model
    .find(filter)
    .sort({ inspectedAt: -1 });

  return { inspectionReports };
}

export async function createInspectionReport(body, files, advisorId) {
  const {
    bookingId,
    repairOrderId,
    vehicleId: bodyVehicleId,
    findings,
    estimatedCost,
    odometer,
    fuelLevel,
    items,
    recommendedServices,
    status,
    inspectedAt,
  } = body ?? {};

  if (!bookingId && !repairOrderId) {
    throw new ApiError(400, "Either bookingId or repairOrderId is required");
  }
  if (bookingId && !OID_RE.test(bookingId)) {
    throw new ApiError(400, "Invalid bookingId format");
  }
  if (repairOrderId && !OID_RE.test(repairOrderId)) {
    throw new ApiError(400, "Invalid repairOrderId format");
  }

  const validStatuses = ["pending", "completed"];
  const normalizedStatus = status ? String(status).trim() : "pending";
  if (normalizedStatus && !validStatuses.includes(normalizedStatus)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  let booking = null;
  let repairOrder = null;
  let vehicleId = bodyVehicleId;

  if (bookingId) {
    booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }
    vehicleId = vehicleId || String(booking.vehicleId);
    if (booking.vehicleId && String(booking.vehicleId) !== String(vehicleId)) {
      throw new ApiError(400, "The provided vehicleId does not belong to the booking");
    }
  }

  if (repairOrderId) {
    repairOrder = await repairOrderRepository.findById(repairOrderId);
    if (!repairOrder) {
      throw new ApiError(404, "Repair order not found");
    }
    vehicleId = vehicleId || String(repairOrder.vehicleId);
  }

  if (!vehicleId || !OID_RE.test(vehicleId)) {
    throw new ApiError(400, "A valid vehicleId is required");
  }

  const vehicle = await vehicleRepository.findById(vehicleId);
  if (!vehicle) {
    throw new ApiError(404, "Vehicle not found");
  }

  const parsedRecommendedServices = parseJsonArrayField(recommendedServices, "recommendedServices").map(
    (service) => {
      if (!service?.name) {
        throw new ApiError(400, "Each recommended service must include a name");
      }
      return {
        serviceId: service.serviceId || undefined,
        name: service.name,
        price: service.price != null ? Number(service.price) : undefined,
        isRequired: service.isRequired === true || service.isRequired === "true",
      };
    },
  );

  const parsedItems = parseJsonArrayField(items, "items").map((item) => {
    const itemStatus = INSPECTION_ITEM_STATUSES.includes(item?.status) ? item.status : "ok";
    return {
      category: item?.category?.trim?.() || undefined,
      label: item?.label?.trim?.() || undefined,
      status: itemStatus,
      note: item?.note?.trim?.() || undefined,
      laborCost: item?.laborCost != null ? Number(item.laborCost) : undefined,
      partsCost: item?.partsCost != null ? Number(item.partsCost) : undefined,
    };
  });

  const uploadedPhotos = await Promise.all(
    (files ?? []).map((file) => uploadBufferToCloudinary(file.buffer, "inspection-photos")),
  );
  const photos = uploadedPhotos.map((result) => result.secure_url);

  const inspectionReport = new inspectionReportRepository.model({
    bookingId: bookingId || undefined,
    repairOrderId: repairOrderId || undefined,
    vehicleId,
    advisorId,
    findings: findings?.trim(),
    estimatedCost: estimatedCost != null ? Number(estimatedCost) : undefined,
    odometer: odometer != null ? Number(odometer) : undefined,
    fuelLevel: fuelLevel?.trim?.() || undefined,
    items: parsedItems,
    photos,
    recommendedServices: parsedRecommendedServices,
    status: normalizedStatus,
    inspectedAt: inspectedAt ? new Date(inspectedAt) : Date.now(),
  });

  await inspectionReport.save();

  if (repairOrder && !repairOrder.inspectionId) {
    repairOrder.inspectionId = inspectionReport._id;
    await repairOrder.save();
  }

  // Keep the vehicle's last-known mileage current whenever an inspection
  // reports a fresher odometer reading.
  if (
    inspectionReport.odometer != null &&
    (vehicle.lastKnownMileage == null || inspectionReport.odometer > vehicle.lastKnownMileage)
  ) {
    vehicle.lastKnownMileage = inspectionReport.odometer;
    await vehicle.save();
  }

  return inspectionReport;
}
