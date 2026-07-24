import { describe, it, expect } from "vitest";
import * as repairOrderService from "../../src/services/repair-order.service.js";
import * as quotationService from "../../src/services/quotation.service.js";
import {
  VehicleModel,
  ServiceModel,
  RepairOrderStatusHistoryModel,
  AuditLogModel,
  CounterModel,
} from "../../src/models/index.js";
import { nextSequence, generateCode } from "../../src/utils/sequence.js";
import { createUser } from "../factories.js";

async function vehicleFor(customer) {
  return VehicleModel.create({
    licensePlate: `PL-${Date.now()}-${Math.random()}`,
    customerId: customer._id,
  });
}

async function makeOrder() {
  const { user: customer } = await createUser({ role: "onlineCustomer" });
  const vehicle = await vehicleFor(customer);
  const svc = await ServiceModel.create({ name: "Oil Change", basePrice: 100000, isActive: true });
  const order = await repairOrderService.createRepairOrder({
    vehicleId: vehicle._id.toString(),
    services: [{ serviceId: svc._id.toString(), quantity: 1 }],
  });
  return { order, customer, vehicle, svc };
}

describe("Phase 1 — document numbering (sequence util)", () => {
  it("nextSequence increments atomically and is gapless per key", async () => {
    const key = `t-${Date.now()}`;
    const a = await nextSequence(key);
    const b = await nextSequence(key);
    const c = await nextSequence(key);
    expect([a, b, c]).toEqual([1, 2, 3]);
  });

  it("nextSequence never hands the same number to concurrent callers", async () => {
    const key = `race-${Date.now()}`;
    const results = await Promise.all(Array.from({ length: 25 }, () => nextSequence(key)));
    expect(new Set(results).size).toBe(25); // all unique
    expect(Math.max(...results)).toBe(25);
    const counter = await CounterModel.findOne({ key });
    expect(counter.seq).toBe(25);
  });

  it("generateCode formats PREFIX-YYYYMM-NNNNN", async () => {
    const code = await generateCode("RO", { date: new Date("2026-07-15T00:00:00Z") });
    expect(code).toMatch(/^RO-202607-\d{5}$/);
  });
});

describe("Phase 1 — repair orders get a business code", () => {
  it("assigns an RO code on creation", async () => {
    const { order } = await makeOrder();
    expect(order.code).toMatch(/^RO-\d{6}-\d{5}$/);
  });

  it("gives two orders distinct codes", async () => {
    const { order: a } = await makeOrder();
    const { order: b } = await makeOrder();
    expect(a.code).not.toBe(b.code);
  });
});

describe("Phase 1 — repair-order status history", () => {
  it("records the initial pending transition on creation", async () => {
    const { order } = await makeOrder();
    const history = await RepairOrderStatusHistoryModel.find({ repairOrderId: order._id });
    expect(history).toHaveLength(1);
    expect(history[0].from).toBeNull();
    expect(history[0].to).toBe("pending");
  });

  it("appends a transition when progress changes the status", async () => {
    const { order } = await makeOrder();
    await repairOrderService.updateRepairProgress(order._id.toString(), { status: "inProgress" });
    const history = await RepairOrderStatusHistoryModel.find({ repairOrderId: order._id }).sort({
      changedAt: 1,
    });
    const transitions = history.map((h) => `${h.from ?? "∅"}→${h.to}`);
    expect(transitions).toContain("pending→inProgress");
  });
});

describe("Phase 1 — quote confirmation is audited", () => {
  it("writes a quoteApproved audit entry with the actor", async () => {
    const { order, customer } = await makeOrder();
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const quote = await quotationService.createQuotation(
      {
        repairOrderId: order._id.toString(),
        lines: [{ description: "Labor", kind: "labor", quantity: 1, unitPrice: 150000 }],
      },
      advisor._id.toString(),
    );

    await quotationService.confirmQuotation(quote._id.toString(), true, advisor._id.toString());

    const audit = await AuditLogModel.findOne({ action: "quoteApproved", targetId: quote._id });
    expect(audit).toBeTruthy();
    expect(audit.actorId.toString()).toBe(advisor._id.toString());

    // And the approval actually populated the order (transactional side effect).
    const RepairOrderModel = (await import("../../src/models/index.js")).RepairOrderModel;
    const refreshed = await RepairOrderModel.findById(order._id);
    expect(refreshed.services).toHaveLength(1);
    expect(refreshed.quoteId.toString()).toBe(quote._id.toString());
  });
});
