import { ScheduleModel } from "../models/Schedule.js";
import { UserModel } from "../models/User.js";
import { HttpError } from "../middleware/error.js";

function normalizeScheduleDate(dateParam) {
  if (!dateParam) {
    throw new HttpError(400, "date is required");
  }

  const parsed = new Date(dateParam);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "Invalid date format");
  }

  parsed.setUTCHours(0, 0, 0, 0);
  return parsed;
}

async function getOrCreateSchedule(technicianId, date) {
  const schedule = await ScheduleModel.findOne({
    technicianId,
    date: {
      $gte: date,
      $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  if (schedule) {
    return schedule;
  }

  const created = await ScheduleModel.create({
    technicianId,
    date,
    isAvailable: true,
    activeOrderIds: [],
    activeOrderCount: 0,
  });

  return created;
}

export async function getTechnicianSchedule(req, res) {
  const technicianId = req.params?.technicianId ?? req.query?.technicianId;
  const { date } = req.query ?? {};

  if (!technicianId) {
    throw new HttpError(400, "technicianId is required");
  }

  if (!String(technicianId).match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid technicianId format");
  }

  const targetTechnician = await UserModel.findById(technicianId);
  if (!targetTechnician || targetTechnician.role !== "technician") {
    throw new HttpError(404, "Technician not found");
  }

  if (
    req.user?.role === "technician" &&
    String(req.user.sub) !== String(technicianId)
  ) {
    throw new HttpError(403, "You can only view your own schedule");
  }

  const normalizedDate = normalizeScheduleDate(
    date ?? new Date().toISOString().slice(0, 10),
  );
  const schedule = await getOrCreateSchedule(technicianId, normalizedDate);

  res.json(schedule);
}

export async function updateTechnicianSchedule(req, res) {
  const technicianId = req.params?.technicianId ?? req.query?.technicianId;
  const { date } = req.query ?? {};
  const { isAvailable, activeOrderIds } = req.body ?? {};

  if (!technicianId) {
    throw new HttpError(400, "technicianId is required");
  }

  if (!String(technicianId).match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid technicianId format");
  }

  const targetTechnician = await UserModel.findById(technicianId);
  if (!targetTechnician || targetTechnician.role !== "technician") {
    throw new HttpError(404, "Technician not found");
  }

  if (
    req.user?.role === "technician" &&
    String(req.user.sub) !== String(technicianId)
  ) {
    throw new HttpError(403, "You can only update your own schedule");
  }

  if (typeof isAvailable !== "boolean" && activeOrderIds === undefined) {
    throw new HttpError(
      400,
      "At least one of isAvailable or activeOrderIds is required",
    );
  }

  if (activeOrderIds !== undefined && !Array.isArray(activeOrderIds)) {
    throw new HttpError(400, "activeOrderIds must be an array");
  }

  if (Array.isArray(activeOrderIds)) {
    const invalidIds = activeOrderIds.filter(
      (id) => !String(id).match(/^[0-9a-fA-F]{24}$/),
    );
    if (invalidIds.length > 0) {
      throw new HttpError(400, "activeOrderIds contains an invalid ObjectId");
    }
  }

  const normalizedDate = normalizeScheduleDate(
    date ?? new Date().toISOString().slice(0, 10),
  );
  const existingSchedule = await ScheduleModel.findOne({
    technicianId,
    date: {
      $gte: normalizedDate,
      $lt: new Date(normalizedDate.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  const schedule =
    existingSchedule ??
    (await ScheduleModel.create({
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

  res.json(schedule);
}
