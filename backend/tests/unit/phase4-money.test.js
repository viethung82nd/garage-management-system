import { describe, it, expect } from "vitest";
import * as reportingService from "../../src/services/reporting.service.js";
import * as paymentService from "../../src/services/payment.service.js";
import * as invoiceService from "../../src/services/invoice.service.js";
import * as repairOrderService from "../../src/services/repair-order.service.js";
import * as quotationService from "../../src/services/quotation.service.js";
import {
  VehicleModel,
  ServiceModel,
  InvoiceModel,
  InventoryTransactionModel,
  TimeLogModel,
  RepairOrderModel,
  UserModel,
} from "../../src/models/index.js";
import { createUser } from "../factories.js";

async function customerVehicle(overrides = {}) {
  const { user: customer } = await createUser({ role: "onlineCustomer", ...overrides });
  const vehicle = await VehicleModel.create({
    licensePlate: `PL-${Date.now()}-${Math.random()}`,
    customerId: customer._id,
    chassisNumber: "1HGCM82633A004352",
    lastKnownMileage: 45000,
  });
  return { customer, vehicle };
}

/** Build a QC-passed, invoiceable order with the given service lines. */
async function invoiceableOrder(vehicle, advisor, lines) {
  const order = await RepairOrderModel.create({
    code: `RO-T-${Date.now()}-${Math.random()}`,
    vehicleId: vehicle._id,
    advisorId: advisor._id,
    services: lines,
    totalCost: lines.reduce((s, l) => s + l.priceAtTime * (l.quantity || 1), 0),
    status: "completed",
    qcPassedAt: new Date(),
  });
  return order;
}

describe("Phase 4 — payment settlement is race-safe", () => {
  async function unpaidInvoice(total) {
    const { vehicle } = await customerVehicle();
    const order = await RepairOrderModel.create({
      code: `RO-P-${Date.now()}-${Math.random()}`,
      vehicleId: vehicle._id,
      services: [{ name: "Job", priceAtTime: total, quantity: 1 }],
      totalCost: total,
      status: "completed",
      qcPassedAt: new Date(),
    });
    return InvoiceModel.create({
      code: `INV-P-${Date.now()}-${Math.random()}`,
      repairOrderId: order._id,
      lineItems: [{ description: "Job", quantity: 1, unitPrice: total }],
      subtotal: total,
      total,
      status: "unpaid",
    });
  }

  it("does not lose a payment when two land at once", async () => {
    const { user: accountant } = await createUser({ role: "accountant" });
    const invoice = await unpaidInvoice(1000000);

    // Two partial payments fired together. Under the old read-modify-write,
    // one increment would clobber the other.
    await Promise.all([
      paymentService.recordPayment(
        { invoiceId: invoice._id.toString(), method: "cash", amount: 400000 },
        accountant._id.toString(),
      ),
      paymentService.recordPayment(
        { invoiceId: invoice._id.toString(), method: "cash", amount: 300000 },
        accountant._id.toString(),
      ),
    ]);

    const settled = await InvoiceModel.findById(invoice._id);
    expect(settled.amountPaid).toBe(700000);
    expect(settled.status).toBe("partiallyPaid");
  });

  it("refuses a payment that would exceed the balance under concurrency", async () => {
    const { user: accountant } = await createUser({ role: "accountant" });
    const invoice = await unpaidInvoice(1000000);

    // Each is valid alone (<= 1,000,000) but together they overshoot.
    const results = await Promise.allSettled([
      paymentService.recordPayment(
        { invoiceId: invoice._id.toString(), method: "cash", amount: 800000 },
        accountant._id.toString(),
      ),
      paymentService.recordPayment(
        { invoiceId: invoice._id.toString(), method: "cash", amount: 800000 },
        accountant._id.toString(),
      ),
    ]);

    const rejected = results.filter((r) => r.status === "rejected");
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ status: 409 });

    const settled = await InvoiceModel.findById(invoice._id);
    expect(settled.amountPaid).toBe(800000); // only one applied
  });
});

describe("Phase 4 — gross profit splits labour and parts", () => {
  it("computes parts margin from frozen issue cost and labour from logged time", async () => {
    const { vehicle } = await customerVehicle();
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const { user: tech } = await createUser({ role: "technician" });
    tech.hourlyCost = 60000;
    await tech.save();

    const order = await invoiceableOrder(vehicle, advisor, [
      { name: "Brake pads", priceAtTime: 900000, quantity: 1, kind: "part" },
      { name: "Labour", priceAtTime: 500000, quantity: 1, kind: "labor" },
    ]);

    // Parts cost frozen on the issue ledger: 1 × 600,000.
    await InventoryTransactionModel.create({
      partId: (await VehicleModel.findById(vehicle._id))._id, // any ObjectId
      type: "issue",
      quantity: 1,
      unitCost: 600000,
      repairOrderId: order._id,
    });
    // 120 minutes of logged labour at 60,000/hr = 120,000 labour cost.
    await TimeLogModel.create({
      repairOrderId: order._id,
      technicianId: tech._id,
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endedAt: new Date(),
      durationMinutes: 120,
    });

    const issuedAt = new Date();
    await InvoiceModel.create({
      code: `INV-GP-${Date.now()}`,
      repairOrderId: order._id,
      lineItems: [
        { description: "Brake pads", quantity: 1, unitPrice: 900000, kind: "part" },
        { description: "Labour", quantity: 1, unitPrice: 500000, kind: "labor" },
      ],
      subtotal: 1400000,
      total: 1400000,
      status: "paid",
      amountPaid: 1400000,
      issuedAt,
    });

    const report = await reportingService.getGrossProfitReport({
      startDate: new Date(issuedAt.getTime() - 1000).toISOString(),
      endDate: new Date(issuedAt.getTime() + 1000).toISOString(),
    });

    expect(report.parts.revenue).toBe(900000);
    expect(report.parts.cost).toBe(600000);
    expect(report.parts.profit).toBe(300000);

    expect(report.labor.revenue).toBe(500000);
    expect(report.labor.cost).toBe(120000);
    expect(report.labor.profit).toBe(380000);

    expect(report.total.profit).toBe(680000);
  });
});

describe("Phase 4 — receivables ageing", () => {
  it("buckets an overdue and a current invoice for a customer", async () => {
    const { customer, vehicle } = await customerVehicle();
    // Two invoices need two orders — Invoice.repairOrderId is unique.
    const [order1, order2] = await RepairOrderModel.create([
      { code: `RO-AR1-${Date.now()}`, vehicleId: vehicle._id, services: [], status: "completed" },
      { code: `RO-AR2-${Date.now()}`, vehicleId: vehicle._id, services: [], status: "completed" },
    ]);

    const now = Date.now();
    await InvoiceModel.create({
      code: `INV-AR1-${Date.now()}`,
      repairOrderId: order1._id,
      lineItems: [],
      subtotal: 500000,
      total: 500000,
      amountPaid: 0,
      status: "unpaid",
      dueAt: new Date(now - 45 * 24 * 60 * 60 * 1000), // 45 days overdue
      billing: { customerName: "Acme Co" },
    });
    await InvoiceModel.create({
      code: `INV-AR2-${Date.now()}`,
      repairOrderId: order2._id,
      lineItems: [],
      subtotal: 200000,
      total: 200000,
      amountPaid: 0,
      status: "unpaid",
      dueAt: new Date(now + 10 * 24 * 60 * 60 * 1000), // not yet due
      billing: { customerName: "Acme Co" },
    });

    const report = await reportingService.getReceivablesReport();
    const row = report.byCustomer.find((r) => String(r.customerId) === String(customer._id));
    expect(row).toBeTruthy();
    expect(row.outstanding).toBe(700000);
    expect(row.d31_60).toBe(500000);
    expect(row.current).toBe(200000);
    expect(report.totals.outstanding).toBeGreaterThanOrEqual(700000);
  });
});

describe("Phase 4 — credit limit", () => {
  it("blocks new billing once a trade customer is at their limit", async () => {
    const { customer, vehicle } = await customerVehicle();
    customer.creditLimit = 1000000;
    await customer.save();

    // An existing unpaid invoice already at the limit.
    const past = await RepairOrderModel.create({
      code: `RO-CL0-${Date.now()}`,
      vehicleId: vehicle._id,
      services: [],
      status: "completed",
    });
    await InvoiceModel.create({
      code: `INV-CL0-${Date.now()}`,
      repairOrderId: past._id,
      lineItems: [],
      subtotal: 1000000,
      total: 1000000,
      amountPaid: 0,
      status: "unpaid",
    });

    const { user: accountant } = await createUser({ role: "accountant" });
    const svc = await ServiceModel.create({ name: "Svc", basePrice: 200000, isActive: true });
    const order = await invoiceableOrder(vehicle, accountant, [
      { serviceId: svc._id, name: "Svc", priceAtTime: 200000, quantity: 1, kind: "labor" },
    ]);

    await expect(
      invoiceService.generateInvoiceFromRepairOrder(
        { repairOrderId: order._id.toString() },
        accountant._id.toString(),
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("lets an ordinary cash customer (limit 0) be billed normally", async () => {
    const { vehicle } = await customerVehicle();
    const { user: accountant } = await createUser({ role: "accountant" });
    const svc = await ServiceModel.create({ name: "Svc", basePrice: 200000, isActive: true });
    const order = await invoiceableOrder(vehicle, accountant, [
      { serviceId: svc._id, name: "Svc", priceAtTime: 200000, quantity: 1, kind: "labor" },
    ]);

    const { invoice } = await invoiceService.generateInvoiceFromRepairOrder(
      { repairOrderId: order._id.toString() },
      accountant._id.toString(),
    );
    expect(invoice.total).toBe(200000);
    // Billing identity + vehicle snapshot are captured on the invoice.
    const saved = await InvoiceModel.findById(invoice.id);
    expect(saved.billing.vehiclePlate).toBe(vehicle.licensePlate);
    expect(saved.billing.odometer).toBe(45000);
  });
});

describe("Phase 4 — e-invoice (demo mint)", () => {
  it("issues a symbol/number/lookup code and refuses a second issue", async () => {
    const { vehicle } = await customerVehicle();
    const { user: accountant } = await createUser({ role: "accountant" });
    const order = await invoiceableOrder(vehicle, accountant, [
      { name: "Job", priceAtTime: 300000, quantity: 1, kind: "labor" },
    ]);
    const { invoice } = await invoiceService.generateInvoiceFromRepairOrder(
      { repairOrderId: order._id.toString() },
      accountant._id.toString(),
    );

    const { invoice: withEinvoice } = await invoiceService.issueEInvoice(
      invoice.id,
      accountant._id.toString(),
    );
    const saved = await InvoiceModel.findById(invoice.id);
    expect(saved.einvoice.status).toBe("issued");
    expect(saved.einvoice.symbol).toMatch(/^C\d{2}TAA$/);
    expect(saved.einvoice.number).toBeTruthy();
    expect(saved.einvoice.lookupCode).toBeTruthy();

    await expect(
      invoiceService.issueEInvoice(invoice.id, accountant._id.toString()),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("Phase 4 — workshop KPIs", () => {
  it("computes ARO from paid invoices in the period", async () => {
    const { vehicle } = await customerVehicle();
    const order = await RepairOrderModel.create({
      code: `RO-KPI-${Date.now()}`,
      vehicleId: vehicle._id,
      services: [],
      status: "completed",
    });
    const issuedAt = new Date();
    await InvoiceModel.create({
      code: `INV-KPI-${Date.now()}`,
      repairOrderId: order._id,
      lineItems: [{ description: "Job", quantity: 1, unitPrice: 800000, kind: "labor" }],
      subtotal: 800000,
      total: 800000,
      status: "paid",
      amountPaid: 800000,
      issuedAt,
    });

    const report = await reportingService.getWorkshopKpis({
      startDate: new Date(issuedAt.getTime() - 1000).toISOString(),
      endDate: new Date(issuedAt.getTime() + 1000).toISOString(),
    });
    expect(report.carCount).toBeGreaterThanOrEqual(1);
    expect(report.aro).toBeGreaterThan(0);
  });
});
