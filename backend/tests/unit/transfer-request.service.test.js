import { describe, it, expect, beforeEach } from "vitest";
import * as transferService from "../../src/services/transfer-request.service.js";
import { VehicleModel, RepairOrderModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

async function assignedOrder(technician, advisor) {
  const { user: customer } = await createUser({ role: "onlineCustomer" });
  const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}-${Math.random()}`, customerId: customer._id });
  return RepairOrderModel.create({
    vehicleId: vehicle._id, technicianId: technician._id, advisorId: advisor?._id,
    services: [], totalCost: 0, status: "inProgress",
  });
}

describe("transfer-request.service", () => {
  let advisorId;
  beforeEach(async () => {
    const { user } = await createUser({ role: "serviceAdvisor" });
    advisorId = user._id.toString();
  });

  it("the assigned technician can request a transfer", async () => {
    const { user: techA } = await createUser({ role: "technician" });
    const order = await assignedOrder(techA);
    const result = await transferService.createTransferRequest(
      { repairOrderId: order._id.toString() },
      techA._id.toString(),
    );
    expect(result.status).toBe("pending");
  });

  it("rejects a technician who isn't assigned to the order", async () => {
    const { user: techA } = await createUser({ role: "technician" });
    const { user: notAssigned } = await createUser({ role: "technician" });
    const order = await assignedOrder(techA);
    await expect(
      transferService.createTransferRequest(
        { repairOrderId: order._id.toString() },
        notAssigned._id.toString(),
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rejects a duplicate pending request", async () => {
    const { user: techA } = await createUser({ role: "technician" });
    const order = await assignedOrder(techA);
    await transferService.createTransferRequest(
      { repairOrderId: order._id.toString() },
      techA._id.toString(),
    );
    await expect(
      transferService.createTransferRequest(
        { repairOrderId: order._id.toString() },
        techA._id.toString(),
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("approving reassigns the order's technician", async () => {
    const { user: techA } = await createUser({ role: "technician" });
    const { user: techB } = await createUser({ role: "technician" });
    const order = await assignedOrder(techA);
    const request = await transferService.createTransferRequest(
      { repairOrderId: order._id.toString() },
      techA._id.toString(),
    );
    await transferService.approveTransferRequest(request._id.toString(), "", advisorId, techB._id.toString());
    const updatedOrder = await RepairOrderModel.findById(order._id);
    expect(updatedOrder.technicianId.toString()).toBe(techB._id.toString());
  });

  it("rejecting leaves the order's technician unchanged", async () => {
    const { user: techA } = await createUser({ role: "technician" });
    const order = await assignedOrder(techA);
    const request = await transferService.createTransferRequest(
      { repairOrderId: order._id.toString() },
      techA._id.toString(),
    );
    await transferService.rejectTransferRequest(request._id.toString(), "", advisorId);
    const updatedOrder = await RepairOrderModel.findById(order._id);
    expect(updatedOrder.technicianId.toString()).toBe(techA._id.toString());
  });

  it("rejects resolving an already-resolved request", async () => {
    const { user: techA } = await createUser({ role: "technician" });
    const { user: techB } = await createUser({ role: "technician" });
    const order = await assignedOrder(techA);
    const request = await transferService.createTransferRequest(
      { repairOrderId: order._id.toString() },
      techA._id.toString(),
    );
    await transferService.approveTransferRequest(request._id.toString(), "", advisorId, techB._id.toString());
    await expect(
      transferService.rejectTransferRequest(request._id.toString(), "", advisorId),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("listTransferRequests filters by status", async () => {
    const { user: techA } = await createUser({ role: "technician" });
    const order = await assignedOrder(techA);
    await transferService.createTransferRequest(
      { repairOrderId: order._id.toString() },
      techA._id.toString(),
    );
    const result = await transferService.listTransferRequests({ status: "pending" });
    expect(result.transferRequests).toHaveLength(1);
  });
});
