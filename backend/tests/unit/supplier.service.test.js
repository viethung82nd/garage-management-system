import { describe, it, expect } from "vitest";
import * as supplierService from "../../src/services/supplier.service.js";

describe("supplier.service", () => {
  it("creates a supplier with default payment terms", async () => {
    const supplier = await supplierService.createSupplier({
      name: "Bosch Vietnam",
      code: "sup-bosch",
    });
    expect(supplier.code).toBe("SUP-BOSCH"); // uppercased by the schema
    expect(supplier.paymentTermDays).toBe(30);
    expect(supplier.isActive).toBe(true);
  });

  it("rejects a missing name", async () => {
    await expect(supplierService.createSupplier({ code: "SUP-1" })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("rejects a missing code", async () => {
    await expect(supplierService.createSupplier({ name: "No Code Co" })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("rejects a negative paymentTermDays", async () => {
    await expect(
      supplierService.createSupplier({ name: "X", code: "SUP-X", paymentTermDays: -5 }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a duplicate code", async () => {
    await supplierService.createSupplier({ name: "Denso", code: "SUP-DENSO" });
    await expect(
      supplierService.createSupplier({ name: "Denso Again", code: "sup-denso" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("lists only active suppliers by default, and all with isActive=all", async () => {
    const active = await supplierService.createSupplier({ name: "Active Co", code: "SUP-ACT" });
    const toRetire = await supplierService.createSupplier({ name: "Retire Co", code: "SUP-RET" });
    await supplierService.deleteSupplier(toRetire._id.toString());

    const activeOnly = await supplierService.listSuppliers({});
    expect(activeOnly.map((s) => s._id.toString())).toContain(active._id.toString());
    expect(activeOnly.map((s) => s._id.toString())).not.toContain(toRetire._id.toString());

    const all = await supplierService.listSuppliers({ isActive: "all" });
    expect(all.map((s) => s._id.toString())).toContain(toRetire._id.toString());
  });

  it("updates a supplier's fields", async () => {
    const supplier = await supplierService.createSupplier({ name: "NGK", code: "SUP-NGK" });
    const updated = await supplierService.updateSupplier(supplier._id.toString(), {
      leadTimeDays: 7,
      contactName: "Ms. Lan",
    });
    expect(updated.leadTimeDays).toBe(7);
    expect(updated.contactName).toBe("Ms. Lan");
  });

  it("rejects updating a nonexistent supplier", async () => {
    await expect(
      supplierService.updateSupplier("64b000000000000000000000", { name: "X" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("soft-deletes a supplier (isActive false, document survives)", async () => {
    const supplier = await supplierService.createSupplier({ name: "Yuasa", code: "SUP-YUASA" });
    const result = await supplierService.deleteSupplier(supplier._id.toString());
    expect(result.message).toMatch(/deactivat/i);

    const stillThere = await supplierService.getSupplierById(supplier._id.toString());
    expect(stillThere.isActive).toBe(false);
  });

  it("400s on a malformed id and 404s on a well-formed missing id", async () => {
    await expect(supplierService.getSupplierById("not-an-id")).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      supplierService.getSupplierById("64b000000000000000000000"),
    ).rejects.toMatchObject({ status: 404 });
  });
});
