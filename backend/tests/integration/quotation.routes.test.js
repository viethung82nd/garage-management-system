import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { VehicleModel, RepairOrderModel } from "../../src/models/index.js";
import { createUser, authHeader } from "../factories.js";

const app = createApp();

async function orderWithVehicle(customer) {
  const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}-${Math.random()}`, customerId: customer._id });
  return RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: 0, status: "pending" });
}

describe("Quotation API", () => {
  it("SA creates, sends, and confirms a quotation, updating the order", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const order = await orderWithVehicle(customer);

    const created = await request(app)
      .post("/api/quotations")
      .set(authHeader(advisor))
      .send({ repairOrderId: order._id.toString(), lines: [{ description: "Brake pads", unitPrice: 50000, quantity: 2 }] });
    expect(created.status).toBe(201);

    const sent = await request(app).patch(`/api/quotations/${created.body._id}/send`).set(authHeader(advisor));
    expect(sent.status).toBe(200);
    expect(sent.body.status).toBe("sent");

    const confirmed = await request(app)
      .patch(`/api/quotations/${created.body._id}/confirm`)
      .set(authHeader(advisor))
      .send({ approved: true });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.status).toBe("approved");

    const updatedOrder = await request(app).get(`/api/repair-orders/${order._id}`).set(authHeader(advisor));
    expect(updatedOrder.body.totalCost).toBe(100000);
  });

  it("rejects editing a sent quotation", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const order = await orderWithVehicle(customer);
    const created = await request(app)
      .post("/api/quotations")
      .set(authHeader(advisor))
      .send({ repairOrderId: order._id.toString(), lines: [{ description: "X", unitPrice: 1000, quantity: 1 }] });
    await request(app).patch(`/api/quotations/${created.body._id}/send`).set(authHeader(advisor));

    const res = await request(app)
      .patch(`/api/quotations/${created.body._id}`)
      .set(authHeader(advisor))
      .send({ lines: [{ description: "Y", unitPrice: 2000, quantity: 1 }] });
    expect(res.status).toBe(409);
  });
});
