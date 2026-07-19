import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { VehicleModel, RepairOrderModel } from "../../src/models/index.js";
import { createUser, authHeader } from "../factories.js";

const app = createApp();

describe("Inspection Report API", () => {
  it("SA creates an inspection report for a repair order (JSON body, no photos)", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}`, customerId: customer._id });
    const order = await RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: 0, status: "pending" });

    const res = await request(app)
      .post("/api/inspection-reports")
      .set(authHeader(advisor))
      .send({ repairOrderId: order._id.toString(), odometer: 40000, findings: "Brake wear" });
    expect(res.status).toBe(201);
    expect(res.body.vehicleId).toBe(vehicle._id.toString());
  });

  it("rejects a request with neither bookingId nor repairOrderId", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const res = await request(app).post("/api/inspection-reports").set(authHeader(advisor)).send({});
    expect(res.status).toBe(400);
  });

  it("GET /api/inspection-reports filters by repairOrderId", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}`, customerId: customer._id });
    const order = await RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: 0, status: "pending" });
    await request(app).post("/api/inspection-reports").set(authHeader(advisor)).send({ repairOrderId: order._id.toString() });

    const res = await request(app)
      .get("/api/inspection-reports")
      .set(authHeader(advisor))
      .query({ repairOrderId: order._id.toString() });
    expect(res.status).toBe(200);
    expect(res.body.inspectionReports).toHaveLength(1);
  });
});
