import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { NotificationModel } from "../../src/models/index.js";
import { createUser, authHeader } from "../factories.js";

const app = createApp();

describe("Notification API", () => {
  it("GET /api/notifications returns only the caller's notifications", async () => {
    const { user: a } = await createUser({});
    const { user: b } = await createUser({});
    await NotificationModel.create({ userId: a._id, type: "test", title: "For A" });
    await NotificationModel.create({ userId: b._id, type: "test", title: "For B" });

    const res = await request(app).get("/api/notifications").set(authHeader(a));
    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(1);
    expect(res.body.notifications[0].title).toBe("For A");
  });

  it("PATCH /api/notifications/:id/read is scoped by owner (404 for another user)", async () => {
    const { user: a } = await createUser({});
    const { user: b } = await createUser({});
    const note = await NotificationModel.create({ userId: a._id, type: "test", title: "X" });
    const res = await request(app).patch(`/api/notifications/${note._id}/read`).set(authHeader(b));
    expect(res.status).toBe(404);
  });

  it("PATCH /api/notifications/read-all clears unread count", async () => {
    const { user } = await createUser({});
    await NotificationModel.create({ userId: user._id, type: "test", title: "X" });
    const mark = await request(app).patch("/api/notifications/read-all").set(authHeader(user));
    expect(mark.status).toBe(200);
    const count = await request(app).get("/api/notifications/unread-count").set(authHeader(user));
    expect(count.body.count).toBe(0);
  });
});
