import { describe, it, expect } from "vitest";
import * as repairOrderService from "../../src/services/repair-order.service.js";
import { VehicleModel, ServiceModel, RepairOrderModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

async function vehicleFor(customer) {
  return VehicleModel.create({ licensePlate: `PL-${Date.now()}-${Math.random()}`, customerId: customer._id });
}

async function serviceDoc(basePrice = 100000) {
  return ServiceModel.create({ name: "Oil Change", basePrice, isActive: true });
}

describe("repair-order.service", () => {
  describe("createRepairOrder", () => {
    it("computes totalCost from live service prices", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer);
      const svc = await serviceDoc(100000);
      const order = await repairOrderService.createRepairOrder({
        vehicleId: vehicle._id.toString(),
        services: [{ serviceId: svc._id.toString(), quantity: 2 }],
      });
      expect(order.totalCost).toBe(200000);
      expect(order.status).toBe("pending");
    });

    it("rejects a missing vehicleId", async () => {
      await expect(
        repairOrderService.createRepairOrder({ services: [{ serviceId: "x" }] }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("rejects an empty services array", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer);
      await expect(
        repairOrderService.createRepairOrder({ vehicleId: vehicle._id.toString(), services: [] }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("rejects a nonexistent serviceId", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer);
      await expect(
        repairOrderService.createRepairOrder({
          vehicleId: vehicle._id.toString(),
          services: [{ serviceId: "64b000000000000000000000" }],
        }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("updateRepairOrder", () => {
    it("updates status and sets startedAt", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer);
      const svc = await serviceDoc();
      const order = await repairOrderService.createRepairOrder({
        vehicleId: vehicle._id.toString(),
        services: [{ serviceId: svc._id.toString() }],
      });
      const updated = await repairOrderService.updateRepairOrder(order._id.toString(), { status: "inProgress" });
      expect(updated.status).toBe("inProgress");
      expect(updated.startedAt).toBeTruthy();
    });

    it("rejects an invalid status", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer);
      const svc = await serviceDoc();
      const order = await repairOrderService.createRepairOrder({
        vehicleId: vehicle._id.toString(), services: [{ serviceId: svc._id.toString() }],
      });
      await expect(
        repairOrderService.updateRepairOrder(order._id.toString(), { status: "bogus" }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("notifies the technician on reassignment", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const { user: tech } = await createUser({ role: "technician" });
      const vehicle = await vehicleFor(customer);
      const svc = await serviceDoc();
      const order = await repairOrderService.createRepairOrder({
        vehicleId: vehicle._id.toString(), services: [{ serviceId: svc._id.toString() }],
      });
      const updated = await repairOrderService.updateRepairOrder(order._id.toString(), {
        technicianId: tech._id.toString(),
      });
      expect(updated.technicianId._id.toString()).toBe(tech._id.toString());
    });
  });

  describe("updateRepairProgress", () => {
    it("completing all step lines flips the whole order to completed", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer);
      const svc1 = await serviceDoc();
      const svc2 = await serviceDoc();
      const order = await repairOrderService.createRepairOrder({
        vehicleId: vehicle._id.toString(),
        services: [{ serviceId: svc1._id.toString() }, { serviceId: svc2._id.toString() }],
      });
      await repairOrderService.updateRepairProgress(order._id.toString(), { status: "completed", stepIndex: 0 });
      const result = await repairOrderService.updateRepairProgress(order._id.toString(), { status: "completed", stepIndex: 1 });
      expect(result.order.status).toBe("completed");
    });

    it("rejects changing status of a completed order (except to completed)", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer);
      const svc = await serviceDoc();
      const order = await repairOrderService.createRepairOrder({
        vehicleId: vehicle._id.toString(), services: [{ serviceId: svc._id.toString() }],
      });
      await repairOrderService.updateRepairProgress(order._id.toString(), { status: "completed" });
      await expect(
        repairOrderService.updateRepairProgress(order._id.toString(), { status: "pending" }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("deleteRepairOrder", () => {
    it("rejects deleting a non-pending order", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer);
      const svc = await serviceDoc();
      const order = await repairOrderService.createRepairOrder({
        vehicleId: vehicle._id.toString(), services: [{ serviceId: svc._id.toString() }],
      });
      await repairOrderService.updateRepairOrder(order._id.toString(), { status: "inProgress" });
      await expect(repairOrderService.deleteRepairOrder(order._id.toString())).rejects.toMatchObject({
        status: 400,
      });
    });

    it("deletes a pending order", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer);
      const svc = await serviceDoc();
      const order = await repairOrderService.createRepairOrder({
        vehicleId: vehicle._id.toString(), services: [{ serviceId: svc._id.toString() }],
      });
      const result = await repairOrderService.deleteRepairOrder(order._id.toString());
      expect(result.message).toMatch(/deleted/i);
    });
  });

  describe("step notes", () => {
    it("technician's own note is attributed to themselves", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const { user: tech } = await createUser({ role: "technician" });
      const vehicle = await vehicleFor(customer);
      const svc = await serviceDoc();
      const order = await repairOrderService.createRepairOrder({
        vehicleId: vehicle._id.toString(), services: [{ serviceId: svc._id.toString() }],
      });
      const result = await repairOrderService.addStepNote(
        order._id.toString(),
        { content: "Started work" },
        { sub: tech._id.toString(), role: "technician" },
      );
      expect(result.stepNotes[0].technicianId._id.toString()).toBe(tech._id.toString());
    });

    it("rejects empty note content", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const { user: tech } = await createUser({ role: "technician" });
      const vehicle = await vehicleFor(customer);
      const svc = await serviceDoc();
      const order = await repairOrderService.createRepairOrder({
        vehicleId: vehicle._id.toString(), services: [{ serviceId: svc._id.toString() }],
      });
      await expect(
        repairOrderService.addStepNote(order._id.toString(), { content: "  " }, { sub: tech._id.toString(), role: "technician" }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("deletes a step note by index", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const { user: tech } = await createUser({ role: "technician" });
      const vehicle = await vehicleFor(customer);
      const svc = await serviceDoc();
      const order = await repairOrderService.createRepairOrder({
        vehicleId: vehicle._id.toString(), services: [{ serviceId: svc._id.toString() }],
      });
      await repairOrderService.addStepNote(order._id.toString(), { content: "Note 1" }, { sub: tech._id.toString(), role: "technician" });
      const result = await repairOrderService.deleteStepNote(order._id.toString(), 0);
      expect(result.stepNotes).toHaveLength(0);
    });
  });

  describe("getRepairOrderStatus", () => {
    it("rejects a malformed id with 400 (regression test for the fix)", async () => {
      await expect(repairOrderService.getRepairOrderStatus("not-a-valid-id")).rejects.toMatchObject({
        status: 400,
      });
    });

    it("returns null for a well-formed missing id", async () => {
      const result = await repairOrderService.getRepairOrderStatus("64b000000000000000000000");
      expect(result).toBeNull();
    });
  });

  describe("submitQualityCheck / forwardToAccountant", () => {
    it("passing QC keeps the order completed", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const { user: advisor } = await createUser({ role: "serviceAdvisor" });
      const vehicle = await vehicleFor(customer);
      const svc = await serviceDoc();
      const order = await repairOrderService.createRepairOrder({
        vehicleId: vehicle._id.toString(), services: [{ serviceId: svc._id.toString() }],
      });
      await repairOrderService.updateRepairOrder(order._id.toString(), { status: "completed" });
      const result = await repairOrderService.submitQualityCheck(order._id.toString(), { passed: true }, advisor._id.toString());
      expect(result.order.status).toBe("completed");
    });

    it("failing QC sends the order to reworkRequired", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const { user: advisor } = await createUser({ role: "serviceAdvisor" });
      const vehicle = await vehicleFor(customer);
      const svc = await serviceDoc();
      const order = await repairOrderService.createRepairOrder({
        vehicleId: vehicle._id.toString(), services: [{ serviceId: svc._id.toString() }],
      });
      await repairOrderService.updateRepairOrder(order._id.toString(), { status: "completed" });
      const result = await repairOrderService.submitQualityCheck(order._id.toString(), { passed: false, reworkReason: "Leak" }, advisor._id.toString());
      expect(result.order.status).toBe("reworkRequired");
    });

    it("rejects QC on a non-completed order", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const { user: advisor } = await createUser({ role: "serviceAdvisor" });
      const vehicle = await vehicleFor(customer);
      const svc = await serviceDoc();
      const order = await repairOrderService.createRepairOrder({
        vehicleId: vehicle._id.toString(), services: [{ serviceId: svc._id.toString() }],
      });
      await expect(
        repairOrderService.submitQualityCheck(order._id.toString(), { passed: true }, advisor._id.toString()),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("forwardToAccountant refuses to re-forward", async () => {
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleFor(customer);
      const svc = await serviceDoc();
      const order = await repairOrderService.createRepairOrder({
        vehicleId: vehicle._id.toString(), services: [{ serviceId: svc._id.toString() }],
      });
      await repairOrderService.updateRepairOrder(order._id.toString(), { status: "completed" });
      await repairOrderService.forwardToAccountant(order._id.toString());
      await expect(repairOrderService.forwardToAccountant(order._id.toString())).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe("listing helpers", () => {
    it("getMyRepairOrders scopes to the customer's own vehicles", async () => {
      const { user: customer1 } = await createUser({ role: "onlineCustomer" });
      const { user: customer2 } = await createUser({ role: "onlineCustomer" });
      const vehicle1 = await vehicleFor(customer1);
      await vehicleFor(customer2);
      const svc = await serviceDoc();
      await repairOrderService.createRepairOrder({ vehicleId: vehicle1._id.toString(), services: [{ serviceId: svc._id.toString() }] });

      const mine = await repairOrderService.getMyRepairOrders(customer1._id.toString());
      expect(mine).toHaveLength(1);
    });

    it("getRepairOrderSummary 404s for a missing order", async () => {
      await expect(
        repairOrderService.getRepairOrderSummary("64b000000000000000000000"),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
