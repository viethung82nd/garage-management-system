import * as notificationService from "../services/notification.service.js";

/**
 * GET /api/notifications — the authenticated user's notifications, newest first.
 * Query: isRead ("true"/"false"), limit (default 50, max 100)
 */
export async function listNotifications(req, res) {
  const result = await notificationService.listNotifications(req.user.sub, req.query ?? {});
  res.json(result);
}

/** GET /api/notifications/unread-count — number of unread notifications. */
export async function unreadCount(req, res) {
  const result = await notificationService.unreadCount(req.user.sub);
  res.json(result);
}

/** PATCH /api/notifications/:id/read — mark one of the user's notifications read. */
export async function markRead(req, res) {
  const result = await notificationService.markRead(req.params.id, req.user.sub);
  res.json(result);
}

/** PATCH /api/notifications/read-all — mark all of the user's notifications read. */
export async function markAllRead(req, res) {
  const result = await notificationService.markAllRead(req.user.sub);
  res.json(result);
}

/** DELETE /api/notifications/read — remove all of the user's already-read notifications. */
export async function clearReadNotifications(req, res) {
  const result = await notificationService.clearReadNotifications(req.user.sub);
  res.json(result);
}

/** DELETE /api/notifications/:id — remove one of the user's notifications. */
export async function deleteNotification(req, res) {
  const result = await notificationService.deleteNotification(req.params.id, req.user.sub);
  res.json(result);
}
