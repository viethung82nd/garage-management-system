import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createUser, authHeader, futureDateStr } from "../factories.js";

const app = createApp();
const FUTURE_DATE = futureDateStr(365);

function bookingPayload(overrides = {}) {
  return {
    customer: { fullName: "A", phone: `090${Date.now()}`.slice(0, 10) },
    vehicle: { licensePlate: `PL-${Date.now()}-${Math.random()}` },
    bookingDate: FUTURE_DATE,
    timeSlot: "09:00",
    ...overrides,
  };
}

describe("Booking API", () => {
  it("GET /api/bookings/slots is public", async () => {
    const res = await request(app).get("/api/bookings/slots").query({ date: FUTURE_DATE });
    expect(res.status).toBe(200);
    expect(res.body.capacity).toBe(5);
  });

  it("POST /api/bookings is public and creates a booking", async () => {
    const res = await request(app).post("/api/bookings").send(bookingPayload());
    expect(res.status).toBe(201);
    expect(res.body.booking.status).toBe("pending");
  });

  it("GET /api/bookings requires staff", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const res = await request(app).get("/api/bookings").set(authHeader(customer));
    expect(res.status).toBe(403);
  });

  it("staff confirms a booking end-to-end", async () => {
    const created = await request(app).post("/api/bookings").send(bookingPayload());
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const res = await request(app)
      .patch(`/api/bookings/${created.body.booking._id}/confirm`)
      .set(authHeader(advisor));
    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe("confirmed");
  });

  it("customer cancels their own booking", async () => {
    const created = await request(app).post("/api/bookings").send(bookingPayload());
    const customerId = created.body.booking.customerId._id ?? created.body.booking.customerId;
    // Log in isn't possible for the auto-created walk-in-style customer (no
    // password), so exercise the ownership path via a signed token for the
    // same id, mirroring what a real session would carry.
    const jwt = (await import("../../src/utils/jwt.js")).signAccessToken({ sub: customerId, role: "onlineCustomer" });
    const res = await request(app)
      .patch(`/api/bookings/${created.body.booking._id}/cancel`)
      .set("Authorization", `Bearer ${jwt}`);
    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe("cancelled");
  });
});
