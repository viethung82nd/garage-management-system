import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createUser, authHeader } from "../factories.js";

const app = createApp();

describe("Schedule API", () => {
  it("GET /api/schedules auto-creates a schedule for the caller", async () => {
    const { user: tech } = await createUser({ role: "technician" });
    const res = await request(app).get("/api/schedules").set(authHeader(tech)).query({
      technicianId: tech._id.toString(), date: "2026-09-01",
    });
    expect(res.status).toBe(200);
    expect(res.body.isAvailable).toBe(true);
  });

  it("PATCH /api/schedules updates isAvailable", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const { user: tech } = await createUser({ role: "technician" });
    const res = await request(app)
      .patch("/api/schedules")
      .set(authHeader(advisor))
      .query({ technicianId: tech._id.toString(), date: "2026-09-02" })
      .send({ isAvailable: false });
    expect(res.status).toBe(200);
    expect(res.body.isAvailable).toBe(false);
  });

  it("a technician cannot read a peer's schedule (403)", async () => {
    const { user: techA } = await createUser({ role: "technician" });
    const { user: techB } = await createUser({ role: "technician" });
    const res = await request(app)
      .get("/api/schedules")
      .set(authHeader(techA))
      .query({ technicianId: techB._id.toString(), date: "2026-09-03" });
    expect(res.status).toBe(403);
  });
});
