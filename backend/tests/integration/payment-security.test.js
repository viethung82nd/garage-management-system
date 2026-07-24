import { describe, it, expect, afterEach } from "vitest";
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

// Covers the removal of the client-controlled `simulate` flag: a caller must
// not be able to dictate the mock gateway's outcome via the request body. The
// only sanctioned override is the server-side PAYMENT_SIMULATE env var, which
// is itself ignored outright in production (see resolveSimulateOverride in
// payment.service.js).
describe("payment gateway simulate cannot be forced by the request body", () => {
  afterEach(() => {
    delete process.env.PAYMENT_SIMULATE;
  });

  it('sending simulate: "fail" in the body does NOT force a failed charge', async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const { user: accountant } = await createUser({ role: "accountant" });
    const invoice = await unpaidInvoiceFor(customer);

    const res = await request(app)
      .post("/api/payments")
      .set(authHeader(accountant))
      .send({ invoiceId: invoice._id.toString(), method: "cash", simulate: "fail" });

    expect(res.status).toBe(201);
    // Body-supplied simulate must be ignored entirely — the charge goes
    // through as a normal (successful) mock payment.
    expect(res.body.payment.status).toBe("succeeded");
    expect(res.body.invoiceStatus).toBe("paid");
  });

  it("PAYMENT_SIMULATE env var (server-side, non-production only) still allows deliberate failure testing", async () => {
    process.env.PAYMENT_SIMULATE = "fail";

    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const { user: accountant } = await createUser({ role: "accountant" });
    const invoice = await unpaidInvoiceFor(customer);

    const res = await request(app)
      .post("/api/payments")
      .set(authHeader(accountant))
      .send({ invoiceId: invoice._id.toString(), method: "cash" });

    expect(res.status).toBe(201);
    expect(res.body.payment.status).toBe("failed");
    expect(res.body.invoiceStatus).toBe("unpaid");
  });
});
