import type { AuthRole } from '../auth/types'
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

/**
 * Where clicking a notification should take the current user. The same
 * refModel routes to different pages per role (a technician opens the repair
 * steps for an order; an SA opens the review queue; an accountant opens
 * invoicing), so this is keyed on role first, then notification type.
 * Returns null when there is no meaningful destination.
 */
export function notificationTarget(role: AuthRole, notification: ApiNotification): string | null {
  const orderId = notification.refModel === 'RepairOrder' ? notification.refId : undefined

  switch (role) {
    case 'technician':
      // A resolved transfer moves the order off this technician's list, so
      // send them back to the list rather than an order that's no longer theirs.
      if (notification.type === 'transferApproved' || notification.type === 'transferRejected') return '/technician/work-orders'
      return orderId ? `/technician/repair-notes?orderId=${orderId}` : '/technician/work-orders'

    case 'serviceAdvisor':
      switch (notification.type) {
        case 'additionalServiceProposed':
          return '/advisor/additional-services'
        case 'transferRequested':
          return '/advisor/transfer-requests'
        case 'bookingCreated':
        case 'bookingRescheduled':
        case 'bookingCancelled':
          return '/advisor/bookings'
        default:
          return orderId ? `/advisor/work-orders?orderId=${orderId}` : '/advisor/dashboard'
      }

    case 'accountant':
      return '/accountant/invoices'

    case 'admin':
      return '/admin/dashboard'

    case 'onlineCustomer':
    case 'walkInCustomer':
      switch (notification.type) {
        case 'invoiceSent':
          return '/customer/invoices'
        case 'quotationSent':
        case 'additionalServiceSent':
          return '/customer/tracking'
        case 'bookingConfirmed':
        case 'bookingCancelled':
        case 'bookingCompleted':
        case 'bookingRescheduled':
          return '/customer/bookings'
        default:
          return '/customer/tracking'
      }

    default:
      return null
  }
}

/**
 * Fired on `window` whenever NotificationCenter surfaces a genuinely new
 * notification, so the header bell can bump its unread badge instantly
 * instead of waiting for its own next poll cycle.
 */
export const NEW_NOTIFICATION_EVENT = 'gms:new-notification'

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

export function deleteNotification(token: string, id: string) {
  return apiRequest<{ notification: ApiNotification }>(`/api/notifications/${id}`, { method: 'DELETE', token })
}

export function clearReadNotifications(token: string) {
  return apiRequest<{ deleted: number }>('/api/notifications/read', { method: 'DELETE', token })
}
