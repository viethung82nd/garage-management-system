import { apiRequest } from '../lib/api-client'

export type ApiNotification = {
  _id: string
  id?: string
  userId: string
  type: string
  title: string
  message?: string
  refId?: string
  refModel?: 'Booking' | 'RepairOrder'
  isRead: boolean
  createdAt: string
}

export function fetchNotifications(token: string, query = '') {
  return apiRequest<{ notifications: ApiNotification[] }>(`/api/notifications${query}`, { token })
}

export function fetchUnreadNotificationCount(token: string) {
  return apiRequest<{ count: number }>('/api/notifications/unread-count', { token })
}

export function markNotificationRead(token: string, id: string) {
  return apiRequest<{ notification: ApiNotification }>(`/api/notifications/${id}/read`, { method: 'PATCH', token })
}

export function markAllNotificationsRead(token: string) {
  return apiRequest<{ updated: number }>('/api/notifications/read-all', { method: 'PATCH', token })
}
