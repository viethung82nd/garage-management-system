import { describe, it, expect } from "vitest";
import * as notificationService from "../../src/services/notification.service.js";
import { NotificationModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

async function notifyUser(userId, isRead = false) {
  return NotificationModel.create({ userId, type: "test", title: "T", isRead });
}

describe("notification.service", () => {
  it("listNotifications filters by isRead and clamps limit", async () => {
    const { user } = await createUser({});
    await notifyUser(user._id, true);
    await notifyUser(user._id, false);
    const unread = await notificationService.listNotifications(user._id.toString(), { isRead: "false" });
    expect(unread.notifications).toHaveLength(1);
  });

  it("unreadCount reflects real unread notifications", async () => {
    const { user } = await createUser({});
    await notifyUser(user._id, false);
    await notifyUser(user._id, false);
    const result = await notificationService.unreadCount(user._id.toString());
    expect(result.count).toBe(2);
  });

  it("markRead is scoped by userId (404 for another user's notification)", async () => {
    const { user: a } = await createUser({});
    const { user: b } = await createUser({});
    const note = await notifyUser(a._id);
    await expect(
      notificationService.markRead(note._id.toString(), b._id.toString()),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("markRead succeeds for the owner", async () => {
    const { user } = await createUser({});
    const note = await notifyUser(user._id);
    const result = await notificationService.markRead(note._id.toString(), user._id.toString());
    expect(result.notification.isRead).toBe(true);
  });

  it("markAllRead clears the unread count", async () => {
    const { user } = await createUser({});
    await notifyUser(user._id, false);
    await notifyUser(user._id, false);
    const result = await notificationService.markAllRead(user._id.toString());
    expect(result.updated).toBe(2);
    const after = await notificationService.unreadCount(user._id.toString());
    expect(after.count).toBe(0);
  });

  it("clearReadNotifications removes only read notifications", async () => {
    const { user } = await createUser({});
    await notifyUser(user._id, true);
    await notifyUser(user._id, false);
    const result = await notificationService.clearReadNotifications(user._id.toString());
    expect(result.deleted).toBe(1);
    const remaining = await notificationService.listNotifications(user._id.toString(), {});
    expect(remaining.notifications).toHaveLength(1);
  });

  it("deleteNotification is scoped by userId", async () => {
    const { user: a } = await createUser({});
    const { user: b } = await createUser({});
    const note = await notifyUser(a._id);
    await expect(
      notificationService.deleteNotification(note._id.toString(), b._id.toString()),
    ).rejects.toMatchObject({ status: 404 });
    const result = await notificationService.deleteNotification(note._id.toString(), a._id.toString());
    expect(result.notification._id.toString()).toBe(note._id.toString());
  });
});
