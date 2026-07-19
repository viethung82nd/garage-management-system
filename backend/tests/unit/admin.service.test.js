import { describe, it, expect } from "vitest";
import * as adminService from "../../src/services/admin.service.js";
import { VehicleModel, RepairOrderModel, InvoiceModel, PaymentModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";
import { todayUtc } from "../../src/utils/date.js";

describe("admin.service", () => {
  it("getStatsSummary zero-fills every booking status on a fresh system", async () => {
    const result = await adminService.getStatsSummary();
    expect(result.bookings.total).toBe(0);
    expect(Object.keys(result.bookings.byStatus)).toContain("pending");
  });

  it("getDailyIntake clamps out-of-range days", async () => {
    // 0 is falsy in JS, so `Number(days) || 7` intentionally treats it the
    // same as "not provided" (defaults to 7) -- use a negative number to
    // exercise the actual lower clamp bound instead.
    const low = await adminService.getDailyIntake(-5);
    expect(low.days).toHaveLength(1);
    const high = await adminService.getDailyIntake(100);
    expect(high.days).toHaveLength(31);
  });

  it("getRevenueReport rejects endDate before startDate", async () => {
    await expect(
      adminService.getRevenueReport({ startDate: "2026-02-01", endDate: "2026-01-01" }, "admin-id"),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("getRevenueReport totals a real succeeded payment", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}`, customerId: customer._id });
    const order = await RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: 100000, status: "completed" });
    const invoice = await InvoiceModel.create({
      repairOrderId: order._id, lineItems: [], subtotal: 100000, discount: 0, total: 100000, status: "paid",
    });
    await PaymentModel.create({
      invoiceId: invoice._id, customerId: customer._id, amount: 100000, method: "cash", status: "succeeded", paidAt: new Date(),
    });

    const today = todayUtc().toISOString().slice(0, 10);
    const result = await adminService.getRevenueReport({ startDate: today, endDate: today }, "admin-id");
    expect(result.report.totalRevenue).toBe(100000);
  });

  it("listUsers forces a technician caller to see only technicians", async () => {
    await createUser({ role: "admin" });
    await createUser({ role: "technician" });
    const result = await adminService.listUsers({ role: "admin" }, "technician");
    expect(result.users.every((u) => u.role === "technician")).toBe(true);
  });

  it("listUsers rejects an invalid role filter", async () => {
    await expect(adminService.listUsers({ role: "bogus" }, "admin")).rejects.toMatchObject({ status: 400 });
  });

  it("deactivateUser rejects self-deactivation", async () => {
    const { user: admin } = await createUser({ role: "admin" });
    await expect(
      adminService.deactivateUser(admin._id.toString(), admin._id.toString()),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("deactivateUser deactivates another account", async () => {
    const { user: admin } = await createUser({ role: "admin" });
    const { user: staff } = await createUser({ role: "technician" });
    const result = await adminService.deactivateUser(staff._id.toString(), admin._id.toString());
    expect(result.user.isActive).toBe(false);
  });
});
