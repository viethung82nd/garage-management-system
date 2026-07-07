import { useEffect, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useAuth } from '../../auth'
import { KapaAccountCta } from '../../ui/kapa-chrome/KapaAccountCta'
import { apiRequest } from '../api-client'
import { ACCOUNT_CTA_MOUNT_CLASS, SERVICES_DROPDOWN_SLOT_ID } from './pruneKapaNavbar'

type ServiceCategoryLite = { _id: string; name: string; isActive: boolean }

/**
 * Mounts the real, auth-aware navbar widgets into the slots `pruneKapaNavbar`
 * leaves in a cloned template page: the account CTA/logout button (possibly
 * more than one copy — desktop nav + the responsive nav both have their own),
 * and the live service categories inside the Services dropdown. Call once
 * `pageSpec` is ready (the cloned markup is in the DOM).
 *
 * Reads auth state itself (this hook runs inside the page component, which
 * is inside AuthProvider) and passes it into KapaAccountCta as props, since
 * that component is mounted into its own createRoot() and can't read context
 * on its own — see the comment on KapaAccountCta for why.
 */
export function useMountKapaNavbarWidgets(ready: boolean) {
  const { isAuthenticated, user, logout } = useAuth()
  const rootsRef = useRef<Root[]>([])

  useEffect(() => {
    if (!ready) return

    const ctaMounts = Array.from(document.querySelectorAll(`.${ACCOUNT_CTA_MOUNT_CLASS}`))
    rootsRef.current = ctaMounts.map((node) => createRoot(node))

    let cancelled = false
    apiRequest<ServiceCategoryLite[]>('/api/services/categories')
      .then((categories) => {
        if (cancelled) return
        const slot = document.getElementById(SERVICES_DROPDOWN_SLOT_ID)
        if (!slot) return
        const items = categories
          .filter((category) => category.isActive)
          .map(
            (category) =>
              `<li class="nav-item"><a class="dropdown-item" href="/services?category=${encodeURIComponent(category.name)}">${category.name}</a></li>`,
          )
          .join('')
        slot.insertAdjacentHTML('beforeend', items)
      })
      .catch(() => {
        // Live categories are a nice-to-have — the "All services" fallback link still works.
      })

    return () => {
      cancelled = true
      rootsRef.current.forEach((root) => root.unmount())
      rootsRef.current = []
    }
  }, [ready])

  // Re-render the already-mounted CTA whenever auth state changes (login,
  // logout, session hydration finishing after the initial mount).
  useEffect(() => {
    rootsRef.current.forEach((root) => {
      root.render(<KapaAccountCta isAuthenticated={isAuthenticated} user={user} onLogout={logout} />)
    })
  })
}
