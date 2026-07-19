import { describe, it, expect } from "vitest";
import * as bookingService from "../../src/services/booking.service.js";
import { BookingModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";
import { SLOT_CAPACITY } from "../../src/config/constants.js";

const FUTURE_DATE = "2027-01-15";
const SLOT = "09:00";

function bookingPayload(overrides = {}) {
  return {
    customer: { fullName: "Nguyen Van A", phone: `090${Date.now()}`.slice(0, 10) },
    vehicle: { licensePlate: `PL-${Date.now()}-${Math.random()}` },
    bookingDate: FUTURE_DATE,
    timeSlot: SLOT,
    ...overrides,
  };
}

describe("booking.service", () => {
  describe("getSlots", () => {
    it("lists every configured slot with capacity/available", async () => {
      const result = await bookingService.getSlots(FUTURE_DATE);
      expect(result.capacity).toBe(SLOT_CAPACITY);
      expect(result.slots.every((s) => s.available)).toBe(true);
    });

    it("rejects a past date", async () => {
      await expect(bookingService.getSlots("2000-01-01")).rejects.toMatchObject({ status: 400 });
    });

    it("rejects a malformed date", async () => {
      await expect(bookingService.getSlots("15-01-2027")).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("createBooking", () => {
    it("creates a booking and claims a seat", async () => {
      const result = await bookingService.createBooking(bookingPayload());
      expect(result.booking.status).toBe("pending");
      expect(result.booking.seatNo).toBeGreaterThanOrEqual(1);
    });

    it("rejects missing customer fields", async () => {
      await expect(
        bookingService.createBooking(bookingPayload({ customer: {} })),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("rejects an unconfigured timeSlot", async () => {
      await expect(
        bookingService.createBooking(bookingPayload({ timeSlot: "09:30" })),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("rejects once the slot is at capacity", async () => {
      const plate = () => `PL-${Date.now()}-${Math.random()}`;
      for (let i = 0; i < SLOT_CAPACITY; i += 1) {
        await bookingService.createBooking(
          bookingPayload({ vehicle: { licensePlate: plate() }, customer: { fullName: "A", phone: `08${i}${Date.now()}`.slice(0, 10) } }),
        );
      }
      await expect(
        bookingService.createBooking(bookingPayload({ vehicle: { licensePlate: plate() } })),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe("confirmBooking / cancelBooking / rescheduleBooking / updateBookingStatus", () => {
    it("confirms a pending booking", async () => {
      const { booking } = await bookingService.createBooking(bookingPayload());
      const { user: advisor } = await createUser({ role: "serviceAdvisor" });
      const result = await bookingService.confirmBooking(booking._id.toString(), advisor._id.toString());
      expect(result.booking.status).toBe("confirmed");
    });

    it("rejects confirming an already-confirmed booking", async () => {
      const { booking } = await bookingService.createBooking(bookingPayload());
      const { user: advisor } = await createUser({ role: "serviceAdvisor" });
      await bookingService.confirmBooking(booking._id.toString(), advisor._id.toString());
      await expect(
        bookingService.confirmBooking(booking._id.toString(), advisor._id.toString()),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("customer cancels their own booking, freeing the slot", async () => {
      const { booking } = await bookingService.createBooking(bookingPayload());
      const customerId = booking.customerId._id.toString();
      const before = await bookingService.getSlots(FUTURE_DATE);
      const slotBefore = before.slots.find((s) => s.timeSlot === SLOT);

      await bookingService.cancelBooking(booking._id.toString(), { sub: customerId, role: "onlineCustomer" });

      const after = await bookingService.getSlots(FUTURE_DATE);
      const slotAfter = after.slots.find((s) => s.timeSlot === SLOT);
      expect(slotAfter.booked).toBe(slotBefore.booked - 1);
    });

    it("rejects a different customer cancelling", async () => {
      const { booking } = await bookingService.createBooking(bookingPayload());
      const { user: other } = await createUser({ role: "onlineCustomer" });
      await expect(
        bookingService.cancelBooking(booking._id.toString(), { sub: other._id.toString(), role: "onlineCustomer" }),
      ).rejects.toMatchObject({ status: 403 });
    });

    it("reschedules to a new date/slot", async () => {
      const { booking } = await bookingService.createBooking(bookingPayload());
      const customerId = booking.customerId._id.toString();
      const result = await bookingService.rescheduleBooking(
        booking._id.toString(),
        { sub: customerId, role: "onlineCustomer" },
        { bookingDate: "2027-01-16", timeSlot: "10:00" },
      );
      expect(result.booking.status).toBe("rescheduled");
      expect(result.booking.timeSlot).toBe("10:00");
    });

    it("updateBookingStatus enforces valid transitions", async () => {
      const { booking } = await bookingService.createBooking(bookingPayload());
      const { user: advisor } = await createUser({ role: "serviceAdvisor" });
      await expect(
        bookingService.updateBookingStatus(booking._id.toString(), { sub: advisor._id.toString(), role: "serviceAdvisor" }, { status: "completed" }),
      ).rejects.toMatchObject({ status: 409 }); // pending -> completed is not allowed directly

      const confirmed = await bookingService.updateBookingStatus(
        booking._id.toString(),
        { sub: advisor._id.toString(), role: "serviceAdvisor" },
        { status: "confirmed" },
      );
      expect(confirmed.booking.status).toBe("confirmed");
    });
  });

  describe("resolveCustomer / resolveVehicle", () => {
    it("finds an existing customer by phone instead of duplicating", async () => {
      const phone = `077${Date.now()}`.slice(0, 10);
      const first = await bookingService.resolveCustomer({ fullName: "A", phone });
      const second = await bookingService.resolveCustomer({ fullName: "A", phone });
      expect(second._id.toString()).toBe(first._id.toString());
    });

    it("finds an existing vehicle by plate instead of duplicating", async () => {
      const plate = `PL-${Date.now()}`;
      const { user } = await createUser({ role: "onlineCustomer" });
      const first = await bookingService.resolveVehicle({ licensePlate: plate }, user._id.toString());
      const second = await bookingService.resolveVehicle({ licensePlate: plate }, user._id.toString());
      expect(second._id.toString()).toBe(first._id.toString());
    });
  });
});
