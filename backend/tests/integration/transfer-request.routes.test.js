import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { VehicleModel, RepairOrderModel } from "../../src/models/index.js";
import { createUser, authHeader } from "../factories.js";

const app = createApp();

async function assignedOrder(technician) {
  const { user: customer } = await createUser({ role: "onlineCustomer" });
  const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}-${Math.random()}`, customerId: customer._id });
  return RepairOrderModel.create({ vehicleId: vehicle._id, technicianId: technician._id, services: [], totalCost: 0, status: "inProgress" });
}

describe("Transfer Request API", () => {
  it("technician requests a transfer, SA approves it, order is reassigned", async () => {
    const { user: techA } = await createUser({ role: "technician" });
    const { user: techB } = await createUser({ role: "technician" });
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const order = await assignedOrder(techA);

    const created = await request(app)
      .post("/api/transfer-requests")
      .set(authHeader(techA))
      .send({ repairOrderId: order._id.toString(), toTechnicianId: techB._id.toString() });
    expect(created.status).toBe(201);

    const approved = await request(app)
      .patch(`/api/transfer-requests/${created.body._id}/approve`)
      .set(authHeader(advisor));
    expect(approved.status).toBe(200);

    const updatedOrder = await request(app).get(`/api/repair-orders/${order._id}`).set(authHeader(advisor));
    expect(updatedOrder.body.technicianId._id).toBe(techB._id.toString());
  });

  it("rejects a technician who isn't assigned to the order", async () => {
    const { user: techA } = await createUser({ role: "technician" });
    const { user: techB } = await createUser({ role: "technician" });
    const { user: notAssigned } = await createUser({ role: "technician" });
    const order = await assignedOrder(techA);

    const res = await request(app)
      .post("/api/transfer-requests")
      .set(authHeader(notAssigned))
      .send({ repairOrderId: order._id.toString(), toTechnicianId: techB._id.toString() });
    expect(res.status).toBe(403);
  });
});
