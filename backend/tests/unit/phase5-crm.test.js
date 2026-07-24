import { describe, it, expect } from "vitest";
import * as receptionService from "../../src/services/reception.service.js";
import * as repairOrderService from "../../src/services/repair-order.service.js";
import * as invoiceService from "../../src/services/invoice.service.js";
import * as paymentService from "../../src/services/payment.service.js";
import * as vehicleService from "../../src/services/vehicle.service.js";
import * as trackingService from "../../src/services/tracking.service.js";
import {
  VehicleModel,
  RepairOrderModel,
  OdometerLogModel,
} from "../../src/models/index.js";
import { createUser } from "../factories.js";

async function advisor() {
  const { user } = await createUser({ role: "serviceAdvisor" });
  return user;
}

function receptionPayload(overrides = {}) {
  const n = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    customerName: "Nguyen Van A",
    phone: `09${n}`.slice(0, 10),
    plate: `51K-${n}`.slice(0, 9),
    model: "Vios",
    vin: `1HGCM82633A${n}`.slice(0, 17).padEnd(17, "0").toUpperCase().replace(/[IOQ]/g, "0"),
    engineNo: "ENG123",
    mileage: 20000,
    ...overrides,
  };
}

describe("Phase 5 — odometer history + rollback guard", () => {
  it("logs each reading and does not flag a normal increase", async () => {
    const sa = await advisor();
    const first = await receptionService.createReception(receptionPayload({ mileage: 20000 }), sa._id.toString());
    // Same vehicle, higher reading next visit.
    const second = await receptionService.createReception(
      receptionPayload({
        mileage: 25000,
        customerName: first.customer.fullName,
        phone: first.customer.phone,
        plate: first.vehicle.licensePlate,
      }),
      sa._id.toString(),
    );

    expect(second.warnings.odometerRollback).toBeNull();
    const logs = await OdometerLogModel.find({ vehicleId: first.vehicle._id }).sort({ recordedAt: 1 });
    expect(logs).toHaveLength(2);
    expect(logs.map((l) => l.mileage)).toEqual([20000, 25000]);
  });

  it("accepts but flags a reading lower than the last (rolled-back meter)", async () => {
    const sa = await advisor();
    const first = await receptionService.createReception(receptionPayload({ mileage: 40000 }), sa._id.toString());
    const second = await receptionService.createReception(
      receptionPayload({
        mileage: 30000, // lower!
        customerName: first.customer.fullName,
        phone: first.customer.phone,
        plate: first.vehicle.licensePlate,
      }),
      sa._id.toString(),
    );

    expect(second.warnings.odometerRollback).toMatch(/lower/);
    const last = await OdometerLogModel.findOne({ vehicleId: first.vehicle._id, mileage: 30000 });
    expect(last.isRollback).toBe(true);
  });

  it("exposes the odometer history via the service", async () => {
    const sa = await advisor();
    const r = await receptionService.createReception(receptionPayload({ mileage: 12345 }), sa._id.toString());
    const { readings } = await vehicleService.getOdometerHistory(r.vehicle._id.toString());
    expect(readings[0].mileage).toBe(12345);
  });
});

describe("Phase 5 — service warranty + comeback", () => {
  /** Drive an order all the way to delivered so warranty gets stamped. */
  async function deliveredOrder(sa, mileage = 20000) {
    const recv = await receptionService.createReception(receptionPayload({ mileage }), sa._id.toString());
    const order = recv.repairOrder;
    // Minimal path to a paid, QC-passed, delivered order.
    order.services = [{ name: "Job", priceAtTime: 300000, quantity: 1 }];
    order.totalCost = 300000;
    order.status = "completed";
    order.qcPassedAt = new Date();
    await order.save();

    const { user: accountant } = await createUser({ role: "accountant" });
    const { invoice } = await invoiceService.generateInvoiceFromRepairOrder(
      { repairOrderId: order._id.toString() },
      accountant._id.toString(),
    );
    await paymentService.recordPayment(
      { invoiceId: invoice.id, method: "cash" },
      accountant._id.toString(),
    );
    await repairOrderService.deliverVehicle(order._id.toString(), {}, sa._id.toString());
    return { recv, order };
  }

  it("stamps a warranty window at delivery", async () => {
    const sa = await advisor();
    const { order } = await deliveredOrder(sa, 20000);
    const delivered = await RepairOrderModel.findById(order._id);
    expect(delivered.warrantyUntilDate).toBeInstanceOf(Date);
    expect(delivered.warrantyUntilDate.getTime()).toBeGreaterThan(Date.now());
    expect(delivered.warrantyUntilKm).toBe(25000); // 20000 + 5000
  });

  it("flags a return within warranty as a comeback at reception", async () => {
    const sa = await advisor();
    const { recv } = await deliveredOrder(sa, 20000);

    // Same vehicle returns soon, within the km cap.
    const back = await receptionService.createReception(
      receptionPayload({
        mileage: 21000,
        customerName: recv.customer.fullName,
        phone: recv.customer.phone,
        plate: recv.vehicle.licensePlate,
      }),
      sa._id.toString(),
    );

    expect(back.warnings.comeback).toBeTruthy();
    expect(back.warnings.comeback.parentRoId.toString()).toBe(recv.repairOrder._id.toString());
  });

  it("opens an order as a linked comeback when parentRoId is supplied", async () => {
    const sa = await advisor();
    const { recv } = await deliveredOrder(sa, 20000);

    const back = await receptionService.createReception(
      receptionPayload({
        mileage: 21000,
        customerName: recv.customer.fullName,
        phone: recv.customer.phone,
        plate: recv.vehicle.licensePlate,
        parentRoId: recv.repairOrder._id.toString(),
      }),
      sa._id.toString(),
    );

    const comebackOrder = await RepairOrderModel.findById(back.repairOrder._id);
    expect(comebackOrder.isComeback).toBe(true);
    expect(comebackOrder.parentRoId.toString()).toBe(recv.repairOrder._id.toString());
  });
});

describe("Phase 5 — public tracking no longer mislabels rework", () => {
  it("shows a re-check, not 'awaiting intake', for a reworkRequired order", async () => {
    const sa = await advisor();
    const recv = await receptionService.createReception(receptionPayload(), sa._id.toString());
    const order = await RepairOrderModel.findById(recv.repairOrder._id);
    order.status = "reworkRequired";
    await order.save();

    const result = await trackingService.trackRepairOrder({
      plate: recv.vehicle.licensePlate,
      phone: recv.customer.phone,
    });
    expect(result.statusLabel).not.toMatch(/awaiting service intake/i);
    expect(result.statusLabel).toMatch(/re-check/i);
  });
});
