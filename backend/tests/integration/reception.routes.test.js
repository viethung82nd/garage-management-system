import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createUser, authHeader } from "../factories.js";

const app = createApp();

describe("Reception API", () => {
  it("SA receives a walk-in customer, creating a repair order shell", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const res = await request(app)
      .post("/api/receptions")
      .set(authHeader(advisor))
      .send({ customerName: "Walk-in", phone: "0922222222", plate: "51K-77777" });
    expect(res.status).toBe(201);
    expect(res.body.repairOrder.status).toBe("pending");
  });

  it("rejects missing customerName/phone", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const res = await request(app).post("/api/receptions").set(authHeader(advisor)).send({ plate: "51K-66666" });
    expect(res.status).toBe(400);
  });

  it("GET /api/receptions/history returns suggestions for a known plate", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    await request(app)
      .post("/api/receptions")
      .set(authHeader(advisor))
      .send({ customerName: "History", phone: "0933333333", plate: "51K-55555" });
    const res = await request(app)
      .get("/api/receptions/history")
      .set(authHeader(advisor))
      .query({ plate: "51K-55555" });
    expect(res.status).toBe(200);
    expect(res.body.suggestions.length).toBeGreaterThan(0);
  });
});
