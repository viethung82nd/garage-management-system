import { describe, it, expect } from "vitest";
import * as serviceService from "../../src/services/service.service.js";

describe("service.service (catalog)", () => {
  describe("service categories", () => {
    it("creates and lists a category", async () => {
      const cat = await serviceService.createServiceCategory({ name: "Bodywork" });
      expect(cat.isActive).toBe(true);
      const all = await serviceService.getAllServiceCategories();
      expect(all).toHaveLength(1);
    });

    it("rejects an empty name", async () => {
      await expect(serviceService.createServiceCategory({ name: "  " })).rejects.toMatchObject({
        status: 400,
      });
    });

    it("rejects a case-insensitive duplicate name", async () => {
      await serviceService.createServiceCategory({ name: "Bodywork" });
      await expect(serviceService.createServiceCategory({ name: "bodywork" })).rejects.toMatchObject({
        status: 409,
      });
    });

    it("getServiceCategoryById 404s for a well-formed missing id", async () => {
      await expect(
        serviceService.getServiceCategoryById("64b000000000000000000000"),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("getServiceCategoryById 400s for a malformed id", async () => {
      await expect(serviceService.getServiceCategoryById("not-an-id")).rejects.toMatchObject({
        status: 400,
      });
    });

    it("updates a category's isActive flag", async () => {
      const cat = await serviceService.createServiceCategory({ name: "Cat A" });
      const updated = await serviceService.updateServiceCategory(cat._id.toString(), { isActive: false });
      expect(updated.isActive).toBe(false);
    });

    it("deletes a category", async () => {
      const cat = await serviceService.createServiceCategory({ name: "Cat B" });
      const result = await serviceService.deleteServiceCategory(cat._id.toString());
      expect(result.message).toMatch(/deleted/i);
      await expect(
        serviceService.getServiceCategoryById(cat._id.toString()),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("services", () => {
    it("creates a service with a valid basePrice", async () => {
      const svc = await serviceService.createService({ name: "Oil Change", basePrice: 100000 });
      expect(svc.isActive).toBe(true);
      expect(svc.basePrice).toBe(100000);
    });

    it("rejects a missing basePrice", async () => {
      await expect(serviceService.createService({ name: "X" })).rejects.toMatchObject({ status: 400 });
    });

    it("rejects a negative basePrice", async () => {
      await expect(
        serviceService.createService({ name: "X", basePrice: -1 }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("rejects a category name that doesn't exist", async () => {
      await expect(
        serviceService.createService({ name: "X", basePrice: 1000, category: "Nonexistent" }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("filters by category and isActive", async () => {
      await serviceService.createServiceCategory({ name: "Detailing" });
      await serviceService.createService({ name: "Wax", basePrice: 50000, category: "Detailing" });
      await serviceService.createService({ name: "Vacuum", basePrice: 30000, isActive: false });
      const results = await serviceService.getAllServices({ category: "Detailing", isActive: "true" });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Wax");
    });

    it("updates and deletes a service", async () => {
      const svc = await serviceService.createService({ name: "Tire Rotation", basePrice: 20000 });
      const updated = await serviceService.updateService(svc._id.toString(), { basePrice: 25000 });
      expect(updated.basePrice).toBe(25000);
      const deleted = await serviceService.deleteService(svc._id.toString());
      expect(deleted.message).toMatch(/deleted/i);
    });

    it("rejects updating basePrice to a negative number", async () => {
      const svc = await serviceService.createService({ name: "Brake Check", basePrice: 10000 });
      await expect(
        serviceService.updateService(svc._id.toString(), { basePrice: -5 }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
