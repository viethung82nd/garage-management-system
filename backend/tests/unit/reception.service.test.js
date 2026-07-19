import { describe, it, expect } from "vitest";
import * as receptionService from "../../src/services/reception.service.js";
import * as bookingService from "../../src/services/booking.service.js";
import { RepairOrderModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

describe("reception.service", () => {
  it("creates a walk-in reception with a repair order shell", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const result = await receptionService.createReception(
      { customerName: "Walk-in Customer", phone: "0933333333", plate: "51K-11111" },
      advisor._id.toString(),
    );
    expect(result.repairOrder.status).toBe("pending");
    expect(result.booking).toBeNull();
  });

  it("rejects missing customerName/phone", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    await expect(
      receptionService.createReception({ plate: "51K-22222" }, advisor._id.toString()),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("links a confirmed booking to the new repair order", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const { booking } = await bookingService.createBooking({
      customer: { fullName: "Booked Customer", phone: "0944444444" },
      vehicle: { licensePlate: "51K-33333" },
      bookingDate: "2027-02-01",
      timeSlot: "09:00",
    });
    const result = await receptionService.createReception(
      { bookingId: booking._id.toString(), customerName: "Booked Customer", phone: "0944444444", plate: "51K-33333" },
      advisor._id.toString(),
    );
    expect(result.booking.repairOrderId.toString()).toBe(result.repairOrder._id.toString());
  });

  it("rejects re-receiving an already-received booking", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const { booking } = await bookingService.createBooking({
      customer: { fullName: "A", phone: "0955555555" },
      vehicle: { licensePlate: "51K-44444" },
      bookingDate: "2027-02-02",
      timeSlot: "09:00",
    });
    await receptionService.createReception(
      { bookingId: booking._id.toString(), customerName: "A", phone: "0955555555", plate: "51K-44444" },
      advisor._id.toString(),
    );
    await expect(
      receptionService.createReception(
        { bookingId: booking._id.toString(), customerName: "A", phone: "0955555555", plate: "51K-44444" },
        advisor._id.toString(),
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("getReceptionHistory reflects a prior completed order for the plate", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const created = await receptionService.createReception(
      { customerName: "History Customer", phone: "0966666666", plate: "51K-55555" },
      advisor._id.toString(),
    );
    await RepairOrderModel.findByIdAndUpdate(created.repairOrder._id, { status: "completed" });

    const history = await receptionService.getReceptionHistory("51K-55555");
    expect(history.suggestions.length).toBeGreaterThan(0);
  });

  it("getReceptionHistory returns empty suggestions for an unknown plate", async () => {
    const history = await receptionService.getReceptionHistory("99Z-99999");
    expect(history.suggestions).toEqual([]);
  });
});
