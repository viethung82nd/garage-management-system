import { describe, it, expect } from "vitest";
import * as followUpService from "../../src/services/follow-up.service.js";
import { VehicleModel, RepairOrderModel, FollowUpModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

async function vehicleFor(customerId) {
  return VehicleModel.create({
    licensePlate: `PL-${Date.now()}-${Math.random()}`,
    customerId,
  });
}

describe("follow-up.service", () => {
  describe("generateDueFollowUps", () => {
    it("creates one follow-up due 72h after delivery for a delivered order", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer._id);
      const deliveredAt = new Date(Date.now() - 1 * DAY_MS);
      const order = await RepairOrderModel.create({
        vehicleId: vehicle._id,
        services: [],
        status: "delivered",
        deliveredAt,
      });

      const summary = await followUpService.generateDueFollowUps({ lookbackDays: 30 });

      expect(summary.created).toBe(1);

      const followUp = await FollowUpModel.findOne({ repairOrderId: order._id });
      expect(followUp).toBeTruthy();
      expect(followUp.status).toBe("pending");
      expect(followUp.dueAt.getTime()).toBe(deliveredAt.getTime() + 72 * HOUR_MS);
    });

    it("does not create a follow-up for an order that hasn't been delivered", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer._id);
      const order = await RepairOrderModel.create({
        vehicleId: vehicle._id,
        services: [],
        status: "inProgress",
      });

      const summary = await followUpService.generateDueFollowUps({ lookbackDays: 30 });

      expect(summary.created).toBe(0);
      const followUp = await FollowUpModel.findOne({ repairOrderId: order._id });
      expect(followUp).toBeNull();
    });

    it("does not double-book an order that already has a follow-up", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer._id);
      const deliveredAt = new Date(Date.now() - 1 * DAY_MS);
      const order = await RepairOrderModel.create({
        vehicleId: vehicle._id,
        services: [],
        status: "delivered",
        deliveredAt,
      });

      await followUpService.createFollowUpForDelivery({
        repairOrderId: order._id.toString(),
        vehicleId: vehicle._id.toString(),
        customerId: customer._id.toString(),
        deliveredAt,
      });

      const summary = await followUpService.generateDueFollowUps({ lookbackDays: 30 });
      expect(summary.created).toBe(0);

      const count = await FollowUpModel.countDocuments({ repairOrderId: order._id });
      expect(count).toBe(1);
    });
  });

  describe("recordFollowUpOutcome", () => {
    async function makeFollowUp() {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer._id);
      const order = await RepairOrderModel.create({
        vehicleId: vehicle._id,
        services: [],
        status: "delivered",
        deliveredAt: new Date(),
      });
      return followUpService.createFollowUpForDelivery({
        repairOrderId: order._id.toString(),
        vehicleId: vehicle._id.toString(),
        customerId: customer._id.toString(),
        deliveredAt: new Date(),
      });
    }

    it("rejects an out-of-range csatScore", async () => {
      const followUp = await makeFollowUp();
      await expect(
        followUpService.recordFollowUpOutcome(followUp._id.toString(), { csatScore: 6 }, "actor"),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        followUpService.recordFollowUpOutcome(followUp._id.toString(), { csatScore: 0 }, "actor"),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("rejects an out-of-range npsScore", async () => {
      const followUp = await makeFollowUp();
      await expect(
        followUpService.recordFollowUpOutcome(followUp._id.toString(), { npsScore: 11 }, "actor"),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        followUpService.recordFollowUpOutcome(followUp._id.toString(), { npsScore: -1 }, "actor"),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("rejects an invalid status", async () => {
      const followUp = await makeFollowUp();
      await expect(
        followUpService.recordFollowUpOutcome(followUp._id.toString(), { status: "bogus" }, "actor"),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("records a valid outcome and stamps contactedAt/contactedBy", async () => {
      const followUp = await makeFollowUp();
      const { user: advisor } = await createUser({ role: "serviceAdvisor" });

      const updated = await followUpService.recordFollowUpOutcome(
        followUp._id.toString(),
        { status: "contacted", csatScore: 5, npsScore: 9, complaintCategory: "none", note: "Happy customer" },
        advisor._id.toString(),
      );

      expect(updated.status).toBe("contacted");
      expect(updated.csatScore).toBe(5);
      expect(updated.contactedAt).toBeTruthy();
      expect(String(updated.contactedBy)).toBe(advisor._id.toString());
    });
  });

  describe("getSatisfactionSummary", () => {
    it("computes an average CSAT over contacted follow-ups", async () => {
      const { user: advisor } = await createUser({ role: "serviceAdvisor" });
      const scores = [5, 3, 4];
      for (const csatScore of scores) {
        const followUp = await makeFollowUpForSummary();
        await followUpService.recordFollowUpOutcome(
          followUp._id.toString(),
          { status: "contacted", csatScore },
          advisor._id.toString(),
        );
      }

      const summary = await followUpService.getSatisfactionSummary({});

      expect(summary.contactedCount).toBe(3);
      expect(summary.avgCsat).toBeCloseTo((5 + 3 + 4) / 3, 5);
    });

    async function makeFollowUpForSummary() {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer._id);
      const order = await RepairOrderModel.create({
        vehicleId: vehicle._id,
        services: [],
        status: "delivered",
        deliveredAt: new Date(),
      });
      return followUpService.createFollowUpForDelivery({
        repairOrderId: order._id.toString(),
        vehicleId: vehicle._id.toString(),
        customerId: customer._id.toString(),
        deliveredAt: new Date(),
      });
    }
  });
});
