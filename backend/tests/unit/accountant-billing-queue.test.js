import { describe, it, expect } from "vitest";
import * as repairOrderService from "../../src/services/repair-order.service.js";
import * as auditLogService from "../../src/services/audit-log.service.js";
import { VehicleModel, RepairOrderModel, AuditLogModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

async function orderFor(overrides) {
  const { user: customer } = await createUser({ role: "onlineCustomer" });
  const vehicle = await VehicleModel.create({
    licensePlate: `PL-${Date.now()}-${Math.random()}`,
    customerId: customer._id,
  });
  return RepairOrderModel.create({
    code: `RO-Q-${Date.now()}-${Math.random()}`,
    vehicleId: vehicle._id,
    services: [{ name: "Job", priceAtTime: 100000, quantity: 1 }],
    totalCost: 100000,
    ...overrides,
  });
}

describe("Accountant billing queue — readyToInvoice filter", () => {
  it("returns orders that passed QC and are not yet invoiced", async () => {
    const ready = await orderFor({ status: "readyForDelivery", qcPassedAt: new Date() });
    await orderFor({ status: "inProgress" }); // not QC'd
    await orderFor({ status: "completed" }); // completed but never QC'd
    await orderFor({ status: "readyForDelivery", qcPassedAt: new Date(), invoicedAt: new Date() }); // already billed

    const orders = await repairOrderService.getAllRepairOrders({ readyToInvoice: "true" });
    const ids = orders.map((o) => o._id.toString());

    expect(ids).toContain(ready._id.toString());
    expect(ids).toHaveLength(1); // only the genuinely-billable one
  });

  it("does NOT rely on status === completed (the regression that broke the queue)", async () => {
    // A QC-passed order now sits at readyForDelivery, not completed — the old
    // ?status=completed query missed it entirely.
    const ready = await orderFor({ status: "readyForDelivery", qcPassedAt: new Date() });
    const byStatus = await repairOrderService.getAllRepairOrders({ status: "completed" });
    expect(byStatus.map((o) => o._id.toString())).not.toContain(ready._id.toString());

    const billable = await repairOrderService.getAllRepairOrders({ readyToInvoice: "true" });
    expect(billable.map((o) => o._id.toString())).toContain(ready._id.toString());
  });
});

describe("Accountant audit trail — billing scope", () => {
  it("defaults to billing actions only, keeping non-billing events out", async () => {
    const { user: actor } = await createUser({ role: "accountant" });
    await AuditLogModel.create([
      { action: "invoiceGenerated", actorId: actor._id, details: "billing" },
      { action: "stockAdjusted", actorId: actor._id, details: "not billing" },
      { action: "orderStatusChanged", actorId: actor._id, details: "not billing" },
    ]);

    const { entries } = await auditLogService.listAuditLogs();
    const actions = entries.map((e) => e.action);
    expect(actions).toContain("invoiceGenerated");
    expect(actions).not.toContain("stockAdjusted");
    expect(actions).not.toContain("orderStatusChanged");
  });

  it("scope=all surfaces everything", async () => {
    const { user: actor } = await createUser({ role: "admin" });
    await AuditLogModel.create({ action: "stockAdjusted", actorId: actor._id, details: "x" });
    const { entries } = await auditLogService.listAuditLogs({ scope: "all" });
    expect(entries.some((e) => e.action === "stockAdjusted")).toBe(true);
  });
});
