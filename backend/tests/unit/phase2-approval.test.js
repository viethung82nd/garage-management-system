import { describe, it, expect } from "vitest";
import * as quotationService from "../../src/services/quotation.service.js";
import * as additionalServiceService from "../../src/services/additional-service.service.js";
import * as repairOrderService from "../../src/services/repair-order.service.js";
import {
  VehicleModel,
  ServiceModel,
  RepairOrderModel,
  DeferredWorkModel,
  QuoteVersionModel,
} from "../../src/models/index.js";
import { createUser } from "../factories.js";

async function scenario() {
  const { user: customer } = await createUser({ role: "onlineCustomer" });
  const { user: advisor } = await createUser({ role: "serviceAdvisor" });
  const vehicle = await VehicleModel.create({
    licensePlate: `PL-${Date.now()}-${Math.random()}`,
    customerId: customer._id,
  });
  const svc = await ServiceModel.create({ name: "Oil Change", basePrice: 100000, isActive: true });
  const order = await repairOrderService.createRepairOrder({
    vehicleId: vehicle._id.toString(),
    services: [{ serviceId: svc._id.toString(), quantity: 1 }],
  });
  return { customer, advisor, vehicle, svc, order };
}

async function quoteWithTwoLines(order, advisor) {
  return quotationService.createQuotation(
    {
      repairOrderId: order._id.toString(),
      lines: [
        { description: "Front brake pads", kind: "part", quantity: 1, unitPrice: 850000 },
        { description: "Replace tyres", kind: "part", quantity: 4, unitPrice: 1500000 },
      ],
    },
    advisor._id.toString(),
  );
}

describe("Phase 2 — partial approval of a quotation", () => {
  it("approves one line, declines the other, and marks the quote partiallyApproved", async () => {
    const { advisor, order } = await scenario();
    const quote = await quoteWithTwoLines(order, advisor);

    const result = await quotationService.confirmQuotation(
      quote._id.toString(),
      {
        lineDecisions: [
          { index: 0, approved: true },
          { index: 1, approved: false, declineReason: "Too expensive right now" },
        ],
        channel: "phone",
        decidedByName: "Nguyen Van A",
        contactValue: "0901234567",
      },
      advisor._id.toString(),
      "serviceAdvisor",
    );

    expect(result.status).toBe("partiallyApproved");
    expect(result.lines[0].decision).toBe("approved");
    expect(result.lines[1].decision).toBe("declined");
    expect(result.lines[1].declineReason).toBe("Too expensive right now");
  });

  it("pushes ONLY the approved line onto the repair order", async () => {
    const { advisor, order } = await scenario();
    const quote = await quoteWithTwoLines(order, advisor);

    await quotationService.confirmQuotation(
      quote._id.toString(),
      {
        lineDecisions: [
          { index: 0, approved: true },
          { index: 1, approved: false },
        ],
        channel: "inPerson",
      },
      advisor._id.toString(),
      "serviceAdvisor",
    );

    const refreshed = await RepairOrderModel.findById(order._id);
    expect(refreshed.services).toHaveLength(1);
    expect(refreshed.services[0].name).toBe("Front brake pads");
    expect(refreshed.totalCost).toBe(850000);
  });

  it("turns every declined line into DeferredWork against the vehicle", async () => {
    const { advisor, order, vehicle } = await scenario();
    const quote = await quoteWithTwoLines(order, advisor);

    await quotationService.confirmQuotation(
      quote._id.toString(),
      {
        lineDecisions: [
          { index: 0, approved: true },
          { index: 1, approved: false, declineReason: "Next service" },
        ],
        channel: "inPerson",
      },
      advisor._id.toString(),
      "serviceAdvisor",
    );

    const deferred = await DeferredWorkModel.find({ vehicleId: vehicle._id });
    expect(deferred).toHaveLength(1);
    expect(deferred[0].description).toBe("Replace tyres");
    expect(deferred[0].estimatedPrice).toBe(6000000);
    expect(deferred[0].declineReason).toBe("Next service");
    expect(deferred[0].status).toBe("open");
    expect(deferred[0].remindAt).toBeInstanceOf(Date);
  });

  it("treats a line nobody ruled on as declined rather than silently billing it", async () => {
    const { advisor, order } = await scenario();
    const quote = await quoteWithTwoLines(order, advisor);

    const result = await quotationService.confirmQuotation(
      quote._id.toString(),
      { lineDecisions: [{ index: 0, approved: true }], channel: "inPerson" },
      advisor._id.toString(),
      "serviceAdvisor",
    );

    expect(result.lines[1].decision).toBe("declined");
    const refreshed = await RepairOrderModel.findById(order._id);
    expect(refreshed.services).toHaveLength(1);
  });
});

describe("Phase 2 — the approval trail", () => {
  it("records who decided, when, through which channel and on what contact", async () => {
    const { advisor, order } = await scenario();
    const quote = await quoteWithTwoLines(order, advisor);

    const result = await quotationService.confirmQuotation(
      quote._id.toString(),
      {
        approved: true,
        channel: "zalo",
        decidedByName: "Tran Thi B",
        contactValue: "0912345678",
      },
      advisor._id.toString(),
      "serviceAdvisor",
    );

    expect(result.approval.channel).toBe("zalo");
    expect(result.approval.decidedByName).toBe("Tran Thi B");
    expect(result.approval.contactValue).toBe("0912345678");
    // Staff relayed it, so recordedBy is set and decidedBy is not — that
    // distinction is the whole point.
    expect(result.approval.recordedBy.toString()).toBe(advisor._id.toString());
    expect(result.approval.decidedBy).toBeUndefined();
    expect(result.approval.approvedTotal).toBe(quote.totalEstimate);
  });

  it("marks a customer's own decision as self-service, not staff-relayed", async () => {
    const { customer, advisor, order } = await scenario();
    const quote = await quoteWithTwoLines(order, advisor);
    await quotationService.sendQuotation(quote._id.toString());

    const result = await quotationService.customerDecideQuotation(
      quote._id.toString(),
      { approved: true },
      customer._id.toString(),
    );

    expect(result.approval.channel).toBe("app");
    expect(result.approval.decidedBy.toString()).toBe(customer._id.toString());
    expect(result.approval.recordedBy).toBeUndefined();
  });

  it("will not let a customer decide on someone else's quotation", async () => {
    const { advisor, order } = await scenario();
    const { user: stranger } = await createUser({ role: "onlineCustomer" });
    const quote = await quoteWithTwoLines(order, advisor);
    await quotationService.sendQuotation(quote._id.toString());

    await expect(
      quotationService.customerDecideQuotation(
        quote._id.toString(),
        { approved: true },
        stranger._id.toString(),
      ),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("refuses a decision on an expired quotation", async () => {
    const { advisor, order } = await scenario();
    const quote = await quoteWithTwoLines(order, advisor);
    quote.validUntil = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await quote.save();

    await expect(
      quotationService.confirmQuotation(
        quote._id.toString(),
        { approved: true, channel: "inPerson" },
        advisor._id.toString(),
        "serviceAdvisor",
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("Phase 2 — quote versioning", () => {
  it("archives the previous state before an edit, so approved figures survive", async () => {
    const { advisor, order } = await scenario();
    const quote = await quoteWithTwoLines(order, advisor);
    const originalTotal = quote.totalEstimate;

    await quotationService.updateQuotation(
      quote._id.toString(),
      { lines: [{ description: "Front brake pads", kind: "part", quantity: 1, unitPrice: 950000 }] },
      advisor._id.toString(),
    );

    const versions = await QuoteVersionModel.find({ quoteId: quote._id }).sort({ version: 1 });
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(1);
    expect(versions[0].totalEstimate).toBe(originalTotal);
    expect(versions[0].lines).toHaveLength(2);

    const refreshed = await quotationService.getQuotationById(quote._id.toString());
    expect(refreshed.version).toBe(2);
  });
});

describe("Phase 2 — change order authorised by the customer", () => {
  it("lets the customer approve extra work themselves and bills it to the order", async () => {
    const { customer, advisor, order } = await scenario();
    const { user: tech } = await createUser({ role: "technician" });

    const proposal = await additionalServiceService.createAdditionalServiceProposal(
      { repairOrderId: order._id.toString(), serviceName: "Replace belt" },
      tech._id.toString(),
    );
    await additionalServiceService.updateAdditionalServiceProposal(
      proposal._id.toString(), "sent", advisor._id.toString(), { laborCost: 200000 },
    );

    const decided = await additionalServiceService.customerDecideProposal(
      proposal._id.toString(),
      { approved: true },
      customer._id.toString(),
    );

    expect(decided.status).toBe("approvedByCustomer");
    expect(decided.approval.decidedBy.toString()).toBe(customer._id.toString());
    expect(decided.approval.channel).toBe("app");

    const refreshed = await RepairOrderModel.findById(order._id);
    expect(refreshed.services.some((s) => s.name === "Replace belt")).toBe(true);
  });

  it("does not bill the order when the customer declines", async () => {
    const { customer, advisor, order } = await scenario();
    const { user: tech } = await createUser({ role: "technician" });
    const before = await RepairOrderModel.findById(order._id);
    const countBefore = before.services.length;

    const proposal = await additionalServiceService.createAdditionalServiceProposal(
      { repairOrderId: order._id.toString(), serviceName: "Replace belt" },
      tech._id.toString(),
    );
    await additionalServiceService.updateAdditionalServiceProposal(
      proposal._id.toString(), "sent", advisor._id.toString(), { laborCost: 200000 },
    );

    const decided = await additionalServiceService.customerDecideProposal(
      proposal._id.toString(),
      { approved: false },
      customer._id.toString(),
    );

    expect(decided.status).toBe("rejectedByCustomer");
    const refreshed = await RepairOrderModel.findById(order._id);
    expect(refreshed.services).toHaveLength(countBefore);
  });

  it("will not let a customer decide on another customer's change order", async () => {
    const { advisor, order } = await scenario();
    const { user: stranger } = await createUser({ role: "onlineCustomer" });
    const { user: tech } = await createUser({ role: "technician" });

    const proposal = await additionalServiceService.createAdditionalServiceProposal(
      { repairOrderId: order._id.toString(), serviceName: "Replace belt" },
      tech._id.toString(),
    );
    await additionalServiceService.updateAdditionalServiceProposal(
      proposal._id.toString(), "sent", advisor._id.toString(), { laborCost: 200000 },
    );

    await expect(
      additionalServiceService.customerDecideProposal(
        proposal._id.toString(),
        { approved: true },
        stranger._id.toString(),
      ),
    ).rejects.toMatchObject({ status: 404 });
  });
});
