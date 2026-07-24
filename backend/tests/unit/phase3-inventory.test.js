import { describe, it, expect } from "vitest";
import * as quotationService from "../../src/services/quotation.service.js";
import * as repairOrderService from "../../src/services/repair-order.service.js";
import * as partService from "../../src/services/part.service.js";
import {
  VehicleModel,
  ServiceModel,
  PartModel,
  RepairOrderModel,
  InventoryTransactionModel,
  StockReservationModel,
  AuditLogModel,
  RepairOrderStatusHistoryModel,
} from "../../src/models/index.js";
import { createUser } from "../factories.js";

let skuCounter = 0;
async function partDoc({ stock = 10, cost = 100000, price = 150000 } = {}) {
  skuCounter += 1;
  return PartModel.create({
    name: `Brake pad ${skuCounter}`,
    sku: `SKU-${Date.now()}-${skuCounter}`,
    unitPrice: price,
    costPrice: cost,
    stockQuantity: stock,
    reorderPoint: 2,
    maxStock: 20,
  });
}

async function scenario() {
  const { user: customer } = await createUser({ role: "onlineCustomer" });
  const { user: advisor } = await createUser({ role: "serviceAdvisor" });
  const vehicle = await VehicleModel.create({
    licensePlate: `PL-${Date.now()}-${Math.random()}`,
    customerId: customer._id,
  });
  const svc = await ServiceModel.create({ name: "Labor", basePrice: 100000, isActive: true });
  const order = await repairOrderService.createRepairOrder({
    vehicleId: vehicle._id.toString(),
    services: [{ serviceId: svc._id.toString(), quantity: 1 }],
  });
  return { customer, advisor, vehicle, order };
}

/** Quote one part line for `quantity`, then approve it. */
async function quoteAndApprovePart(order, advisor, part, quantity) {
  const quote = await quotationService.createQuotation(
    {
      repairOrderId: order._id.toString(),
      lines: [
        {
          description: part.name,
          kind: "part",
          partId: part._id.toString(),
          quantity,
          unitPrice: part.unitPrice,
        },
      ],
    },
    advisor._id.toString(),
  );
  await quotationService.confirmQuotation(
    quote._id.toString(),
    { approved: true, channel: "inPerson" },
    advisor._id.toString(),
    "serviceAdvisor",
  );
  return quote;
}

describe("Phase 3 — approving a quote reserves stock", () => {
  it("reserves the quantity without yet removing it from the shelf", async () => {
    const { advisor, order } = await scenario();
    const part = await partDoc({ stock: 10 });

    await quoteAndApprovePart(order, advisor, part, 3);

    const refreshed = await PartModel.findById(part._id);
    // Still physically present, but no longer sellable to anyone else.
    expect(refreshed.stockQuantity).toBe(10);
    expect(refreshed.reservedQuantity).toBe(3);
    expect(refreshed.availableQuantity).toBe(7);

    const reservations = await StockReservationModel.find({ repairOrderId: order._id });
    expect(reservations).toHaveLength(1);
    expect(reservations[0].status).toBe("active");
    expect(reservations[0].quantity).toBe(3);
  });

  it("stops a second order being promised stock the first already holds", async () => {
    const part = await partDoc({ stock: 5 });
    const first = await scenario();
    const second = await scenario();

    await quoteAndApprovePart(first.order, first.advisor, part, 4);
    await quoteAndApprovePart(second.order, second.advisor, part, 4);

    const refreshed = await PartModel.findById(part._id);
    // Only what was actually free got committed to the second order.
    expect(refreshed.reservedQuantity).toBe(5);

    const secondReservation = await StockReservationModel.findOne({
      repairOrderId: second.order._id,
    });
    expect(secondReservation.quantity).toBe(1);
    expect(secondReservation.shortfall).toBe(3);
  });

  it("moves the order to waitingParts with the shortage as the reason", async () => {
    const { advisor, order } = await scenario();
    const part = await partDoc({ stock: 1 });

    await quoteAndApprovePart(order, advisor, part, 4);

    const refreshed = await RepairOrderModel.findById(order._id);
    expect(refreshed.status).toBe("waitingParts");

    const history = await RepairOrderStatusHistoryModel.find({ repairOrderId: order._id });
    const waiting = history.find((h) => h.to === "waitingParts");
    expect(waiting).toBeTruthy();
    expect(waiting.reason).toMatch(/thiếu 3/);
  });

  it("leaves the order alone when stock covers the whole line", async () => {
    const { advisor, order } = await scenario();
    const part = await partDoc({ stock: 10 });

    await quoteAndApprovePart(order, advisor, part, 2);

    const refreshed = await RepairOrderModel.findById(order._id);
    expect(refreshed.status).toBe("pending");
  });
});

describe("Phase 3 — issuing parts moves stock off the shelf", () => {
  it("decrements stock, clears the reservation and writes a ledger entry", async () => {
    const { advisor, order } = await scenario();
    const { user: storeman } = await createUser({ role: "partsStaff" });
    const part = await partDoc({ stock: 10, cost: 90000 });

    await quoteAndApprovePart(order, advisor, part, 3);
    const result = await repairOrderService.issuePartsForOrder(
      order._id.toString(),
      storeman._id.toString(),
    );

    expect(result.issued).toHaveLength(1);

    const refreshed = await PartModel.findById(part._id);
    expect(refreshed.stockQuantity).toBe(7);
    expect(refreshed.reservedQuantity).toBe(0);

    const ledger = await InventoryTransactionModel.find({ partId: part._id, type: "issue" });
    expect(ledger).toHaveLength(1);
    expect(ledger[0].quantity).toBe(3);
    // Cost frozen at issue time, so past margin can't be rewritten by a
    // later price change.
    expect(ledger[0].unitCost).toBe(90000);
    expect(ledger[0].balanceAfter).toBe(7);
    expect(ledger[0].repairOrderId.toString()).toBe(order._id.toString());

    const reservation = await StockReservationModel.findOne({ repairOrderId: order._id });
    expect(reservation.status).toBe("consumed");
  });

  it("is idempotent — issuing twice does not double-deduct", async () => {
    const { advisor, order } = await scenario();
    const { user: storeman } = await createUser({ role: "partsStaff" });
    const part = await partDoc({ stock: 10 });

    await quoteAndApprovePart(order, advisor, part, 3);
    await repairOrderService.issuePartsForOrder(order._id.toString(), storeman._id.toString());
    const second = await repairOrderService.issuePartsForOrder(
      order._id.toString(),
      storeman._id.toString(),
    );

    expect(second.issued).toHaveLength(0);
    const refreshed = await PartModel.findById(part._id);
    expect(refreshed.stockQuantity).toBe(7);
  });

  it("frees reserved stock when a pending order is deleted", async () => {
    const { advisor, order } = await scenario();
    const part = await partDoc({ stock: 10 });

    await quoteAndApprovePart(order, advisor, part, 3);
    expect((await PartModel.findById(part._id)).reservedQuantity).toBe(3);

    await repairOrderService.deleteRepairOrder(order._id.toString());

    const refreshed = await PartModel.findById(part._id);
    expect(refreshed.reservedQuantity).toBe(0);
    expect(refreshed.stockQuantity).toBe(10);
  });
});

describe("Phase 3 — stock corrections are controlled", () => {
  it("refuses a stock quantity typed straight onto the part record", async () => {
    const part = await partDoc({ stock: 10 });

    // stockQuantity is simply not an accepted field on update — the balance is
    // a ledger, not a text box.
    await partService.updatePart(part._id.toString(), { stockQuantity: 999, unitPrice: 200000 });

    const refreshed = await PartModel.findById(part._id);
    expect(refreshed.stockQuantity).toBe(10);
    expect(refreshed.unitPrice).toBe(200000);
  });

  it("requires a reason for an adjustment", async () => {
    const { user: storeman } = await createUser({ role: "partsStaff" });
    const part = await partDoc({ stock: 10 });

    await expect(
      partService.adjustPartStock(part._id.toString(), { newQuantity: 8 }, storeman._id.toString()),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("records an adjustment in the ledger and the audit log", async () => {
    const { user: storeman } = await createUser({ role: "partsStaff" });
    const part = await partDoc({ stock: 10 });

    await partService.adjustPartStock(
      part._id.toString(),
      { newQuantity: 8, reason: "Stock count — 2 damaged" },
      storeman._id.toString(),
    );

    const refreshed = await PartModel.findById(part._id);
    expect(refreshed.stockQuantity).toBe(8);

    const ledger = await InventoryTransactionModel.findOne({
      partId: part._id,
      type: "adjustment",
    });
    expect(ledger.quantity).toBe(2);
    expect(ledger.balanceAfter).toBe(8);

    const audit = await AuditLogModel.findOne({ action: "stockAdjusted", targetId: part._id });
    expect(audit).toBeTruthy();
    expect(audit.details).toMatch(/10 → 8/);
  });

  it("retires a part instead of deleting it", async () => {
    const part = await partDoc();
    await partService.deletePart(part._id.toString());

    const refreshed = await PartModel.findById(part._id);
    expect(refreshed).toBeTruthy();
    expect(refreshed.isActive).toBe(false);

    const active = await partService.getAllParts({});
    expect(active.find((p) => p._id.toString() === part._id.toString())).toBeUndefined();
  });

  it("lists parts at or below their reorder point", async () => {
    const low = await partDoc({ stock: 1 });
    const healthy = await partDoc({ stock: 15 });

    const lowStock = await partService.getAllParts({ lowStock: true });
    const ids = lowStock.map((p) => p._id.toString());
    expect(ids).toContain(low._id.toString());
    expect(ids).not.toContain(healthy._id.toString());
  });
});
