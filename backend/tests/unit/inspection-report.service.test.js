import { describe, it, expect } from "vitest";
import * as inspectionService from "../../src/services/inspection-report.service.js";
import { VehicleModel, RepairOrderModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

describe("inspection-report.service", () => {
  it("rejects when neither bookingId nor repairOrderId is provided", async () => {
    await expect(
      inspectionService.createInspectionReport({}, [], "advisor-id"),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("creates a report linked to a repair order and updates vehicle mileage", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}`, customerId: customer._id });
    const order = await RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: 0, status: "pending" });

    const report = await inspectionService.createInspectionReport(
      { repairOrderId: order._id.toString(), odometer: 52000, items: [], recommendedServices: [] },
      [],
      advisor._id.toString(),
    );
    expect(report.vehicleId.toString()).toBe(vehicle._id.toString());

    const reloaded = await VehicleModel.findById(vehicle._id);
    expect(reloaded.lastKnownMileage).toBe(52000);

    const updatedOrder = await RepairOrderModel.findById(order._id);
    expect(updatedOrder.inspectionId.toString()).toBe(report._id.toString());
  });

  it("rejects a malformed bookingId", async () => {
    await expect(
      inspectionService.createInspectionReport({ bookingId: "bad-id" }, [], "advisor-id"),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("listInspectionReports filters by repairOrderId", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}`, customerId: customer._id });
    const order1 = await RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: 0, status: "pending" });
    const order2 = await RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: 0, status: "pending" });
    await inspectionService.createInspectionReport({ repairOrderId: order1._id.toString() }, [], advisor._id.toString());
    await inspectionService.createInspectionReport({ repairOrderId: order2._id.toString() }, [], advisor._id.toString());

    const result = await inspectionService.listInspectionReports({ repairOrderId: order1._id.toString() });
    expect(result.inspectionReports).toHaveLength(1);
  });
});
