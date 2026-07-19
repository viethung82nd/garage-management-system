import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { VehicleModel, RepairOrderModel, InvoiceModel } from "../../src/models/index.js";
import { createUser, authHeader } from "../factories.js";

const app = createApp();

async function unpaidInvoiceFor(customer, total = 100000) {
  const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}`, customerId: customer._id });
  const order = await RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: total, status: "completed" });
  return InvoiceModel.create({ repairOrderId: order._id, lineItems: [], subtotal: total, discount: 0, total, status: "unpaid" });
}

describe("Payment API", () => {
  it("POST /api/payments records a successful payment and settles the invoice", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const { user: accountant } = await createUser({ role: "accountant" });
    const invoice = await unpaidInvoiceFor(customer);
    const res = await request(app)
      .post("/api/payments")
      .set(authHeader(accountant))
      .send({ invoiceId: invoice._id.toString(), method: "cash" });
    expect(res.status).toBe(201);
    expect(res.body.invoiceStatus).toBe("paid");
  });

  it("rejects an unsupported payment method", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const { user: accountant } = await createUser({ role: "accountant" });
    const invoice = await unpaidInvoiceFor(customer);
    const res = await request(app)
      .post("/api/payments")
      .set(authHeader(accountant))
      .send({ invoiceId: invoice._id.toString(), method: "bitcoin" });
    expect(res.status).toBe(400);
  });

  it("GET /api/payments/:id fetches a recorded payment", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const { user: accountant } = await createUser({ role: "accountant" });
    const invoice = await unpaidInvoiceFor(customer);
    const created = await request(app)
      .post("/api/payments")
      .set(authHeader(accountant))
      .send({ invoiceId: invoice._id.toString(), method: "cash" });
    const res = await request(app).get(`/api/payments/${created.body.payment._id}`).set(authHeader(accountant));
    expect(res.status).toBe(200);
  });
});
