import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { VehicleModel, RepairOrderModel } from "../../src/models/index.js";
import { createUser, authHeader } from "../factories.js";

const app = createApp();

async function completedOrderFor(customer) {
  const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}`, customerId: customer._id });
  return RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: 0, status: "completed" });
}

describe("Review API", () => {
  it("customer submits a review for their completed order", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const order = await completedOrderFor(customer);
    const res = await request(app)
      .post("/api/reviews")
      .set(authHeader(customer))
      .send({ repairOrderId: order._id.toString(), rating: 5, comment: "Great work" });
    expect(res.status).toBe(201);
    expect(res.body.review.rating).toBe(5);
  });

  it("GET /api/reviews/mine returns only the caller's reviews", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const order = await completedOrderFor(customer);
    await request(app).post("/api/reviews").set(authHeader(customer)).send({ repairOrderId: order._id.toString(), rating: 4 });
    const res = await request(app).get("/api/reviews/mine").set(authHeader(customer));
    expect(res.status).toBe(200);
    expect(res.body.reviews).toHaveLength(1);
  });

  it("rejects an out-of-range rating", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const order = await completedOrderFor(customer);
    const res = await request(app)
      .post("/api/reviews")
      .set(authHeader(customer))
      .send({ repairOrderId: order._id.toString(), rating: 10 });
    expect(res.status).toBe(400);
  });
});
