import { describe, it, expect } from "vitest";
import * as invoiceService from "../../src/services/invoice.service.js";
import { VehicleModel, RepairOrderModel, ServiceModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

async function accountantId() {
  const { user } = await createUser({ role: "accountant" });
  return user._id.toString();
}

async function completedOrder(customer, { basePrice = 100000 } = {}) {
  const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}-${Math.random()}`, customerId: customer._id });
  const svc = await ServiceModel.create({ name: "Service", basePrice, isActive: true });
  return RepairOrderModel.create({
    vehicleId: vehicle._id,
    services: [{ serviceId: svc._id, name: svc.name, priceAtTime: basePrice, quantity: 1 }],
    totalCost: basePrice,
    status: "completed",
  });
}

describe("invoice.service", () => {
  it("generates an invoice from a completed order", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const { user: accountant } = await createUser({ role: "accountant" });
    const order = await completedOrder(customer);
    const result = await invoiceService.generateInvoiceFromRepairOrder(
      { repairOrderId: order._id.toString() },
      accountant._id.toString(),
    );
    expect(result.invoice.status).toBe("unpaid");
    expect(result.invoice.total).toBe(100000);
  });

  it("rejects generating for a non-completed order", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}`, customerId: customer._id });
    const order = await RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: 0, status: "pending" });
    await expect(
      invoiceService.generateInvoiceFromRepairOrder({ repairOrderId: order._id.toString() }, (await accountantId())),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rejects generating a second invoice for the same order", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const order = await completedOrder(customer);
    await invoiceService.generateInvoiceFromRepairOrder({ repairOrderId: order._id.toString() }, (await accountantId()));
    await expect(
      invoiceService.generateInvoiceFromRepairOrder({ repairOrderId: order._id.toString() }, (await accountantId())),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("applies a discount within range", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const order = await completedOrder(customer, { basePrice: 100000 });
    const result = await invoiceService.generateInvoiceFromRepairOrder(
      { repairOrderId: order._id.toString(), discount: 10000 },
      (await accountantId()),
    );
    expect(result.invoice.total).toBe(90000);
  });

  it("rejects a discount greater than the subtotal", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const order = await completedOrder(customer, { basePrice: 50000 });
    await expect(
      invoiceService.generateInvoiceFromRepairOrder(
        { repairOrderId: order._id.toString(), discount: 999999 },
        (await accountantId()),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("listMyInvoices scopes to the customer's own vehicles", async () => {
    const { user: customer1 } = await createUser({ role: "onlineCustomer" });
    const { user: customer2 } = await createUser({ role: "onlineCustomer" });
    const order1 = await completedOrder(customer1);
    await completedOrder(customer2);
    await invoiceService.generateInvoiceFromRepairOrder({ repairOrderId: order1._id.toString() }, (await accountantId()));

    const mine = await invoiceService.listMyInvoices(customer1._id.toString());
    expect(mine.invoices).toHaveLength(1);
  });

  it("sendInvoiceToCustomer sets sentAt", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const order = await completedOrder(customer);
    const generated = await invoiceService.generateInvoiceFromRepairOrder({ repairOrderId: order._id.toString() }, (await accountantId()));
    const result = await invoiceService.sendInvoiceToCustomer(generated.invoice.id);
    expect(result.invoice.sentAt).toBeTruthy();
  });

  it("getInvoiceById rejects a malformed id", async () => {
    await expect(invoiceService.getInvoiceById("bad-id")).rejects.toMatchObject({ status: 400 });
  });
});
