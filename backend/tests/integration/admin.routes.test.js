import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createUser, authHeader } from "../factories.js";

const app = createApp();

describe("Admin API", () => {
  it("GET /api/admin/stats/summary requires auth", async () => {
    const res = await request(app).get("/api/admin/stats/summary");
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/stats/summary returns figures for admin", async () => {
    const { user: admin } = await createUser({ role: "admin" });
    const res = await request(app).get("/api/admin/stats/summary").set(authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("bookings");
  });

  it("GET /api/admin/users restricts a technician caller to technicians only", async () => {
    await createUser({ role: "admin" });
    const { user: tech } = await createUser({ role: "technician" });
    const res = await request(app).get("/api/admin/users").set(authHeader(tech)).query({ role: "admin" });
    expect(res.status).toBe(200);
    expect(res.body.users.every((u) => u.role === "technician")).toBe(true);
  });

  it("PATCH /api/admin/users/:id/deactivate rejects self-deactivation", async () => {
    const { user: admin } = await createUser({ role: "admin" });
    const res = await request(app).patch(`/api/admin/users/${admin._id}/deactivate`).set(authHeader(admin));
    expect(res.status).toBe(400);
  });
});
