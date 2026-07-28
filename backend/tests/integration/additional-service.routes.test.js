import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { VehicleModel, RepairOrderModel, ServiceModel } from "../../src/models/index.js";
import { createUser, authHeader } from "../factories.js";

const app = createApp();

async function orderFor(advisor) {
  const { user: customer } = await createUser({ role: "onlineCustomer" });
  const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}-${Math.random()}`, customerId: customer._id });
  return RepairOrderModel.create({ vehicleId: vehicle._id, advisorId: advisor._id, services: [], totalCost: 0, status: "inProgress" });
}

describe("Additional Service Proposal API", () => {
  it("technician proposes, SA sends then approves, order gains the line item", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const { user: tech } = await createUser({ role: "technician" });
    const order = await orderFor(advisor);
    const svc = await ServiceModel.create({ name: "Wiper blades", basePrice: 50000, isActive: true });

    // Technician creates proposal with a catalog serviceId — price is auto-calculated.
    const created = await request(app)
      .post("/api/additional-service-proposals")
      .set(authHeader(tech))
      .send({ repairOrderId: order._id.toString(), serviceId: svc._id.toString() });
    expect(created.status).toBe(201);
    expect(created.body.laborCost).toBe(50000);

    const sent = await request(app)
      .patch(`/api/additional-service-proposals/${created.body._id}`)
      .set(authHeader(advisor))
      .send({ status: "sent" });
    expect(sent.status).toBe(200);

    // Approving requires evidence of the customer's authorisation — an
    // advisor's own click is not consent to charge beyond the estimate.
    // Price is already set from the catalog, no manual override needed.
    const approved = await request(app)
      .patch(`/api/additional-service-proposals/${created.body._id}`)
      .set(authHeader(advisor))
      .send({
        status: "approved",
        approval: { channel: "phone", decidedByName: "Nguyen Van A", contactValue: "0901234567" },
      });
    expect(approved.status).toBe(200);

    const updatedOrder = await request(app).get(`/api/repair-orders/${order._id}`).set(authHeader(advisor));
    expect(updatedOrder.body.totalCost).toBe(50000);
  });

  it("rejects a technician-only endpoint from a non-technician caller", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const order = await orderFor(advisor);
    const svc = await ServiceModel.create({ name: "X", basePrice: 10000, isActive: true });
    const res = await request(app)
      .post("/api/additional-service-proposals")
      .set(authHeader(advisor))
      .send({ repairOrderId: order._id.toString(), serviceId: svc._id.toString() });
    expect(res.status).toBe(403);
  });
});
