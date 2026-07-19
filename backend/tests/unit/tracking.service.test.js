import { describe, it, expect } from "vitest";
import * as trackingService from "../../src/services/tracking.service.js";
import { VehicleModel, RepairOrderModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

describe("tracking.service", () => {
  it("rejects a missing plate", async () => {
    await expect(trackingService.trackRepairOrder({})).rejects.toMatchObject({ status: 400 });
  });

  it("rejects plate with neither phone nor orderId", async () => {
    await expect(trackingService.trackRepairOrder({ plate: "29A-11111" })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("tracks by plate + matching phone", async () => {
    const { user: customer } = await createUser({ phone: "0912345678" });
    const vehicle = await VehicleModel.create({ licensePlate: "29A-22222", customerId: customer._id });
    const order = await RepairOrderModel.create({
      vehicleId: vehicle._id, services: [], totalCost: 0, status: "inProgress",
    });
    const result = await trackingService.trackRepairOrder({ plate: "29a-22222", phone: "0912345678" });
    expect(result.repairOrderId.toString()).toBe(order._id.toString());
    expect(result.status).toBe("inProgress");
  });

  it("rejects a phone that doesn't match the vehicle owner", async () => {
    const { user: customer } = await createUser({ phone: "0911111111" });
    const vehicle = await VehicleModel.create({ licensePlate: "29A-33333", customerId: customer._id });
    await RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: 0, status: "pending" });
    await expect(
      trackingService.trackRepairOrder({ plate: "29A-33333", phone: "0900000000" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("tracks by plate + orderId", async () => {
    const { user: customer } = await createUser({});
    const vehicle = await VehicleModel.create({ licensePlate: "29A-44444", customerId: customer._id });
    const order = await RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: 0, status: "pending" });
    const result = await trackingService.trackRepairOrder({ plate: "29A-44444", orderId: order._id.toString() });
    expect(result.repairOrderId.toString()).toBe(order._id.toString());
  });

  it("rejects an orderId whose vehicle plate doesn't match", async () => {
    const { user: customer } = await createUser({});
    const vehicle = await VehicleModel.create({ licensePlate: "29A-55555", customerId: customer._id });
    const order = await RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: 0, status: "pending" });
    await expect(
      trackingService.trackRepairOrder({ plate: "29A-99999", orderId: order._id.toString() }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
