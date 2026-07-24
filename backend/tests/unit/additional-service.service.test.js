import { describe, it, expect } from "vitest";
import * as additionalServiceService from "../../src/services/additional-service.service.js";
import { VehicleModel, RepairOrderModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

async function orderFor(advisor) {
  const { user: customer } = await createUser({ role: "onlineCustomer" });
  const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}-${Math.random()}`, customerId: customer._id });
  return RepairOrderModel.create({ vehicleId: vehicle._id, advisorId: advisor?._id, services: [], totalCost: 0, status: "inProgress" });
}

describe("additional-service.service", () => {
  it("technician proposes extra work, advisor is notified", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const { user: tech } = await createUser({ role: "technician" });
    const order = await orderFor(advisor);
    const proposal = await additionalServiceService.createAdditionalServiceProposal(
      { repairOrderId: order._id.toString(), serviceName: "Brake fluid flush" },
      tech._id.toString(),
    );
    expect(proposal.status).toBe("pending");
  });

  it("rejects a missing serviceName", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const { user: tech } = await createUser({ role: "technician" });
    const order = await orderFor(advisor);
    await expect(
      additionalServiceService.createAdditionalServiceProposal(
        { repairOrderId: order._id.toString(), serviceName: "" },
        tech._id.toString(),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("approving pushes a line item onto the repair order, priced by the SA's override", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const { user: tech } = await createUser({ role: "technician" });
    const order = await orderFor(advisor);
    // The technician can only flag the work and estimate a time — pricing is
    // the SA's call, so laborCost/partsCost sent here are ignored.
    const proposal = await additionalServiceService.createAdditionalServiceProposal(
      { repairOrderId: order._id.toString(), serviceName: "Wiper blades", laborCost: 20000, partsCost: 30000 },
      tech._id.toString(),
    );
    expect(proposal.laborCost).toBeUndefined();

    await additionalServiceService.updateAdditionalServiceProposal(
      proposal._id.toString(), "approved", advisor._id.toString(),
      {
        laborCost: 20000,
        partsCost: 30000,
        // Extra work may only be billed with the customer's authorisation;
        // an advisor relaying it must evidence how it was obtained.
        approval: { channel: "phone", decidedByName: "Nguyen Van A", contactValue: "0901234567" },
      },
    );

    const updatedOrder = await RepairOrderModel.findById(order._id);
    expect(updatedOrder.services).toHaveLength(1);
    expect(updatedOrder.totalCost).toBe(50000);
  });

  it("refuses to approve extra work without the customer's authorisation", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const { user: tech } = await createUser({ role: "technician" });
    const order = await orderFor(advisor);
    const proposal = await additionalServiceService.createAdditionalServiceProposal(
      { repairOrderId: order._id.toString(), serviceName: "Wiper blades" },
      tech._id.toString(),
    );

    await expect(
      additionalServiceService.updateAdditionalServiceProposal(
        proposal._id.toString(), "approved", advisor._id.toString(), { laborCost: 20000 },
      ),
    ).rejects.toMatchObject({ status: 400 });

    // And nothing was billed to the order as a side effect.
    const untouched = await RepairOrderModel.findById(order._id);
    expect(untouched.services).toHaveLength(0);
  });

  it("records who authorised the extra work, when and through which channel", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const { user: tech } = await createUser({ role: "technician" });
    const order = await orderFor(advisor);
    const proposal = await additionalServiceService.createAdditionalServiceProposal(
      { repairOrderId: order._id.toString(), serviceName: "Brake fluid" },
      tech._id.toString(),
    );

    const approved = await additionalServiceService.updateAdditionalServiceProposal(
      proposal._id.toString(), "approved", advisor._id.toString(),
      {
        laborCost: 15000,
        approval: { channel: "zalo", decidedByName: "Tran Thi B", contactValue: "0912345678" },
      },
    );

    expect(approved.approval.channel).toBe("zalo");
    expect(approved.approval.decidedByName).toBe("Tran Thi B");
    expect(approved.approval.contactValue).toBe("0912345678");
    expect(approved.approval.recordedBy.toString()).toBe(advisor._id.toString());
    expect(approved.approval.decidedAt).toBeInstanceOf(Date);
    // A change order must state the new overall figure, not just the delta.
    expect(approved.revisedOrderTotal).toBe(15000);
  });

  it("rejects a second decision on an already-resolved proposal", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const { user: tech } = await createUser({ role: "technician" });
    const order = await orderFor(advisor);
    const proposal = await additionalServiceService.createAdditionalServiceProposal(
      { repairOrderId: order._id.toString(), serviceName: "X" },
      tech._id.toString(),
    );
    await additionalServiceService.updateAdditionalServiceProposal(
      proposal._id.toString(), "approved", advisor._id.toString(),
      { approval: { channel: "inPerson", decidedByName: "Walk-in customer" } },
    );
    await expect(
      additionalServiceService.updateAdditionalServiceProposal(proposal._id.toString(), "rejected", advisor._id.toString()),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("listAdditionalServiceProposals scopes to a repairOrderId", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const { user: tech } = await createUser({ role: "technician" });
    const order1 = await orderFor(advisor);
    const order2 = await orderFor(advisor);
    await additionalServiceService.createAdditionalServiceProposal({ repairOrderId: order1._id.toString(), serviceName: "A" }, tech._id.toString());
    await additionalServiceService.createAdditionalServiceProposal({ repairOrderId: order2._id.toString(), serviceName: "B" }, tech._id.toString());

    const result = await additionalServiceService.listAdditionalServiceProposals({ repairOrderId: order1._id.toString() });
    expect(result.proposals).toHaveLength(1);
  });
});
