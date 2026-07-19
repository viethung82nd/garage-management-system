import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createUser, authHeader } from "../factories.js";

const app = createApp();

describe("Service Catalog API", () => {
  it("GET /api/services/categories is public", async () => {
    const res = await request(app).get("/api/services/categories");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /api/services/categories requires admin", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const res = await request(app).post("/api/services/categories").set(authHeader(advisor)).send({ name: "Bodywork" });
    expect(res.status).toBe(403);
  });

  it("admin creates a category, then a duplicate name 409s", async () => {
    const { user: admin } = await createUser({ role: "admin" });
    const create1 = await request(app).post("/api/services/categories").set(authHeader(admin)).send({ name: "Bodywork" });
    expect(create1.status).toBe(201);
    const create2 = await request(app).post("/api/services/categories").set(authHeader(admin)).send({ name: "bodywork" });
    expect(create2.status).toBe(409);
  });

  it("creates a service and lists it publicly", async () => {
    const { user: admin } = await createUser({ role: "admin" });
    const create = await request(app).post("/api/services").set(authHeader(admin)).send({ name: "Oil Change", basePrice: 100000 });
    expect(create.status).toBe(201);

    const list = await request(app).get("/api/services");
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it("GET /api/services/:id 400s for a malformed id", async () => {
    const res = await request(app).get("/api/services/not-an-id");
    expect(res.status).toBe(400);
  });

  it("admin updates and deletes a service", async () => {
    const { user: admin } = await createUser({ role: "admin" });
    const create = await request(app).post("/api/services").set(authHeader(admin)).send({ name: "Tire Rotation", basePrice: 20000 });
    const id = create.body._id;
    const update = await request(app).put(`/api/services/${id}`).set(authHeader(admin)).send({ basePrice: 25000 });
    expect(update.status).toBe(200);
    expect(update.body.basePrice).toBe(25000);
    const del = await request(app).delete(`/api/services/${id}`).set(authHeader(admin));
    expect(del.status).toBe(200);
  });
});
