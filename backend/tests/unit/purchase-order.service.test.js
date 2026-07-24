import { describe, it, expect } from "vitest";
import * as purchaseOrderService from "../../src/services/purchase-order.service.js";
import * as supplierService from "../../src/services/supplier.service.js";
import { PartModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

async function makeSupplier(overrides = {}) {
  return supplierService.createSupplier({
    name: "Test Supplier",
    code: `SUP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...overrides,
  });
}

async function makePart(overrides = {}) {
  return PartModel.create({
    name: "Brake Pad Set",
    sku: `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    unitPrice: 300000,
    stockQuantity: 0,
    costPrice: 0,
    ...overrides,
  });
}

async function makePartsStaff() {
  const { user } = await createUser({ role: "partsStaff" });
  return user._id.toString();
}

describe("purchase-order.service", () => {
  describe("createPurchaseOrder", () => {
    it("assigns a PO-YYYYMM-##### code and computes subtotal/amountDue on a draft", async () => {
      const supplier = await makeSupplier();
      const part = await makePart();
      const actorId = await makePartsStaff();

      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: supplier._id.toString(),
          lines: [{ partId: part._id.toString(), quantity: 10, unitCost: 100000 }],
        },
        actorId,
      );

      expect(po.code).toMatch(/^PO-\d{6}-\d{5}$/);
      expect(po.status).toBe("draft");
      expect(po.subtotal).toBe(1000000);
      expect(po.amountDue).toBe(1000000);
      expect(po.amountPaid).toBe(0);
      expect(po.paymentStatus).toBe("unpaid");
      expect(po.dueAt).toBeInstanceOf(Date);
      expect(po.lines[0].receivedQuantity).toBe(0);
    });

    it("defaults dueAt off the supplier's paymentTermDays", async () => {
      const supplier = await makeSupplier({ paymentTermDays: 15 });
      const part = await makePart();
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: supplier._id.toString(),
          lines: [{ partId: part._id.toString(), quantity: 1, unitCost: 1000 }],
        },
        await makePartsStaff(),
      );
      const daysAhead = Math.round((po.dueAt.getTime() - Date.now()) / 86400000);
      expect(daysAhead).toBeGreaterThanOrEqual(14);
      expect(daysAhead).toBeLessThanOrEqual(16);
    });

    it("rejects an unknown supplier", async () => {
      const part = await makePart();
      await expect(
        purchaseOrderService.createPurchaseOrder(
          {
            supplierId: "64b000000000000000000000",
            lines: [{ partId: part._id.toString(), quantity: 1, unitCost: 100 }],
          },
          await makePartsStaff(),
        ),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("rejects an inactive supplier", async () => {
      const supplier = await makeSupplier();
      await supplierService.deleteSupplier(supplier._id.toString());
      const part = await makePart();
      await expect(
        purchaseOrderService.createPurchaseOrder(
          {
            supplierId: supplier._id.toString(),
            lines: [{ partId: part._id.toString(), quantity: 1, unitCost: 100 }],
          },
          await makePartsStaff(),
        ),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("rejects an empty lines array", async () => {
      const supplier = await makeSupplier();
      await expect(
        purchaseOrderService.createPurchaseOrder(
          { supplierId: supplier._id.toString(), lines: [] },
          await makePartsStaff(),
        ),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("rejects a line referencing an unknown part", async () => {
      const supplier = await makeSupplier();
      await expect(
        purchaseOrderService.createPurchaseOrder(
          {
            supplierId: supplier._id.toString(),
            lines: [{ partId: "64b000000000000000000000", quantity: 1, unitCost: 100 }],
          },
          await makePartsStaff(),
        ),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("rejects a non-positive line quantity", async () => {
      const supplier = await makeSupplier();
      const part = await makePart();
      await expect(
        purchaseOrderService.createPurchaseOrder(
          {
            supplierId: supplier._id.toString(),
            lines: [{ partId: part._id.toString(), quantity: 0, unitCost: 100 }],
          },
          await makePartsStaff(),
        ),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("stores an optional per-line repairOrderId for a special order", async () => {
      const supplier = await makeSupplier();
      const part = await makePart();
      const fakeRepairOrderId = "64b000000000000000000001";
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: supplier._id.toString(),
          lines: [
            {
              partId: part._id.toString(),
              quantity: 1,
              unitCost: 100000,
              repairOrderId: fakeRepairOrderId,
            },
          ],
          backorderForRepairOrderId: fakeRepairOrderId,
        },
        await makePartsStaff(),
      );
      expect(po.lines[0].repairOrderId.toString()).toBe(fakeRepairOrderId);
      expect(po.backorderForRepairOrderId.toString()).toBe(fakeRepairOrderId);
    });
  });

  describe("updatePurchaseOrder / sendPurchaseOrder", () => {
    it("edits a draft's lines and recomputes the subtotal", async () => {
      const supplier = await makeSupplier();
      const part = await makePart();
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: supplier._id.toString(),
          lines: [{ partId: part._id.toString(), quantity: 5, unitCost: 100000 }],
        },
        await makePartsStaff(),
      );

      const updated = await purchaseOrderService.updatePurchaseOrder(po._id.toString(), {
        lines: [{ partId: part._id.toString(), quantity: 8, unitCost: 100000 }],
        notes: "rush order",
      });
      expect(updated.subtotal).toBe(800000);
      expect(updated.amountDue).toBe(800000);
      expect(updated.notes).toBe("rush order");
    });

    it("sends a draft, then rejects editing it", async () => {
      const supplier = await makeSupplier();
      const part = await makePart();
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: supplier._id.toString(),
          lines: [{ partId: part._id.toString(), quantity: 5, unitCost: 100000 }],
        },
        await makePartsStaff(),
      );

      const sent = await purchaseOrderService.sendPurchaseOrder(po._id.toString());
      expect(sent.status).toBe("sent");

      await expect(
        purchaseOrderService.updatePurchaseOrder(po._id.toString(), { notes: "too late" }),
      ).rejects.toMatchObject({ status: 409 });

      await expect(
        purchaseOrderService.sendPurchaseOrder(po._id.toString()),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe("receiveGoods", () => {
    it("receives across two partial deliveries, accumulating stock/receivedQuantity and finishing 'received'", async () => {
      const supplier = await makeSupplier();
      const part = await makePart({ stockQuantity: 0, costPrice: 0 });
      const actorId = await makePartsStaff();

      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: supplier._id.toString(),
          lines: [{ partId: part._id.toString(), quantity: 15, unitCost: 100000 }],
        },
        actorId,
      );
      await purchaseOrderService.sendPurchaseOrder(po._id.toString());

      const afterFirst = await purchaseOrderService.receiveGoods(
        po._id.toString(),
        { lines: [{ lineIndex: 0, quantity: 10 }], note: "first truck" },
        actorId,
      );
      expect(afterFirst.status).toBe("partiallyReceived");
      expect(afterFirst.lines[0].receivedQuantity).toBe(10);

      const partAfterFirst = await PartModel.findById(part._id);
      expect(partAfterFirst.stockQuantity).toBe(10);
      expect(partAfterFirst.costPrice).toBe(100000);

      const afterSecond = await purchaseOrderService.receiveGoods(
        po._id.toString(),
        { lines: [{ lineIndex: 0, quantity: 5 }], note: "second truck" },
        actorId,
      );
      expect(afterSecond.status).toBe("received");
      expect(afterSecond.lines[0].receivedQuantity).toBe(15);

      const partAfterSecond = await PartModel.findById(part._id);
      expect(partAfterSecond.stockQuantity).toBe(15);
      // Same unitCost both deliveries, so the moving average stays flat.
      expect(partAfterSecond.costPrice).toBe(100000);
    });

    it("rolls the moving-average cost forward across purchase orders at different prices", async () => {
      const supplier = await makeSupplier();
      const part = await makePart({ stockQuantity: 0, costPrice: 0 });
      const actorId = await makePartsStaff();

      const po1 = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: supplier._id.toString(),
          lines: [{ partId: part._id.toString(), quantity: 10, unitCost: 100000 }],
        },
        actorId,
      );
      await purchaseOrderService.sendPurchaseOrder(po1._id.toString());
      await purchaseOrderService.receiveGoods(
        po1._id.toString(),
        { lines: [{ lineIndex: 0, quantity: 10 }] },
        actorId,
      );

      let part1 = await PartModel.findById(part._id);
      expect(part1.stockQuantity).toBe(10);
      expect(part1.costPrice).toBe(100000);

      const po2 = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: supplier._id.toString(),
          lines: [{ partId: part._id.toString(), quantity: 5, unitCost: 250000 }],
        },
        actorId,
      );
      await purchaseOrderService.sendPurchaseOrder(po2._id.toString());
      await purchaseOrderService.receiveGoods(
        po2._id.toString(),
        { lines: [{ lineIndex: 0, quantity: 5 }] },
        actorId,
      );

      const part2 = await PartModel.findById(part._id);
      expect(part2.stockQuantity).toBe(15);
      // (10 * 100000 + 5 * 250000) / 15 = 150000
      expect(part2.costPrice).toBe(150000);
    });

    it("rejects over-receiving beyond a line's ordered quantity", async () => {
      const supplier = await makeSupplier();
      const part = await makePart();
      const actorId = await makePartsStaff();
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: supplier._id.toString(),
          lines: [{ partId: part._id.toString(), quantity: 10, unitCost: 100000 }],
        },
        actorId,
      );
      await purchaseOrderService.sendPurchaseOrder(po._id.toString());

      await expect(
        purchaseOrderService.receiveGoods(
          po._id.toString(),
          { lines: [{ lineIndex: 0, quantity: 11 }] },
          actorId,
        ),
      ).rejects.toMatchObject({ status: 400 });

      // Partially receive, then try to over-receive the remainder.
      await purchaseOrderService.receiveGoods(
        po._id.toString(),
        { lines: [{ lineIndex: 0, quantity: 8 }] },
        actorId,
      );
      await expect(
        purchaseOrderService.receiveGoods(
          po._id.toString(),
          { lines: [{ lineIndex: 0, quantity: 3 }] },
          actorId,
        ),
      ).rejects.toMatchObject({ status: 400 });

      // The rejected over-receipt must not have partially applied.
      const po2 = await purchaseOrderService.getPurchaseOrderById(po._id.toString());
      expect(po2.lines[0].receivedQuantity).toBe(8);
      expect(po2.status).toBe("partiallyReceived");
    });

    it("rejects receiving against a draft (not yet sent) purchase order", async () => {
      const supplier = await makeSupplier();
      const part = await makePart();
      const actorId = await makePartsStaff();
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: supplier._id.toString(),
          lines: [{ partId: part._id.toString(), quantity: 10, unitCost: 100000 }],
        },
        actorId,
      );

      await expect(
        purchaseOrderService.receiveGoods(
          po._id.toString(),
          { lines: [{ lineIndex: 0, quantity: 1 }] },
          actorId,
        ),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe("cancelPurchaseOrder", () => {
    it("cancels a draft/sent purchase order with nothing received", async () => {
      const supplier = await makeSupplier();
      const part = await makePart();
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: supplier._id.toString(),
          lines: [{ partId: part._id.toString(), quantity: 5, unitCost: 100000 }],
        },
        await makePartsStaff(),
      );
      const cancelled = await purchaseOrderService.cancelPurchaseOrder(po._id.toString());
      expect(cancelled.status).toBe("cancelled");
    });

    it("rejects cancelling once anything has been received", async () => {
      const supplier = await makeSupplier();
      const part = await makePart();
      const actorId = await makePartsStaff();
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: supplier._id.toString(),
          lines: [{ partId: part._id.toString(), quantity: 5, unitCost: 100000 }],
        },
        actorId,
      );
      await purchaseOrderService.sendPurchaseOrder(po._id.toString());
      await purchaseOrderService.receiveGoods(
        po._id.toString(),
        { lines: [{ lineIndex: 0, quantity: 1 }] },
        actorId,
      );

      await expect(
        purchaseOrderService.cancelPurchaseOrder(po._id.toString()),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe("recordSupplierPayment", () => {
    it("records a partial payment then pays off the remainder", async () => {
      const supplier = await makeSupplier();
      const part = await makePart();
      const actorId = await makePartsStaff();
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: supplier._id.toString(),
          lines: [{ partId: part._id.toString(), quantity: 10, unitCost: 100000 }],
        },
        actorId,
      );

      const afterFirst = await purchaseOrderService.recordSupplierPayment(
        po._id.toString(),
        { amount: 400000, reference: "TXN-1" },
        actorId,
      );
      expect(afterFirst.amountPaid).toBe(400000);
      expect(afterFirst.paymentStatus).toBe("partiallyPaid");

      const afterSecond = await purchaseOrderService.recordSupplierPayment(
        po._id.toString(),
        { amount: 600000 },
        actorId,
      );
      expect(afterSecond.amountPaid).toBe(1000000);
      expect(afterSecond.paymentStatus).toBe("paid");
    });

    it("rejects an amount above the outstanding balance", async () => {
      const supplier = await makeSupplier();
      const part = await makePart();
      const actorId = await makePartsStaff();
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: supplier._id.toString(),
          lines: [{ partId: part._id.toString(), quantity: 10, unitCost: 100000 }],
        },
        actorId,
      );

      await expect(
        purchaseOrderService.recordSupplierPayment(
          po._id.toString(),
          { amount: 1000001 },
          actorId,
        ),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("rejects a non-positive amount", async () => {
      const supplier = await makeSupplier();
      const part = await makePart();
      const actorId = await makePartsStaff();
      const po = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: supplier._id.toString(),
          lines: [{ partId: part._id.toString(), quantity: 10, unitCost: 100000 }],
        },
        actorId,
      );

      await expect(
        purchaseOrderService.recordSupplierPayment(po._id.toString(), { amount: 0 }, actorId),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("getPayablesReport", () => {
    it("buckets outstanding balances by days past dueAt", async () => {
      const supplier = await makeSupplier();
      const part = await makePart();
      const actorId = await makePartsStaff();
      const DAY = 86400000;

      async function poWithDueDaysAgo(daysAgo, amount) {
        const p = await purchaseOrderService.createPurchaseOrder(
          {
            supplierId: supplier._id.toString(),
            lines: [{ partId: part._id.toString(), quantity: 1, unitCost: amount }],
            dueAt: new Date(Date.now() - daysAgo * DAY).toISOString(),
          },
          actorId,
        );
        return p;
      }

      await poWithDueDaysAgo(10, 100000); // 0-30
      await poWithDueDaysAgo(45, 200000); // 31-60
      await poWithDueDaysAgo(75, 300000); // 61-90
      await poWithDueDaysAgo(120, 400000); // 90+
      await poWithDueDaysAgo(-10, 500000); // not yet due -> current

      const report = await purchaseOrderService.getPayablesReport();
      expect(report.suppliers).toHaveLength(1);
      const entry = report.suppliers[0];
      expect(entry.buckets["0-30"]).toBe(100000);
      expect(entry.buckets["31-60"]).toBe(200000);
      expect(entry.buckets["61-90"]).toBe(300000);
      expect(entry.buckets["90+"]).toBe(400000);
      expect(entry.buckets.current).toBe(500000);
      expect(entry.outstanding).toBe(1500000);
      expect(report.totalOutstanding).toBe(1500000);
    });

    it("excludes cancelled and fully-paid orders", async () => {
      const supplier = await makeSupplier();
      const part = await makePart();
      const actorId = await makePartsStaff();

      const cancelled = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: supplier._id.toString(),
          lines: [{ partId: part._id.toString(), quantity: 1, unitCost: 100000 }],
        },
        actorId,
      );
      await purchaseOrderService.cancelPurchaseOrder(cancelled._id.toString());

      const paid = await purchaseOrderService.createPurchaseOrder(
        {
          supplierId: supplier._id.toString(),
          lines: [{ partId: part._id.toString(), quantity: 1, unitCost: 50000 }],
        },
        actorId,
      );
      await purchaseOrderService.recordSupplierPayment(
        paid._id.toString(),
        { amount: 50000 },
        actorId,
      );

      const report = await purchaseOrderService.getPayablesReport();
      expect(report.suppliers).toHaveLength(0);
      expect(report.totalOutstanding).toBe(0);
    });
  });

  describe("getReorderSuggestions", () => {
    it("suggests parts at/below their reorder point with a quantity up to maxStock", async () => {
      const supplier = await makeSupplier();
      const low = await makePart({
        stockQuantity: 2,
        reservedQuantity: 0,
        reorderPoint: 5,
        maxStock: 20,
        supplierId: supplier._id,
      });
      await makePart({
        stockQuantity: 50,
        reservedQuantity: 0,
        reorderPoint: 5,
        maxStock: 60,
      }); // well stocked — should not be suggested
      await makePart({
        stockQuantity: 2,
        reservedQuantity: 0,
        reorderPoint: 5,
        maxStock: 20,
        isActive: false,
      }); // inactive — excluded regardless of stock

      const { suggestions } = await purchaseOrderService.getReorderSuggestions();
      const ids = suggestions.map((s) => s.partId.toString());
      expect(ids).toContain(low._id.toString());
      expect(suggestions).toHaveLength(1);

      const suggestion = suggestions.find((s) => s.partId.toString() === low._id.toString());
      expect(suggestion.suggestedQuantity).toBe(18); // maxStock(20) - available(2)
      expect(suggestion.preferredSupplier?._id?.toString()).toBe(supplier._id.toString());
    });

    it("accounts for reserved stock when computing availability", async () => {
      const part = await makePart({
        stockQuantity: 10,
        reservedQuantity: 8,
        reorderPoint: 5,
        maxStock: 20,
      });
      // available = 10 - 8 = 2, <= reorderPoint(5) -> should surface
      const { suggestions } = await purchaseOrderService.getReorderSuggestions();
      const suggestion = suggestions.find((s) => s.partId.toString() === part._id.toString());
      expect(suggestion).toBeDefined();
      expect(suggestion.available).toBe(2);
      expect(suggestion.suggestedQuantity).toBe(18);
    });

    it("suggests at least 1 even when maxStock is unset or already met", async () => {
      const part = await makePart({ stockQuantity: 0, reservedQuantity: 0, reorderPoint: 1 });
      const { suggestions } = await purchaseOrderService.getReorderSuggestions();
      const suggestion = suggestions.find((s) => s.partId.toString() === part._id.toString());
      expect(suggestion.suggestedQuantity).toBeGreaterThanOrEqual(1);
    });
  });
});
