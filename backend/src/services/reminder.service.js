import {
  VehicleModel,
  RepairOrderModel,
  DeferredWorkModel,
  UserModel,
  REMINDER_TYPES,
  REMINDER_STATUSES,
} from "../models/index.js";
import { reminderRepository } from "../repositories/reminder.repository.js";
import { ApiError } from "../utils/apiError.js";
import { createNotification } from "../utils/notify.js";
import { sendEmail } from "../utils/mailer.js";
import { renderEmailLayout, SITE_URL } from "../utils/emailTemplate.js";

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

// A customer whose vehicle hasn't been in for this long is treated as a
// cold relationship worth a dedicated win-back nudge, distinct from a
// routine maintenance-due reminder.
const LAPSED_CUSTOMER_AFTER_DAYS = 365;

// Lead times mandated by doc 14.3 for the four expiry-based reminder types —
// fixed per spec, so (unlike maintenanceDue/deferredWork/lapsedCustomer/
// birthday below) these deliberately ignore the caller's horizonDays.
const VEHICLE_RENEWAL_LEAD_DAYS = 30; // registration, insurance, manufacturer warranty
const SERVICE_WARRANTY_LEAD_DAYS = 7; // the shop's own workmanship guarantee — shorter, more urgent

/**
 * Creates the reminder for `{ vehicleId, type, dueAt }` (or, for a
 * vehicle-less type like birthday, `{ customerId, type, dueAt }`) unless one
 * already exists — the single dedupe point every source below funnels
 * through. `dueAt` is always copied verbatim from the underlying source field
 * (the vehicle's expiry date, the deferred item's remindAt, the next
 * birthday, …), so re-running the engine against unchanged source data
 * produces the exact same dueAt and this lookup finds the reminder already
 * created last time instead of duplicating it — that's what makes
 * generateReminders idempotent.
 */
async function upsertReminder({ vehicleId, customerId, type, dueAt, title, message, sourceRef }) {
  const query = vehicleId ? { vehicleId, type, dueAt } : { customerId, type, dueAt };
  const existing = await reminderRepository.model.findOne(query);
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

/** Next calendar occurrence of `date`'s month/day on or after `from`. */
function nextOccurrence(date, from) {
  const next = new Date(from.getFullYear(), date.getMonth(), date.getDate());
  if (next < from) next.setFullYear(next.getFullYear() + 1);
  return next;
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
  // Generic lookahead for the types with no doc-mandated lead time
  // (maintenanceDue, deferredWork staging, lapsedCustomer, birthday).
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
  // easiest way to earn a return visit. Fixed 30-day lead time per doc 14.3. =====
  const renewalHorizon = new Date(now.getTime() + VEHICLE_RENEWAL_LEAD_DAYS * DAY_MS);
  const RENEWAL_SOURCES = [
    { field: "registrationExpiry", type: "registrationExpiry", label: "Vehicle registration (đăng kiểm)" },
    { field: "insuranceExpiry", type: "insuranceExpiry", label: "Vehicle insurance" },
    { field: "manufacturerWarrantyExpiry", type: "warrantyExpiry", label: "Manufacturer warranty" },
  ];

  for (const { field, type, label } of RENEWAL_SOURCES) {
    const vehicles = await VehicleModel.find({
      [field]: { $ne: null, $lte: renewalHorizon },
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
  // manufacturer warranty — this is the shop's own workmanship guarantee, so
  // it gets its own shorter 7-day lead time per doc 14.3 instead of sharing
  // the 30-day vehicle-renewal window. =====
  const serviceWarrantyHorizon = new Date(now.getTime() + SERVICE_WARRANTY_LEAD_DAYS * DAY_MS);
  const warrantedOrders = await RepairOrderModel.find({
    warrantyUntilDate: { $ne: null, $lte: serviceWarrantyHorizon },
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

  // ===== 3. Open deferred work coming due to be re-offered, staged at
  // 30/60/90 days per doc 14.3 — a customer who ignored the first nudge might
  // still act on the second or third. item.remindAt is already "declined +
  // 30 days" (see quotation.service.js), so the later stages are +30/+60 on
  // top of that. Each stage is a distinct dueAt, so upsertReminder naturally
  // creates them one at a time as each date actually arrives. =====
  const DEFERRED_WORK_STAGE_OFFSET_DAYS = [0, 30, 60];
  const deferredItems = await DeferredWorkModel.find({
    status: "open",
    remindAt: { $ne: null, $lte: horizon },
  }).populate("vehicleId", "licensePlate customerId");

  for (const item of deferredItems) {
    const vehicle = item.vehicleId;
    if (!vehicle) continue;
    for (const offsetDays of DEFERRED_WORK_STAGE_OFFSET_DAYS) {
      const dueAt = new Date(item.remindAt.getTime() + offsetDays * DAY_MS);
      if (dueAt > horizon) continue;
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
  }

  // ===== 4. Maintenance-due & lapsed-customer: vehicles that haven't been in
  // for a delivered order in a long time. Both computed from the same
  // per-vehicle "last delivery" data — lapsedCustomer just uses a longer
  // threshold (the relationship going cold, not just routine service being
  // due) and crossing it always implies crossing the maintenance threshold
  // first, so one query covers both. =====
  const latestDeliveries = await RepairOrderModel.aggregate([
    { $match: { deliveredAt: { $ne: null } } },
    { $sort: { deliveredAt: -1 } },
    { $group: { _id: "$vehicleId", lastDeliveredAt: { $first: "$deliveredAt" } } },
  ]);

  const maintenanceThreshold = new Date(now.getTime() - MAINTENANCE_DUE_AFTER_DAYS * DAY_MS);
  const lapsedThreshold = new Date(now.getTime() - LAPSED_CUSTOMER_AFTER_DAYS * DAY_MS);
  const candidateVehicleIds = latestDeliveries
    .filter((row) => row.lastDeliveredAt && row.lastDeliveredAt <= maintenanceThreshold)
    .map((row) => row._id);

  if (candidateVehicleIds.length) {
    const lastDeliveredById = new Map(
      latestDeliveries.map((row) => [String(row._id), row.lastDeliveredAt]),
    );
    const vehicles = await VehicleModel.find({ _id: { $in: candidateVehicleIds } }).select(
      "licensePlate customerId",
    );

    for (const vehicle of vehicles) {
      const lastDeliveredAt = lastDeliveredById.get(String(vehicle._id));
      if (!lastDeliveredAt) continue;

      const maintenanceDueAt = new Date(lastDeliveredAt.getTime() + MAINTENANCE_DUE_AFTER_DAYS * DAY_MS);
      if (maintenanceDueAt <= horizon) {
        record(
          await upsertReminder({
            vehicleId: vehicle._id,
            customerId: vehicle.customerId,
            type: "maintenanceDue",
            dueAt: maintenanceDueAt,
            title: `Maintenance due — ${vehicle.licensePlate}`,
            message: `It has been over ${MAINTENANCE_DUE_AFTER_DAYS} days since vehicle ${vehicle.licensePlate}'s last completed service.`,
            sourceRef: vehicle._id,
          }),
        );
      }

      if (lastDeliveredAt <= lapsedThreshold) {
        const lapsedDueAt = new Date(lastDeliveredAt.getTime() + LAPSED_CUSTOMER_AFTER_DAYS * DAY_MS);
        if (lapsedDueAt <= horizon) {
          record(
            await upsertReminder({
              vehicleId: vehicle._id,
              customerId: vehicle.customerId,
              type: "lapsedCustomer",
              dueAt: lapsedDueAt,
              title: `Lapsed customer — ${vehicle.licensePlate}`,
              message: `The owner of vehicle ${vehicle.licensePlate} hasn't been in for service in over ${Math.round(LAPSED_CUSTOMER_AFTER_DAYS / 30)} months.`,
              sourceRef: vehicle._id,
            }),
          );
        }
      }
    }
  }

  // ===== 5. Customer birthdays — customer-level, not tied to any one
  // vehicle, so this has no vehicleId (see reminder.model.js). =====
  const customersWithBirthday = await UserModel.find({
    dateOfBirth: { $ne: null },
    isActive: true,
    role: { $in: ["onlineCustomer", "walkInCustomer"] },
  }).select("dateOfBirth fullName");

  for (const customer of customersWithBirthday) {
    const nextBirthday = nextOccurrence(customer.dateOfBirth, now);
    if (nextBirthday > horizon) continue;
    const created = await upsertReminder({
      customerId: customer._id,
      type: "birthday",
      dueAt: nextBirthday,
      title: `Customer birthday — ${customer.fullName}`,
      message: `${customer.fullName}'s birthday is coming up on ${nextBirthday.toISOString().slice(0, 10)}.`,
      sourceRef: customer._id,
    });
    record(created);
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
 * - `sent` stamps sentAt, fires an in-app notification, and — if the
 *   customer has an email on file — a real email too, using the reminder's
 *   own title/message the engine already wrote (see generateReminders
 *   above); this is the actual "nudge" leaving the building, not just a
 *   badge in a panel the customer may never open.
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

    const customer = reminder.customerId
      ? await UserModel.findById(reminder.customerId).select("email fullName")
      : null;
    if (customer?.email) {
      // Fire-and-forget — see quotation.service.js's sendQuotation() for why
      // this must not block the request on a slow/unreachable SMTP server.
      void sendEmail({
        to: customer.email,
        subject: reminder.title,
        html: renderEmailLayout({
          preheader: reminder.message || reminder.title,
          heading: reminder.title,
          bodyHtml: `
            <p style="margin:0 0 8px;">Hi ${customer.fullName || "there"},</p>
            <p style="margin:0;">${reminder.message || ""}</p>
          `,
          button: { label: "Book an appointment", url: `${SITE_URL}/appointment` },
        }),
      }).catch(() => {});
    }
  }
  await reminder.save();

  return reminder;
}
