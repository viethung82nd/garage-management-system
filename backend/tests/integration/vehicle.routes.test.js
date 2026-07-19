import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createUser, authHeader } from "../factories.js";

const app = createApp();

describe("Vehicle API", () => {
  it("GET /api/vehicles/exists requires staff auth", async () => {
    const res = await request(app).get("/api/vehicles/exists?licensePlate=29A-11111");
    expect(res.status).toBe(401);
  });

  it("POST /api/vehicles self-service customer creates their own vehicle", async () => {
    const { user } = await createUser({ role: "onlineCustomer" });
    const res = await request(app).post("/api/vehicles").set(authHeader(user)).send({ licensePlate: "29A-22222" });
    expect(res.status).toBe(201);
    expect(res.body.vehicle.customerId).toBe(user._id.toString());
  });

  it("GET /api/vehicles/exists reflects a created vehicle", async () => {
    const { user: advisorUser, customer } = await authHeaderUser();
    await request(app).post("/api/vehicles").set(authHeader(advisorUser)).send({
      licensePlate: "29A-33333", customerId: customer._id.toString(),
    });
    const res = await request(app)
      .get("/api/vehicles/exists?licensePlate=29A-33333")
      .set(authHeader(advisorUser));
    expect(res.status).toBe(200);
    expect(res.body.exists).toBe(true);
  });

  it("POST /api/vehicles rejects a duplicate plate with 409", async () => {
    const { user } = await createUser({ role: "onlineCustomer" });
    await request(app).post("/api/vehicles").set(authHeader(user)).send({ licensePlate: "29A-44444" });
    const res = await request(app).post("/api/vehicles").set(authHeader(user)).send({ licensePlate: "29A-44444" });
    expect(res.status).toBe(409);
  });
});

async function authHeaderUser() {
  const { user: advisorUser } = await createUser({ role: "serviceAdvisor" });
  const { user: customer } = await createUser({ role: "onlineCustomer" });
  return { user: advisorUser, customer };
}
