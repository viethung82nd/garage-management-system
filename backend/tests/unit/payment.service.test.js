import { describe, it, expect } from "vitest";
import * as paymentService from "../../src/services/payment.service.js";
import { VehicleModel, RepairOrderModel, InvoiceModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

async function invoiceFor(customer, { status = "unpaid", total = 100000 } = {}) {
  const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}`, customerId: customer._id });
  const order = await RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: total, status: "completed" });
  return InvoiceModel.create({
    repairOrderId: order._id,
    lineItems: [{ description: "Service", quantity: 1, unitPrice: total }],
    subtotal: total,
    discount: 0,
    total,
    status,
  });
}

describe("payment.service", () => {
  it("records a successful payment and settles the invoice", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const invoice = await invoiceFor(customer);
    const result = await paymentService.recordPayment({
      invoiceId: invoice._id.toString(),
      method: "cash",
    });
    expect(result.payment.status).toBe("succeeded");
    expect(result.invoiceStatus).toBe("paid");
  });

  it("rejects an invalid invoiceId", async () => {
    await expect(
      paymentService.recordPayment({ invoiceId: "not-an-id", method: "cash" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects an unsupported payment method", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const invoice = await invoiceFor(customer);
    await expect(
      paymentService.recordPayment({ invoiceId: invoice._id.toString(), method: "bitcoin" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects paying an already-paid invoice", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const invoice = await invoiceFor(customer, { status: "paid" });
    await expect(
      paymentService.recordPayment({ invoiceId: invoice._id.toString(), method: "cash" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rejects paying a cancelled invoice", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const invoice = await invoiceFor(customer, { status: "cancelled" });
    await expect(
      paymentService.recordPayment({ invoiceId: invoice._id.toString(), method: "cash" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("getPayment fetches a recorded payment with invoice summary", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const invoice = await invoiceFor(customer);
    const recorded = await paymentService.recordPayment({ invoiceId: invoice._id.toString(), method: "cash" });
    const result = await paymentService.getPayment(recorded.payment._id.toString());
    expect(result.payment.invoiceId).toBeDefined();
  });

  it("getPayment 404s for a missing payment", async () => {
    await expect(paymentService.getPayment("64b000000000000000000000")).rejects.toMatchObject({
      status: 404,
    });
  });
});
