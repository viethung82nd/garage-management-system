import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createUser, tokenFor } from "../factories.js";

const app = createApp();

// Covers the DB-backed check added to requireAuth: a still-valid, unexpired
// JWT must NOT be enough to use a protected route once the account behind it
// has been deactivated. Access tokens live for days, so without this check a
// deactivated (or otherwise revoked) account would keep working until its
// token naturally expired.
describe("requireAuth rejects deactivated accounts", () => {
  it("GET /api/auth/me returns 401 for a deactivated user even with a valid token", async () => {
    const { user } = await createUser({ isActive: true });
    // Sign the token first (while active) to prove it's the live DB state —
    // not anything baked into the JWT — that decides access.
    const token = tokenFor(user);

    user.isActive = false;
    await user.save();

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me still succeeds for an active user with a valid token", async () => {
    const { user } = await createUser({ isActive: true });
    const token = tokenFor(user);

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("returns 401 when the user behind the token no longer exists", async () => {
    const { user } = await createUser({ isActive: true });
    const token = tokenFor(user);
    await user.deleteOne();

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
