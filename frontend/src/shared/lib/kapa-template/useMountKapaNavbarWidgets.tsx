import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
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
 */
export function useMountKapaNavbarWidgets(ready: boolean) {
  useEffect(() => {
    if (!ready) return

    const ctaMounts = Array.from(document.querySelectorAll(`.${ACCOUNT_CTA_MOUNT_CLASS}`))
    const roots = ctaMounts.map((node) => {
      const root = createRoot(node)
      root.render(<KapaAccountCta />)
      return root
    })

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
      roots.forEach((root) => root.unmount())
    }
  }, [ready])
}
