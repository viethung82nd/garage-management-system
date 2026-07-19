import { describe, it, expect } from "vitest";
import * as quotationService from "../../src/services/quotation.service.js";
import { VehicleModel, RepairOrderModel, ServiceModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

async function advisorId() {
  const { user } = await createUser({ role: "serviceAdvisor" });
  return user._id.toString();
}

async function orderWithVehicle(customer) {
  const vehicle = await VehicleModel.create({
    licensePlate: `PL-${Date.now()}-${Math.random()}`, customerId: customer._id, brand: "Toyota", model: "Vios",
  });
  const order = await RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: 0, status: "pending" });
  return order;
}

describe("quotation.service", () => {
  it("pulls customer/vehicle fields from the repair order, not the request body", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer", fullName: "Real Customer" });
    const order = await orderWithVehicle(customer);
    const quote = await quotationService.createQuotation(
      { repairOrderId: order._id.toString(), lines: [{ description: "Brake pads", unitPrice: 50000, quantity: 1 }] },
      (await advisorId()),
    );
    expect(quote.customerName).toBe("Real Customer");
    expect(quote.status).toBe("draft");
  });

  it("rejects an empty lines array", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const order = await orderWithVehicle(customer);
    await expect(
      quotationService.createQuotation({ repairOrderId: order._id.toString(), lines: [] }, (await advisorId())),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a missing repairOrderId", async () => {
    await expect(
      quotationService.createQuotation({ lines: [{ description: "X", unitPrice: 1, quantity: 1 }] }, (await advisorId())),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("a sent quotation can no longer be edited", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const order = await orderWithVehicle(customer);
    const quote = await quotationService.createQuotation(
      { repairOrderId: order._id.toString(), lines: [{ description: "X", unitPrice: 1000, quantity: 1 }] },
      (await advisorId()),
    );
    await quotationService.sendQuotation(quote._id.toString());
    await expect(
      quotationService.updateQuotation(quote._id.toString(), { lines: [{ description: "Y", unitPrice: 2000, quantity: 1 }] }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("approving a sent quotation populates the repair order's services", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const order = await orderWithVehicle(customer);
    const quote = await quotationService.createQuotation(
      { repairOrderId: order._id.toString(), lines: [{ description: "Brake pads", unitPrice: 50000, quantity: 2 }] },
      (await advisorId()),
    );
    await quotationService.sendQuotation(quote._id.toString());
    await quotationService.confirmQuotation(quote._id.toString(), true);

    const updatedOrder = await RepairOrderModel.findById(order._id);
    expect(updatedOrder.totalCost).toBe(100000);
    expect(updatedOrder.services).toHaveLength(1);
  });

  it("rejecting a sent quotation leaves the order untouched", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const order = await orderWithVehicle(customer);
    const quote = await quotationService.createQuotation(
      { repairOrderId: order._id.toString(), lines: [{ description: "X", unitPrice: 1000, quantity: 1 }] },
      (await advisorId()),
    );
    await quotationService.sendQuotation(quote._id.toString());
    const result = await quotationService.confirmQuotation(quote._id.toString(), false);
    expect(result.status).toBe("rejected");

    const updatedOrder = await RepairOrderModel.findById(order._id);
    expect(updatedOrder.services).toHaveLength(0);
  });

  it("rejects confirming a quotation that hasn't been sent", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const order = await orderWithVehicle(customer);
    const quote = await quotationService.createQuotation(
      { repairOrderId: order._id.toString(), lines: [{ description: "X", unitPrice: 1000, quantity: 1 }] },
      (await advisorId()),
    );
    await expect(quotationService.confirmQuotation(quote._id.toString(), true)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("listQuotations scopes to a repairOrderId", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const order1 = await orderWithVehicle(customer);
    const order2 = await orderWithVehicle(customer);
    await quotationService.createQuotation({ repairOrderId: order1._id.toString(), lines: [{ description: "X", unitPrice: 1, quantity: 1 }] }, (await advisorId()));
    await quotationService.createQuotation({ repairOrderId: order2._id.toString(), lines: [{ description: "Y", unitPrice: 1, quantity: 1 }] }, (await advisorId()));

    const result = await quotationService.listQuotations({ repairOrderId: order1._id.toString() });
    expect(result.quotations).toHaveLength(1);
  });
});
