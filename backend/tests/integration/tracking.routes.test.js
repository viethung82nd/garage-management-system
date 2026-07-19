import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { VehicleModel, RepairOrderModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

const app = createApp();

describe("Tracking API (public)", () => {
  it("GET /api/tracking works without auth and returns live status", async () => {
    const { user: customer } = await createUser({ phone: "0977777777" });
    const vehicle = await VehicleModel.create({ licensePlate: "51K-99999", customerId: customer._id });
    await RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: 0, status: "inProgress" });

    const res = await request(app).get("/api/tracking").query({ plate: "51K-99999", phone: "0977777777" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("inProgress");
  });

  it("rejects a missing plate", async () => {
    const res = await request(app).get("/api/tracking").query({ phone: "0900000000" });
    expect(res.status).toBe(400);
  });

  it("404s for a wrong phone (no account probing)", async () => {
    const { user: customer } = await createUser({ phone: "0911111111" });
    const vehicle = await VehicleModel.create({ licensePlate: "51K-88888", customerId: customer._id });
    await RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: 0, status: "pending" });
    const res = await request(app).get("/api/tracking").query({ plate: "51K-88888", phone: "0900000000" });
    expect(res.status).toBe(404);
  });
});
