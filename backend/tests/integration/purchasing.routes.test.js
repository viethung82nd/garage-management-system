import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { PartModel } from "../../src/models/index.js";
import { createUser, authHeader } from "../factories.js";

const app = createApp();

async function makePart(overrides = {}) {
  return PartModel.create({
    name: "Oil Filter",
    sku: `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    unitPrice: 50000,
    stockQuantity: 0,
    ...overrides,
  });
}

describe("Purchasing API (suppliers + purchase orders)", () => {
  it("requires auth on both routers", async () => {
    const resSuppliers = await request(app).get("/api/suppliers");
    expect(resSuppliers.status).toBe(401);
    const resPOs = await request(app).get("/api/purchase-orders");
    expect(resPOs.status).toBe(401);
  });

  it("blocks a customer from writing suppliers, but partsStaff can", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const forbidden = await request(app)
      .post("/api/suppliers")
      .set(authHeader(customer))
      .send({ name: "X", code: "SUP-X1" });
    expect(forbidden.status).toBe(403);

    const { user: partsStaff } = await createUser({ role: "partsStaff" });
    const created = await request(app)
      .post("/api/suppliers")
      .set(authHeader(partsStaff))
      .send({ name: "X", code: "SUP-X2" });
    expect(created.status).toBe(201);
    expect(created.body.supplier.code).toBe("SUP-X2");
  });

  it("lets an accountant read suppliers but not create them", async () => {
    const { user: accountant } = await createUser({ role: "accountant" });
    const list = await request(app).get("/api/suppliers").set(authHeader(accountant));
    expect(list.status).toBe(200);

    const forbidden = await request(app)
      .post("/api/suppliers")
      .set(authHeader(accountant))
      .send({ name: "Y", code: "SUP-Y1" });
    expect(forbidden.status).toBe(403);
  });

  it("soft-deletes a supplier via DELETE", async () => {
    const { user: partsStaff } = await createUser({ role: "partsStaff" });
    const created = await request(app)
      .post("/api/suppliers")
      .set(authHeader(partsStaff))
      .send({ name: "Del Co", code: "SUP-DEL" });
    const del = await request(app)
      .delete(`/api/suppliers/${created.body.supplier._id}`)
      .set(authHeader(partsStaff));
    expect(del.status).toBe(200);

    const fetched = await request(app)
      .get(`/api/suppliers/${created.body.supplier._id}`)
      .set(authHeader(partsStaff));
    expect(fetched.body.supplier.isActive).toBe(false);
  });

  it("creates, sends and receives a purchase order end-to-end", async () => {
    const { user: partsStaff } = await createUser({ role: "partsStaff" });
    const supplierRes = await request(app)
      .post("/api/suppliers")
      .set(authHeader(partsStaff))
      .send({ name: "E2E Supplier", code: "SUP-E2E" });
    const part = await makePart();

    const createRes = await request(app)
      .post("/api/purchase-orders")
      .set(authHeader(partsStaff))
      .send({
        supplierId: supplierRes.body.supplier._id,
        lines: [{ partId: part._id.toString(), quantity: 4, unitCost: 20000 }],
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.purchaseOrder.status).toBe("draft");
    const poId = createRes.body.purchaseOrder._id;

    const sendRes = await request(app)
      .post(`/api/purchase-orders/${poId}/send`)
      .set(authHeader(partsStaff));
    expect(sendRes.status).toBe(200);
    expect(sendRes.body.purchaseOrder.status).toBe("sent");

    const receiveRes = await request(app)
      .post(`/api/purchase-orders/${poId}/receive`)
      .set(authHeader(partsStaff))
      .send({ lines: [{ lineIndex: 0, quantity: 4 }] });
    expect(receiveRes.status).toBe(200);
    expect(receiveRes.body.purchaseOrder.status).toBe("received");

    const partAfter = await PartModel.findById(part._id);
    expect(partAfter.stockQuantity).toBe(4);
  });

  it("routes /reorder-suggestions and /payables before /:id", async () => {
    const { user: partsStaff } = await createUser({ role: "partsStaff" });
    const { user: accountant } = await createUser({ role: "accountant" });

    const reorderRes = await request(app)
      .get("/api/purchase-orders/reorder-suggestions")
      .set(authHeader(partsStaff));
    expect(reorderRes.status).toBe(200);
    expect(reorderRes.body).toHaveProperty("suggestions");

    const payablesRes = await request(app)
      .get("/api/purchase-orders/payables")
      .set(authHeader(accountant));
    expect(payablesRes.status).toBe(200);
    expect(payablesRes.body).toHaveProperty("suppliers");
    expect(payablesRes.body).toHaveProperty("totalOutstanding");
  });

  it("a well-formed but nonexistent :id still 404s (not swallowed by the fixed routes)", async () => {
    const { user: partsStaff } = await createUser({ role: "partsStaff" });
    const res = await request(app)
      .get("/api/purchase-orders/64b000000000000000000000")
      .set(authHeader(partsStaff));
    expect(res.status).toBe(404);
  });
});
