import * as scheduleService from "../services/schedule.service.js";

export async function getTechnicianSchedule(req, res) {
  const schedule = await scheduleService.getTechnicianSchedule(
    req.params,
    req.query,
    req.user,
  );
  res.json(schedule);
}

export async function updateTechnicianSchedule(req, res) {
  const schedule = await scheduleService.updateTechnicianSchedule(
    req.params,
    req.query,
    req.body ?? {},
    req.user,
  );
  res.json(schedule);
}

export async function updateScheduleAvailability(req, res) {
  const schedule = await scheduleService.updateScheduleAvailability(
    req.params?.scheduleId,
    (req.body ?? {}).isAvailable,
    req.user,
  );
  res.json(schedule);
}
