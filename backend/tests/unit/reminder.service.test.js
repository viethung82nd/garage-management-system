import { describe, it, expect } from "vitest";
import * as reminderService from "../../src/services/reminder.service.js";
import { VehicleModel, DeferredWorkModel, NotificationModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

const DAY_MS = 24 * 60 * 60 * 1000;

async function vehicleFor(customerId, overrides = {}) {
  return VehicleModel.create({
    licensePlate: `PL-${Date.now()}-${Math.random()}`,
    customerId,
    ...overrides,
  });
}

describe("reminder.service", () => {
  describe("generateReminders", () => {
    it("creates a registrationExpiry reminder from a vehicle expiring within the horizon", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer._id, {
        registrationExpiry: new Date(Date.now() + 10 * DAY_MS),
      });

      const summary = await reminderService.generateReminders({ horizonDays: 30 });

      expect(summary.created).toBeGreaterThanOrEqual(1);
      expect(summary.byType.registrationExpiry).toBe(1);

      const reminders = await reminderService.listReminders({ type: "registrationExpiry" });
      const forVehicle = reminders.find((r) => String(r.vehicleId._id ?? r.vehicleId) === String(vehicle._id));
      expect(forVehicle).toBeTruthy();
      expect(forVehicle.status).toBe("pending");
    });

    it("creates a deferredWork reminder from an open deferred-work item coming due", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer._id);
      await DeferredWorkModel.create({
        vehicleId: vehicle._id,
        customerId: customer._id,
        description: "Replace brake pads",
        status: "open",
        remindAt: new Date(Date.now() + 5 * DAY_MS),
      });

      const summary = await reminderService.generateReminders({ horizonDays: 30 });

      expect(summary.byType.deferredWork).toBe(1);

      const reminders = await reminderService.listReminders({ type: "deferredWork" });
      expect(reminders).toHaveLength(1);
      expect(reminders[0].message).toBe("Replace brake pads");
    });

    it("does not create a reminder for a source outside the horizon", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      await vehicleFor(customer._id, {
        insuranceExpiry: new Date(Date.now() + 90 * DAY_MS),
      });

      const summary = await reminderService.generateReminders({ horizonDays: 30 });

      expect(summary.byType.insuranceExpiry).toBeUndefined();
    });

    it("is idempotent — running the engine twice does not duplicate reminders", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer._id, {
        registrationExpiry: new Date(Date.now() + 10 * DAY_MS),
      });
      await DeferredWorkModel.create({
        vehicleId: vehicle._id,
        customerId: customer._id,
        description: "Replace brake pads",
        status: "open",
        remindAt: new Date(Date.now() + 5 * DAY_MS),
      });

      const first = await reminderService.generateReminders({ horizonDays: 30 });
      expect(first.created).toBeGreaterThanOrEqual(2);

      const second = await reminderService.generateReminders({ horizonDays: 30 });
      expect(second.created).toBe(0);

      const all = await reminderService.listReminders({ status: "all" });
      expect(all).toHaveLength(first.created);
    });
  });

  describe("updateReminder", () => {
    it("marks a reminder sent, stamps sentAt, and fires a notification", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer._id, {
        registrationExpiry: new Date(Date.now() + 10 * DAY_MS),
      });
      await reminderService.generateReminders({ horizonDays: 30 });
      const [reminder] = await reminderService.listReminders({ type: "registrationExpiry" });
      expect(reminder).toBeTruthy();
      expect(String(reminder.vehicleId._id ?? reminder.vehicleId)).toBe(String(vehicle._id));

      const updated = await reminderService.updateReminder(reminder._id.toString(), { status: "sent" });

      expect(updated.status).toBe("sent");
      expect(updated.sentAt).toBeTruthy();

      const notifications = await NotificationModel.find({ userId: customer._id });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe(reminder.title);
    });

    it("rejects transitioning a dismissed reminder", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      await vehicleFor(customer._id, { registrationExpiry: new Date(Date.now() + 10 * DAY_MS) });
      await reminderService.generateReminders({ horizonDays: 30 });
      const [reminder] = await reminderService.listReminders({ type: "registrationExpiry" });

      await reminderService.updateReminder(reminder._id.toString(), { status: "dismissed" });

      await expect(
        reminderService.updateReminder(reminder._id.toString(), { status: "sent" }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("rejects an invalid status", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      await vehicleFor(customer._id, { registrationExpiry: new Date(Date.now() + 10 * DAY_MS) });
      await reminderService.generateReminders({ horizonDays: 30 });
      const [reminder] = await reminderService.listReminders({ type: "registrationExpiry" });

      await expect(
        reminderService.updateReminder(reminder._id.toString(), { status: "bogus" }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
