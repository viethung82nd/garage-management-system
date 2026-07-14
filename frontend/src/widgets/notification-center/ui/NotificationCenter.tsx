import { notification } from 'antd'
import { useEffect, useRef } from 'react'
import { fetchNotifications, markNotificationRead } from '../../../shared/api/notifications'
import { useAuth } from '../../../shared/auth'

const POLL_INTERVAL_MS = 30000

/**
 * Headless — renders nothing itself. Polls for unread notifications and
 * opens one antd notification per unread item, duration: 0 (never
 * auto-closes; only dismissed by clicking its own x), which is what makes
 * multiple simultaneous notifications stack as a queue in the corner
 * instead of overwriting each other or vanishing on their own.
 */
export function NotificationCenter() {
  const { token, isAuthenticated } = useAuth()
  const shownIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isAuthenticated || !token) {
      shownIdsRef.current = new Set()
      return
    }

    const authToken = token
    let cancelled = false

    async function poll() {
      try {
        const response = await fetchNotifications(authToken, '?isRead=false&limit=20')
        if (cancelled) return

        for (const item of response.notifications) {
          const id = item._id || item.id
          if (!id || shownIdsRef.current.has(id)) continue
          shownIdsRef.current.add(id)

          notification.open({
            description: item.message,
            duration: 0,
            key: id,
            message: item.title,
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
  }, [token, isAuthenticated])

  return null
}
