import * as reminderService from "../services/reminder.service.js";

/** POST /api/reminders/generate — runs the reminder engine now. Body:
 *  { horizonDays? }. Idempotent; safe to call repeatedly (e.g. on a schedule). */
export async function generateReminders(req, res) {
  const result = await reminderService.generateReminders(req.body ?? {});
  res.json(result);
}

/** GET /api/reminders?status=&type=&dueBefore= — the outstanding-nudges queue. */
export async function listReminders(req, res) {
  const reminders = await reminderService.listReminders(req.query ?? {});
  res.json({ reminders });
}

/** PATCH /api/reminders/:id — mark a reminder sent, dismissed, or done. */
export async function updateReminder(req, res) {
  const reminder = await reminderService.updateReminder(req.params.id, req.body ?? {});
  res.json(reminder);
}
