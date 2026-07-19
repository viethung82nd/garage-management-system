import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { VehicleModel, ServiceModel } from "../../src/models/index.js";
import { createUser, authHeader } from "../factories.js";

const app = createApp();

async function vehicleFor(customer) {
  return VehicleModel.create({ licensePlate: `PL-${Date.now()}-${Math.random()}`, customerId: customer._id });
}

describe("Repair Order API", () => {
  it("creates a repair order with server-computed totalCost", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const vehicle = await vehicleFor(customer);
    const svc = await ServiceModel.create({ name: "Oil Change", basePrice: 100000, isActive: true });

    const res = await request(app)
      .post("/api/repair-orders")
      .set(authHeader(advisor))
      .send({ vehicleId: vehicle._id.toString(), services: [{ serviceId: svc._id.toString(), quantity: 2 }] });
    expect(res.status).toBe(201);
    expect(res.body.totalCost).toBe(200000);
  });

  it("GET /api/repair-orders/:id/status returns a clean 400 for a malformed id (regression)", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const res = await request(app).get("/api/repair-orders/not-a-valid-id/status").set(authHeader(advisor));
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTypeOf("string");
  });

  it("technician updates progress through the full lifecycle", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const { user: tech } = await createUser({ role: "technician" });
    const vehicle = await vehicleFor(customer);
    const svc = await ServiceModel.create({ name: "Brake Check", basePrice: 50000, isActive: true });
    const created = await request(app)
      .post("/api/repair-orders")
      .set(authHeader(advisor))
      .send({ vehicleId: vehicle._id.toString(), services: [{ serviceId: svc._id.toString() }] });

    const progress = await request(app)
      .patch(`/api/repair-orders/${created.body._id}/progress`)
      .set(authHeader(tech))
      .send({ status: "completed", technicianId: tech._id.toString() });
    expect(progress.status).toBe(200);
    expect(progress.body.order.status).toBe("completed");
  });

  it("quality check + forward to accountant end-to-end", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const vehicle = await vehicleFor(customer);
    const svc = await ServiceModel.create({ name: "Detail", basePrice: 30000, isActive: true });
    const created = await request(app)
      .post("/api/repair-orders")
      .set(authHeader(advisor))
      .send({ vehicleId: vehicle._id.toString(), services: [{ serviceId: svc._id.toString() }] });
    await request(app)
      .patch(`/api/repair-orders/${created.body._id}/progress`)
      .set(authHeader(advisor))
      .send({ status: "completed" });

    const qc = await request(app)
      .post(`/api/repair-orders/${created.body._id}/quality-check`)
      .set(authHeader(advisor))
      .send({ passed: true });
    expect(qc.status).toBe(200);

    const forward = await request(app)
      .post(`/api/repair-orders/${created.body._id}/forward-to-accountant`)
      .set(authHeader(advisor));
    expect(forward.status).toBe(200);
  });
});
