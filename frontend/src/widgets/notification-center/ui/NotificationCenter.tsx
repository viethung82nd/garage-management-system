import { App } from 'antd'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { NEW_NOTIFICATION_EVENT, fetchNotifications, markNotificationRead, notificationTarget } from '../../../shared/api/notifications'
import { useAuth } from '../../../shared/auth'

const POLL_INTERVAL_MS = 12000
const TOAST_DURATION_SECONDS = 6

/**
 * Headless — renders nothing itself. Polls for unread notifications and
 * pops a toast for each one that's genuinely new since this component
 * started watching. The first poll after login only records a baseline of
 * what's already unread (visible via the bell dropdown) instead of
 * toasting it — otherwise every login dumps a wall of stacked, non-expiring
 * toasts straight over the header, blocking clicks on everything under them.
 */
export function NotificationCenter() {
  const { token, isAuthenticated, user } = useAuth()
  const { notification } = App.useApp()
  const navigate = useNavigate()
  const shownIdsRef = useRef<Set<string>>(new Set())
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || !token) {
      shownIdsRef.current = new Set()
      initializedRef.current = false
      return
    }

    const authToken = token
    let cancelled = false

    async function poll() {
      try {
        const response = await fetchNotifications(authToken, '?isRead=false&limit=20')
        if (cancelled) return

        const isBaselinePoll = !initializedRef.current
        initializedRef.current = true

        for (const item of response.notifications) {
          const id = item._id || item.id
          if (!id || shownIdsRef.current.has(id)) continue
          shownIdsRef.current.add(id)

          if (isBaselinePoll) continue

          window.dispatchEvent(new CustomEvent(NEW_NOTIFICATION_EVENT))

          const target = user?.role ? notificationTarget(user.role, item) : null
          notification.open({
            description: item.message,
            duration: TOAST_DURATION_SECONDS,
            key: id,
            message: item.title,
            style: target ? { cursor: 'pointer' } : undefined,
            onClick: target
              ? () => {
                  void markNotificationRead(authToken, id).catch(() => {})
                  notification.destroy(id)
                  navigate(target)
                }
              : undefined,
            onClose: () => {
              void markNotificationRead(authToken, id)
            },
            placement: 'topRight',
          })
        }
      } catch {
        // Best-effort — a failed poll just retries on the next interval.
      }
    }

    void poll()
    const intervalId = window.setInterval(() => {
      void poll()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [token, isAuthenticated, notification, navigate, user?.role])

  return null
}
