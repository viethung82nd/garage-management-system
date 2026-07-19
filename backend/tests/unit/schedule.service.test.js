import { describe, it, expect } from "vitest";
import * as scheduleService from "../../src/services/schedule.service.js";
import { createUser } from "../factories.js";

describe("schedule.service", () => {
  it("auto-creates a schedule on first read", async () => {
    const { user: tech } = await createUser({ role: "technician" });
    const schedule = await scheduleService.getTechnicianSchedule(
      { technicianId: tech._id.toString() },
      { date: "2026-08-01" },
      { sub: tech._id.toString(), role: "technician" },
    );
    expect(schedule.isAvailable).toBe(true);
  });

  it("rejects a technician reading a peer's schedule", async () => {
    const { user: techA } = await createUser({ role: "technician" });
    const { user: techB } = await createUser({ role: "technician" });
    await expect(
      scheduleService.getTechnicianSchedule(
        { technicianId: techB._id.toString() },
        { date: "2026-08-01" },
        { sub: techA._id.toString(), role: "technician" },
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rejects a missing technicianId", async () => {
    await expect(
      scheduleService.getTechnicianSchedule({}, {}, { sub: "x", role: "admin" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("SA updates a technician's availability", async () => {
    const { user: tech } = await createUser({ role: "technician" });
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const schedule = await scheduleService.updateTechnicianSchedule(
      { technicianId: tech._id.toString() },
      { date: "2026-08-02" },
      { isAvailable: false },
      { sub: advisor._id.toString(), role: "serviceAdvisor" },
    );
    expect(schedule.isAvailable).toBe(false);
  });

  it("rejects a body with neither isAvailable nor activeOrderIds", async () => {
    const { user: tech } = await createUser({ role: "technician" });
    await expect(
      scheduleService.updateTechnicianSchedule(
        { technicianId: tech._id.toString() },
        {},
        {},
        { sub: tech._id.toString(), role: "technician" },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("updateScheduleAvailability toggles by scheduleId", async () => {
    const { user: tech } = await createUser({ role: "technician" });
    const schedule = await scheduleService.getTechnicianSchedule(
      { technicianId: tech._id.toString() },
      { date: "2026-08-03" },
      { sub: tech._id.toString(), role: "technician" },
    );
    const updated = await scheduleService.updateScheduleAvailability(
      schedule._id.toString(),
      false,
      { sub: tech._id.toString(), role: "technician" },
    );
    expect(updated.isAvailable).toBe(false);
  });

  it("rejects a non-boolean isAvailable", async () => {
    const { user: tech } = await createUser({ role: "technician" });
    const schedule = await scheduleService.getTechnicianSchedule(
      { technicianId: tech._id.toString() },
      { date: "2026-08-04" },
      { sub: tech._id.toString(), role: "technician" },
    );
    await expect(
      scheduleService.updateScheduleAvailability(schedule._id.toString(), "yes", {
        sub: tech._id.toString(),
        role: "technician",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
