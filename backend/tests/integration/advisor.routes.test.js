import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createUser, authHeader } from "../factories.js";

const app = createApp();

describe("Advisor API", () => {
  it("GET /api/advisor/dashboard requires serviceAdvisor/admin", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const res = await request(app).get("/api/advisor/dashboard").set(authHeader(customer));
    expect(res.status).toBe(403);
  });

  it("GET /api/advisor/dashboard returns counters for a service advisor", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const res = await request(app).get("/api/advisor/dashboard").set(authHeader(advisor));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("pendingBookings");
  });
});
