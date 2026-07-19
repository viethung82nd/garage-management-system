import { describe, it, expect } from "vitest";
import * as advisorService from "../../src/services/advisor.service.js";
import { VehicleModel, BookingModel, RepairOrderModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";
import { todayUtc } from "../../src/utils/date.js";

describe("advisor.service", () => {
  it("returns all-zero counters on a fresh system", async () => {
    const result = await advisorService.getAdvisorDashboard();
    expect(result).toEqual({
      pendingBookings: 0,
      todayReceptions: 0,
      openRepairOrders: 0,
      waitingCustomers: 0,
    });
  });

  it("reflects real bookings and repair orders", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}`, customerId: customer._id });
    await BookingModel.create({
      customerId: customer._id,
      vehicleId: vehicle._id,
      bookingDate: todayUtc(),
      timeSlot: "09:00",
      source: "online",
      status: "pending",
      seatNo: 1,
    });
    await RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: 0, status: "pending" });

    const result = await advisorService.getAdvisorDashboard();
    expect(result.pendingBookings).toBe(1);
    expect(result.openRepairOrders).toBe(1);
  });
});
