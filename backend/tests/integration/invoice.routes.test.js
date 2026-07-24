import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { VehicleModel, RepairOrderModel, ServiceModel } from "../../src/models/index.js";
import { createUser, authHeader } from "../factories.js";

const app = createApp();

async function completedOrder(customer, basePrice = 100000) {
  const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}-${Math.random()}`, customerId: customer._id });
  const svc = await ServiceModel.create({ name: "Service", basePrice, isActive: true });
  return RepairOrderModel.create({
    vehicleId: vehicle._id,
    services: [{ serviceId: svc._id, name: svc.name, priceAtTime: basePrice, quantity: 1 }],
    totalCost: basePrice,
    status: "completed",
    // Invoicing is now gated on qcPassedAt, not status === "completed" — this
    // fixture models an order that has already cleared QC.
    qcPassedAt: new Date(),
  });
}

describe("Invoice API", () => {
  it("accountant generates an invoice from a completed order", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const { user: accountant } = await createUser({ role: "accountant" });
    const order = await completedOrder(customer);
    const res = await request(app)
      .post("/api/invoices")
      .set(authHeader(accountant))
      .send({ repairOrderId: order._id.toString() });
    expect(res.status).toBe(201);
    expect(res.body.invoice.status).toBe("unpaid");
  });

  it("customer only sees their own invoices via /mine", async () => {
    const { user: customer1 } = await createUser({ role: "onlineCustomer" });
    const { user: customer2 } = await createUser({ role: "onlineCustomer" });
    const { user: accountant } = await createUser({ role: "accountant" });
    const order1 = await completedOrder(customer1);
    await completedOrder(customer2);
    await request(app).post("/api/invoices").set(authHeader(accountant)).send({ repairOrderId: order1._id.toString() });

    const res = await request(app).get("/api/invoices/mine").set(authHeader(customer1));
    expect(res.status).toBe(200);
    expect(res.body.invoices).toHaveLength(1);
  });

  it("PATCH /:id/send sets sentAt", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const { user: accountant } = await createUser({ role: "accountant" });
    const order = await completedOrder(customer);
    const created = await request(app).post("/api/invoices").set(authHeader(accountant)).send({ repairOrderId: order._id.toString() });
    const res = await request(app).patch(`/api/invoices/${created.body.invoice.id}/send`).set(authHeader(accountant));
    expect(res.status).toBe(200);
    expect(res.body.invoice.sentAt).toBeTruthy();
  });
});
