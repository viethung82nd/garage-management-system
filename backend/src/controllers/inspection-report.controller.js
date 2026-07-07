import {
  BookingModel,
  InspectionReportModel,
  VehicleModel,
} from "../models/index.js";
import { HttpError } from "../middleware/error.js";
function parseRecommendedServices(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "string") {
        try {
          return JSON.parse(item);
        } catch {
          throw new HttpError(
            400,
            "recommendedServices must be valid JSON when sent as a string",
          );
        }
      }
      return item;
    });
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        throw new Error("not-array");
      }
      return parsed;
    } catch {
      throw new HttpError(
        400,
        "recommendedServices must be a JSON array when sent as a string",
      );
    }
  }

  return [];
}

export async function createInspectionReport(req, res) {
  const {
    bookingId,
    vehicleId,
    findings,
    estimatedCost,
    recommendedServices,
    status,
    inspectedAt,
  } = req.body ?? {};

  const advisorId = req.user?.sub;

  if (!bookingId) {
    throw new HttpError(400, "bookingId is required");
  }
  if (!vehicleId) {
    throw new HttpError(400, "vehicleId is required");
  }

  if (!bookingId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid bookingId format");
  }
  if (!vehicleId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid vehicleId format");
  }

  const validStatuses = ["pending", "completed"];
  const normalizedStatus = status ? String(status).trim() : "pending";
  if (normalizedStatus && !validStatuses.includes(normalizedStatus)) {
    throw new HttpError(
      400,
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    );
  }

  const booking = await BookingModel.findById(bookingId);
  if (!booking) {
    throw new HttpError(404, "Booking not found");
  }

  const vehicle = await VehicleModel.findById(vehicleId);
  if (!vehicle) {
    throw new HttpError(404, "Vehicle not found");
  }

  if (booking.vehicleId && String(booking.vehicleId) !== String(vehicleId)) {
    throw new HttpError(
      400,
      "The provided vehicleId does not belong to the booking",
    );
  }

  const parsedServices = parseRecommendedServices(recommendedServices);
  const normalizedServices = parsedServices.map((service) => {
    if (!service?.serviceId || !service?.name) {
      throw new HttpError(
        400,
        "Each recommended service must include serviceId and name",
      );
    }

    return {
      serviceId: service.serviceId,
      name: service.name,
      price: service.price != null ? Number(service.price) : undefined,
      isRequired: service.isRequired === true || service.isRequired === "true",
    };
  });

  const photos = (req.files ?? []).map(
    (file) => "/uploads/inspection-photos/" + file.filename,
  );

  const inspectionReport = new InspectionReportModel({
    bookingId,
    vehicleId,
    advisorId,
    findings: findings?.trim(),
    estimatedCost: estimatedCost != null ? Number(estimatedCost) : undefined,
    photos,
    recommendedServices: normalizedServices,
    status: normalizedStatus,
    inspectedAt: inspectedAt ? new Date(inspectedAt) : Date.now(),
  });

  await inspectionReport.save();

  res.status(201).json(inspectionReport);
}
