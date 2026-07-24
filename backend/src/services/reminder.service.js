import {
  VehicleModel,
  RepairOrderModel,
  DeferredWorkModel,
  REMINDER_TYPES,
  REMINDER_STATUSES,
} from "../models/index.js";
import { reminderRepository } from "../repositories/reminder.repository.js";
import { ApiError } from "../utils/apiError.js";
import { createNotification } from "../utils/notify.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

// A reminder here is already "sent" or has already run its course — the
// engine must never resurrect it by re-creating the same reminder.
const TERMINAL_REMINDER_STATUSES = ["dismissed", "done"];

// A vehicle with no delivered order in this long is treated as overdue for
// routine maintenance. Deliberately a flat calendar rule rather than a
// mileage projection: mileage-based due dates need a reliable km/month rate
// (OdometerLog history), which most vehicles in this dataset won't have yet.
const MAINTENANCE_DUE_AFTER_DAYS = 180;

/**
 * Creates the reminder for `{ vehicleId, type, dueAt }` unless one already
 * exists — the single dedupe point every source below funnels through.
 * `dueAt` is always copied verbatim from the underlying source field (the
 * vehicle's expiry date, the deferred item's remindAt, …), so re-running the
 * engine against unchanged source data produces the exact same dueAt and this
 * lookup finds the reminder already created last time instead of duplicating
 * it — that's what makes generateReminders idempotent.
 */
async function upsertReminder({ vehicleId, customerId, type, dueAt, title, message, sourceRef }) {
  const existing = await reminderRepository.model.findOne({ vehicleId, type, dueAt });
  if (existing) {
    return null;
  }
  await reminderRepository.create({
    vehicleId,
    customerId,
    type,
    dueAt,
    title,
    message,
    sourceRef,
    status: "pending",
  });
  return type;
}

/**
 * The reminder engine. Scans every source of a "the shop should nudge this
 * customer" signal falling within the next `horizonDays`, and upserts a
 * pending Reminder for each one that isn't already tracked. Safe to run
 * repeatedly (e.g. on a daily schedule) — see upsertReminder for the dedupe
 * guarantee.
 */
export async function generateReminders({ horizonDays = 30 } = {}) {
  const now = new Date();
  const horizon = new Date(now.getTime() + horizonDays * DAY_MS);

  const summary = { created: 0, byType: {} };
  function record(type) {
    if (!type) return;
    summary.created += 1;
    summary.byType[type] = (summary.byType[type] || 0) + 1;
  }

  // ===== 1. Vehicle renewal dates: registration, insurance, manufacturer
  // warranty. These are the highest-value reminders — they're legally
  // required or protect the customer's own money, so acting on them is the
  // easiest way to earn a return visit. =====
  const RENEWAL_SOURCES = [
    { field: "registrationExpiry", type: "registrationExpiry", label: "Vehicle registration (đăng kiểm)" },
    { field: "insuranceExpiry", type: "insuranceExpiry", label: "Vehicle insurance" },
    { field: "manufacturerWarrantyExpiry", type: "warrantyExpiry", label: "Manufacturer warranty" },
  ];

  for (const { field, type, label } of RENEWAL_SOURCES) {
    const vehicles = await VehicleModel.find({
      [field]: { $ne: null, $lte: horizon },
    }).select(`licensePlate customerId ${field}`);

    for (const vehicle of vehicles) {
      const dueAt = vehicle[field];
      if (!dueAt) continue;
      const created = await upsertReminder({
        vehicleId: vehicle._id,
        customerId: vehicle.customerId,
        type,
        dueAt,
        title: `${label} expiring soon — ${vehicle.licensePlate}`,
        message: `${label} for vehicle ${vehicle.licensePlate} expires on ${dueAt.toISOString().slice(0, 10)}.`,
        sourceRef: vehicle._id,
      });
      record(created);
    }
  }

  // ===== 2. Repair-order service warranty. Separate from the vehicle's own
  // manufacturer warranty — this is the shop's own workmanship guarantee. =====
  const warrantedOrders = await RepairOrderModel.find({
    warrantyUntilDate: { $ne: null, $lte: horizon },
  }).populate("vehicleId", "licensePlate customerId");

  for (const order of warrantedOrders) {
    const vehicle = order.vehicleId;
    if (!vehicle) continue;
    const dueAt = order.warrantyUntilDate;
    const created = await upsertReminder({
      vehicleId: vehicle._id,
      customerId: vehicle.customerId,
      type: "warrantyExpiry",
      dueAt,
      title: `Service warranty expiring soon — ${vehicle.licensePlate}`,
      message: `The repair warranty on vehicle ${vehicle.licensePlate} expires on ${dueAt.toISOString().slice(0, 10)}.`,
      sourceRef: order._id,
    });
    record(created);
  }

  // ===== 3. Open deferred work coming due to be re-offered. =====
  const deferredItems = await DeferredWorkModel.find({
    status: "open",
    remindAt: { $ne: null, $lte: horizon },
  }).populate("vehicleId", "licensePlate customerId");

  for (const item of deferredItems) {
    const vehicle = item.vehicleId;
    if (!vehicle) continue;
    const dueAt = item.remindAt;
    const created = await upsertReminder({
      vehicleId: vehicle._id,
      customerId: item.customerId || vehicle.customerId,
      type: "deferredWork",
      dueAt,
      title: `Follow up on deferred work — ${vehicle.licensePlate}`,
      message: item.description,
      sourceRef: item._id,
    });
    record(created);
  }

  // ===== 4. Maintenance-due: vehicles that haven't been in for a delivered
  // order in a long time. Computed per-vehicle from the latest delivery. =====
  const latestDeliveries = await RepairOrderModel.aggregate([
    { $match: { deliveredAt: { $ne: null } } },
    { $sort: { deliveredAt: -1 } },
    { $group: { _id: "$vehicleId", lastDeliveredAt: { $first: "$deliveredAt" } } },
  ]);

  const maintenanceThreshold = new Date(now.getTime() - MAINTENANCE_DUE_AFTER_DAYS * DAY_MS);
  const overdueVehicleIds = latestDeliveries
    .filter((row) => row.lastDeliveredAt && row.lastDeliveredAt <= maintenanceThreshold)
    .map((row) => row._id);

  if (overdueVehicleIds.length) {
    const dueAtByVehicleId = new Map(
      latestDeliveries.map((row) => [
        String(row._id),
        new Date(row.lastDeliveredAt.getTime() + MAINTENANCE_DUE_AFTER_DAYS * DAY_MS),
      ]),
    );
    const vehicles = await VehicleModel.find({ _id: { $in: overdueVehicleIds } }).select(
      "licensePlate customerId",
    );

    for (const vehicle of vehicles) {
      const dueAt = dueAtByVehicleId.get(String(vehicle._id));
      if (!dueAt || dueAt > horizon) continue;
      const created = await upsertReminder({
        vehicleId: vehicle._id,
        customerId: vehicle.customerId,
        type: "maintenanceDue",
        dueAt,
        title: `Maintenance due — ${vehicle.licensePlate}`,
        message: `It has been over ${MAINTENANCE_DUE_AFTER_DAYS} days since vehicle ${vehicle.licensePlate}'s last completed service.`,
        sourceRef: vehicle._id,
      });
      record(created);
    }
  }

  return summary;
}

/** GET /api/reminders — the advisor's outstanding-nudges queue. */
export async function listReminders({ status, type, dueBefore } = {}) {
  const filter = {};

  if (status && status !== "all") {
    if (!REMINDER_STATUSES.includes(status)) {
      throw new ApiError(400, `status must be one of: ${REMINDER_STATUSES.join(", ")}`);
    }
    filter.status = status;
  }
  if (type) {
    if (!REMINDER_TYPES.includes(type)) {
      throw new ApiError(400, `type must be one of: ${REMINDER_TYPES.join(", ")}`);
    }
    filter.type = type;
  }
  if (dueBefore) {
    const date = new Date(dueBefore);
    if (Number.isNaN(date.getTime())) {
      throw new ApiError(400, "Invalid dueBefore date");
    }
    filter.dueAt = { $lte: date };
  }

  return reminderRepository.model
    .find(filter)
    .populate("vehicleId", "licensePlate")
    .populate("customerId", "fullName phone")
    .sort({ dueAt: 1 });
}

/**
 * Mark a reminder sent, dismissed, or done.
 * - `sent` stamps sentAt and fires an in-app notification to the customer —
 *   this is the actual "nudge" leaving the building.
 * - `dismissed`/`done` are terminal: once a reminder is dismissed or done it
 *   cannot be transitioned again (a fresh occurrence, if still relevant,
 *   comes from the next engine run instead).
 */
export async function updateReminder(id, { status }) {
  if (!OID_RE.test(id)) {
    throw new ApiError(400, "Invalid reminder ID format");
  }
  if (!["sent", "dismissed", "done"].includes(status)) {
    throw new ApiError(400, "status must be one of: sent, dismissed, done");
  }

  const reminder = await reminderRepository.findById(id);
  if (!reminder) {
    throw new ApiError(404, "Reminder not found");
  }
  if (TERMINAL_REMINDER_STATUSES.includes(reminder.status)) {
    throw new ApiError(409, `This reminder is already ${reminder.status}`);
  }

  reminder.status = status;
  if (status === "sent") {
    reminder.sentAt = new Date();
    await createNotification({
      userId: reminder.customerId,
      type: "reminder",
      title: reminder.title,
      message: reminder.message,
    });
  }
  await reminder.save();

  return reminder;
}
