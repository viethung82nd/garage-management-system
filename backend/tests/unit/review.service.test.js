import { describe, it, expect } from "vitest";
import * as reviewService from "../../src/services/review.service.js";
import { VehicleModel, RepairOrderModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

async function completedOrderFor(customer, technician) {
  const vehicle = await VehicleModel.create({
    licensePlate: `PL-${Date.now()}`,
    customerId: customer._id,
  });
  return RepairOrderModel.create({
    vehicleId: vehicle._id,
    technicianId: technician?._id,
    services: [],
    totalCost: 0,
    status: "completed",
  });
}

describe("review.service", () => {
  it("customer reviews their own completed order", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const { user: tech } = await createUser({ role: "technician" });
    const order = await completedOrderFor(customer, tech);
    const review = await reviewService.createReview(
      { repairOrderId: order._id.toString(), rating: 5, comment: "Great" },
      customer._id.toString(),
    );
    expect(review.rating).toBe(5);
  });

  it("rejects a rating outside 1-5", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const order = await completedOrderFor(customer);
    await expect(
      reviewService.createReview(
        { repairOrderId: order._id.toString(), rating: 6 },
        customer._id.toString(),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects reviewing a non-completed order", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}`, customerId: customer._id });
    const order = await RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: 0, status: "pending" });
    await expect(
      reviewService.createReview({ repairOrderId: order._id.toString(), rating: 5 }, customer._id.toString()),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rejects reviewing someone else's order", async () => {
    const { user: owner } = await createUser({ role: "onlineCustomer" });
    const { user: other } = await createUser({ role: "onlineCustomer" });
    const order = await completedOrderFor(owner);
    await expect(
      reviewService.createReview({ repairOrderId: order._id.toString(), rating: 5 }, other._id.toString()),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rejects a duplicate review with 409", async () => {
    const { user: customer } = await createUser({ role: "onlineCustomer" });
    const order = await completedOrderFor(customer);
    await reviewService.createReview({ repairOrderId: order._id.toString(), rating: 4 }, customer._id.toString());
    await expect(
      reviewService.createReview({ repairOrderId: order._id.toString(), rating: 3 }, customer._id.toString()),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("listReviews computes an average rating for a technician", async () => {
    const { user: customer1 } = await createUser({ role: "onlineCustomer" });
    const { user: customer2 } = await createUser({ role: "onlineCustomer" });
    const { user: tech } = await createUser({ role: "technician" });
    const order1 = await completedOrderFor(customer1, tech);
    const order2 = await completedOrderFor(customer2, tech);
    await reviewService.createReview({ repairOrderId: order1._id.toString(), rating: 4 }, customer1._id.toString());
    await reviewService.createReview({ repairOrderId: order2._id.toString(), rating: 2 }, customer2._id.toString());

    const result = await reviewService.listReviews({ technicianId: tech._id.toString() });
    expect(result.summary.count).toBe(2);
    expect(result.summary.avgRating).toBe(3);
  });

  it("myReviews returns only the caller's reviews", async () => {
    const { user: customer1 } = await createUser({ role: "onlineCustomer" });
    const { user: customer2 } = await createUser({ role: "onlineCustomer" });
    const order1 = await completedOrderFor(customer1);
    const order2 = await completedOrderFor(customer2);
    await reviewService.createReview({ repairOrderId: order1._id.toString(), rating: 5 }, customer1._id.toString());
    await reviewService.createReview({ repairOrderId: order2._id.toString(), rating: 3 }, customer2._id.toString());

    const mine = await reviewService.myReviews(customer1._id.toString());
    expect(mine).toHaveLength(1);
    expect(mine[0].rating).toBe(5);
  });
});
