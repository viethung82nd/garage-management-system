import { describe, it, expect } from "vitest";
import * as repairOrderService from "../../src/services/repair-order.service.js";
import { VehicleModel, ServiceModel, TimeLogModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

async function vehicleFor(customer) {
  return VehicleModel.create({ licensePlate: `PL-${Date.now()}-${Math.random()}`, customerId: customer._id });
}

async function serviceDoc(basePrice = 100000) {
  return ServiceModel.create({ name: "Oil Change", basePrice, isActive: true });
}

async function pendingOrder() {
  const { user: customer } = await createUser({ role: "onlineCustomer" });
  const vehicle = await vehicleFor(customer);
  const svc = await serviceDoc();
  const order = await repairOrderService.createRepairOrder({
    vehicleId: vehicle._id.toString(),
    services: [{ serviceId: svc._id.toString() }],
  });
  return order;
}

/** Pushes a time log's startedAt back by `minutesAgo` so clockOff produces a
 *  known, non-zero durationMinutes without waiting real time. */
async function backdateStart(timeLogId, minutesAgo) {
  await TimeLogModel.updateOne(
    { _id: timeLogId },
    { $set: { startedAt: new Date(Date.now() - minutesAgo * 60000) } },
  );
}

describe("technician time logging", () => {
  describe("clockOn", () => {
    it("creates an open time log and moves a pending order to inProgress", async () => {
      const { user: tech } = await createUser({ role: "technician" });
      const order = await pendingOrder();

      const timeLog = await repairOrderService.clockOn(order._id.toString(), {}, tech._id.toString());

      expect(timeLog.endedAt).toBeFalsy();
      expect(timeLog.technicianId.toString()).toBe(tech._id.toString());
      expect(timeLog.repairOrderId.toString()).toBe(order._id.toString());

      const refreshed = await repairOrderService.getRepairOrderById(order._id.toString());
      expect(refreshed.status).toBe("inProgress");
      expect(refreshed.startedAt).toBeTruthy();
    });

    it("does not disturb an order that is already past pending", async () => {
      const { user: tech1 } = await createUser({ role: "technician" });
      const { user: tech2 } = await createUser({ role: "technician" });
      const order = await pendingOrder();

      const firstLog = await repairOrderService.clockOn(order._id.toString(), {}, tech1._id.toString());
      await repairOrderService.clockOff(order._id.toString(), {}, tech1._id.toString());
      void firstLog;

      const secondLog = await repairOrderService.clockOn(order._id.toString(), {}, tech2._id.toString());
      expect(secondLog.endedAt).toBeFalsy();

      const refreshed = await repairOrderService.getRepairOrderById(order._id.toString());
      expect(refreshed.status).toBe("inProgress");
    });

    it("rejects when the technician already has an open time log on another order", async () => {
      const { user: tech } = await createUser({ role: "technician" });
      const order1 = await pendingOrder();
      const order2 = await pendingOrder();

      await repairOrderService.clockOn(order1._id.toString(), {}, tech._id.toString());

      await expect(
        repairOrderService.clockOn(order2._id.toString(), {}, tech._id.toString()),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("rejects clocking on to a waitingParts order", async () => {
      const { user: tech } = await createUser({ role: "technician" });
      const order = await pendingOrder();
      await repairOrderService.updateRepairOrder(order._id.toString(), {
        status: "waitingParts",
        reason: "Waiting on brake pads",
      });

      await expect(
        repairOrderService.clockOn(order._id.toString(), {}, tech._id.toString()),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("rejects clocking on to a terminal (cancelled) order", async () => {
      const { user: tech } = await createUser({ role: "technician" });
      const order = await pendingOrder();
      await repairOrderService.updateRepairOrder(order._id.toString(), { status: "cancelled" });

      await expect(
        repairOrderService.clockOn(order._id.toString(), {}, tech._id.toString()),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("404s for a missing order", async () => {
      const { user: tech } = await createUser({ role: "technician" });
      await expect(
        repairOrderService.clockOn("64b000000000000000000000", {}, tech._id.toString()),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("rejects an out-of-range lineIndex", async () => {
      const { user: tech } = await createUser({ role: "technician" });
      const order = await pendingOrder();
      await expect(
        repairOrderService.clockOn(order._id.toString(), { lineIndex: 5 }, tech._id.toString()),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("clockOff", () => {
    it("closes the log and computes durationMinutes", async () => {
      const { user: tech } = await createUser({ role: "technician" });
      const order = await pendingOrder();

      const opened = await repairOrderService.clockOn(order._id.toString(), {}, tech._id.toString());
      await backdateStart(opened._id, 45);

      const closed = await repairOrderService.clockOff(
        order._id.toString(),
        { pauseReason: "End of shift", note: "Halfway done" },
        tech._id.toString(),
      );

      expect(closed.endedAt).toBeTruthy();
      expect(closed.durationMinutes).toBeGreaterThanOrEqual(44);
      expect(closed.durationMinutes).toBeLessThanOrEqual(46);
      expect(closed.pauseReason).toBe("End of shift");
    });

    it("does not change the order's status", async () => {
      const { user: tech } = await createUser({ role: "technician" });
      const order = await pendingOrder();
      await repairOrderService.clockOn(order._id.toString(), {}, tech._id.toString());
      await repairOrderService.clockOff(order._id.toString(), {}, tech._id.toString());

      const refreshed = await repairOrderService.getRepairOrderById(order._id.toString());
      expect(refreshed.status).toBe("inProgress");
    });

    it("409s when the technician has no open log on this order", async () => {
      const { user: tech } = await createUser({ role: "technician" });
      const order = await pendingOrder();

      await expect(
        repairOrderService.clockOff(order._id.toString(), {}, tech._id.toString()),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("409s when the technician's open log is on a different order", async () => {
      const { user: tech } = await createUser({ role: "technician" });
      const order1 = await pendingOrder();
      const order2 = await pendingOrder();
      await repairOrderService.clockOn(order1._id.toString(), {}, tech._id.toString());

      await expect(
        repairOrderService.clockOff(order2._id.toString(), {}, tech._id.toString()),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe("getOrderTimeLogs", () => {
    it("sums durationMinutes across closed logs and excludes still-open ones", async () => {
      const { user: tech } = await createUser({ role: "technician" });
      const order = await pendingOrder();

      const span1 = await repairOrderService.clockOn(order._id.toString(), {}, tech._id.toString());
      await backdateStart(span1._id, 30);
      await repairOrderService.clockOff(order._id.toString(), {}, tech._id.toString());

      const span2 = await repairOrderService.clockOn(order._id.toString(), {}, tech._id.toString());
      await backdateStart(span2._id, 20);
      await repairOrderService.clockOff(order._id.toString(), {}, tech._id.toString());

      // A third, still-open span must not be counted toward totalMinutes.
      await repairOrderService.clockOn(order._id.toString(), {}, tech._id.toString());

      const { timeLogs, totalMinutes } = await repairOrderService.getOrderTimeLogs(order._id.toString());

      expect(timeLogs).toHaveLength(3);
      expect(timeLogs[0].technicianId.fullName).toBeTruthy();
      expect(totalMinutes).toBeGreaterThanOrEqual(49);
      expect(totalMinutes).toBeLessThanOrEqual(51);
    });

    it("404s for a missing order", async () => {
      await expect(
        repairOrderService.getOrderTimeLogs("64b000000000000000000000"),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
