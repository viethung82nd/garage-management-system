import { describe, it, expect } from "vitest";
import * as vehicleService from "../../src/services/vehicle.service.js";
import { createUser } from "../factories.js";

describe("vehicle.service", () => {
  describe("checkVehicleExists", () => {
    it("returns exists:false when no vehicle matches", async () => {
      const result = await vehicleService.checkVehicleExists("29A-99999");
      expect(result.exists).toBe(false);
      expect(result.vehicle).toBeNull();
    });

    it("rejects an empty licensePlate", async () => {
      await expect(vehicleService.checkVehicleExists("  ")).rejects.toMatchObject({ status: 400 });
    });

    it("returns exists:true after creation", async () => {
      const { user } = await createUser({ role: "onlineCustomer" });
      await vehicleService.createVehicle({ licensePlate: "29A-11111" }, { sub: user._id.toString(), role: "onlineCustomer" });
      const result = await vehicleService.checkVehicleExists("29a-11111");
      expect(result.exists).toBe(true);
    });
  });

  describe("createVehicle", () => {
    it("self-service customer owns the created vehicle", async () => {
      const { user } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleService.createVehicle(
        { licensePlate: "30B-22222" },
        { sub: user._id.toString(), role: "onlineCustomer" },
      );
      expect(vehicle.customerId.toString()).toBe(user._id.toString());
    });

    it("rejects a missing licensePlate", async () => {
      const { user } = await createUser({ role: "onlineCustomer" });
      await expect(
        vehicleService.createVehicle({}, { sub: user._id.toString(), role: "onlineCustomer" }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("rejects an out-of-range year", async () => {
      const { user } = await createUser({ role: "onlineCustomer" });
      await expect(
        vehicleService.createVehicle(
          { licensePlate: "31C-33333", year: 1800 },
          { sub: user._id.toString(), role: "onlineCustomer" },
        ),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("staff must supply a valid customerId", async () => {
      const { user: advisor } = await createUser({ role: "serviceAdvisor" });
      await expect(
        vehicleService.createVehicle(
          { licensePlate: "32D-44444" },
          { sub: advisor._id.toString(), role: "serviceAdvisor" },
        ),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("staff creates a vehicle for a valid customer", async () => {
      const { user: advisor } = await createUser({ role: "serviceAdvisor" });
      const { user: customer } = await createUser({ role: "onlineCustomer" });
      const vehicle = await vehicleService.createVehicle(
        { licensePlate: "33E-55555", customerId: customer._id.toString() },
        { sub: advisor._id.toString(), role: "serviceAdvisor" },
      );
      expect(vehicle.customerId.toString()).toBe(customer._id.toString());
    });

    it("rejects a duplicate licensePlate with 409", async () => {
      const { user } = await createUser({ role: "onlineCustomer" });
      await vehicleService.createVehicle(
        { licensePlate: "34F-66666" },
        { sub: user._id.toString(), role: "onlineCustomer" },
      );
      await expect(
        vehicleService.createVehicle(
          { licensePlate: "34F-66666" },
          { sub: user._id.toString(), role: "onlineCustomer" },
        ),
      ).rejects.toMatchObject({ status: 409 });
    });
  });
});
