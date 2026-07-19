import { scheduleRepository } from "../repositories/schedule.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { ApiError } from "../utils/apiError.js";

function isValidObjectId(value) {
  return String(value).match(/^[0-9a-fA-F]{24}$/);
}

function normalizeScheduleDate(dateParam) {
  if (!dateParam) {
    throw new ApiError(400, "date is required");
  }

  const parsed = new Date(dateParam);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, "Invalid date format");
  }

  parsed.setUTCHours(0, 0, 0, 0);
  return parsed;
}

async function getOrCreateSchedule(technicianId, date) {
  const schedule = await scheduleRepository.findOne({
    technicianId,
    date: {
      $gte: date,
      $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  if (schedule) {
    return schedule;
  }

  return scheduleRepository.create({
    technicianId,
    date,
    isAvailable: true,
    activeOrderIds: [],
    activeOrderCount: 0,
  });
}

export async function getTechnicianSchedule(params, query, requester) {
  const technicianId = params?.technicianId ?? query?.technicianId;
  const { date } = query ?? {};

  if (!technicianId) {
    throw new ApiError(400, "technicianId is required");
  }

  if (!String(technicianId).match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(400, "Invalid technicianId format");
  }

  const targetTechnician = await userRepository.findById(technicianId);
  if (!targetTechnician || targetTechnician.role !== "technician") {
    throw new ApiError(404, "Technician not found");
  }

  if (
    requester?.role === "technician" &&
    String(requester.sub) !== String(technicianId)
  ) {
    throw new ApiError(403, "You can only view your own schedule");
  }

  const normalizedDate = normalizeScheduleDate(
    date ?? new Date().toISOString().slice(0, 10),
  );
  return getOrCreateSchedule(technicianId, normalizedDate);
}

export async function updateTechnicianSchedule(params, query, body, requester) {
  const technicianId = params?.technicianId ?? query?.technicianId;
  const { date } = query ?? {};
  const { isAvailable, activeOrderIds } = body ?? {};

  if (!technicianId) {
    throw new ApiError(400, "technicianId is required");
  }

  if (!String(technicianId).match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(400, "Invalid technicianId format");
  }

  const targetTechnician = await userRepository.findById(technicianId);
  if (!targetTechnician || targetTechnician.role !== "technician") {
    throw new ApiError(404, "Technician not found");
  }

  if (
    requester?.role === "technician" &&
    String(requester.sub) !== String(technicianId)
  ) {
    throw new ApiError(403, "You can only update your own schedule");
  }

  if (typeof isAvailable !== "boolean" && activeOrderIds === undefined) {
    throw new ApiError(400, "At least one of isAvailable or activeOrderIds is required");
  }

  if (activeOrderIds !== undefined && !Array.isArray(activeOrderIds)) {
    throw new ApiError(400, "activeOrderIds must be an array");
  }

  if (Array.isArray(activeOrderIds)) {
    const invalidIds = activeOrderIds.filter(
      (id) => !String(id).match(/^[0-9a-fA-F]{24}$/),
    );
    if (invalidIds.length > 0) {
      throw new ApiError(400, "activeOrderIds contains an invalid ObjectId");
    }
  }

  const normalizedDate = normalizeScheduleDate(
    date ?? new Date().toISOString().slice(0, 10),
  );
  const existingSchedule = await scheduleRepository.findOne({
    technicianId,
    date: {
      $gte: normalizedDate,
      $lt: new Date(normalizedDate.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  const schedule =
    existingSchedule ??
    (await scheduleRepository.create({
      technicianId,
      date: normalizedDate,
      isAvailable: true,
      activeOrderIds: [],
      activeOrderCount: 0,
    }));

  if (typeof isAvailable === "boolean") {
    schedule.isAvailable = isAvailable;
  }

  if (Array.isArray(activeOrderIds)) {
    schedule.activeOrderIds = activeOrderIds;
    schedule.activeOrderCount = activeOrderIds.length;
  }

  await schedule.save();
  return schedule;
}

export async function updateScheduleAvailability(scheduleId, isAvailable, requester) {
  if (!scheduleId) {
    throw new ApiError(400, "scheduleId is required");
  }

  if (!isValidObjectId(scheduleId)) {
    throw new ApiError(400, "Invalid scheduleId format");
  }

  if (typeof isAvailable !== "boolean") {
    throw new ApiError(400, "isAvailable must be a boolean");
  }

  const schedule = await scheduleRepository.findById(scheduleId);
  if (!schedule) {
    throw new ApiError(404, "Schedule not found");
  }

  if (
    requester?.role === "technician" &&
    String(requester.sub) !== String(schedule.technicianId)
  ) {
    throw new ApiError(403, "You can only update your own schedule");
  }

  schedule.isAvailable = isAvailable;
  await schedule.save();

  return schedule;
}
