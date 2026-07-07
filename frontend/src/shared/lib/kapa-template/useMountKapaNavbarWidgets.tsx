import { useEffect } from 'react'
import { getPostLoginPath, useAuth, type AuthUser } from '../../auth'
import { apiRequest } from '../api-client'
import { ACCOUNT_CTA_MOUNT_CLASS, SERVICES_DROPDOWN_SLOT_ID } from './pruneKapaNavbar'

type ServiceCategoryLite = { _id: string; name: string; isActive: boolean }

/**
 * Fills a `.kapa-account-cta-mount` node with plain DOM elements — not a
 * React tree. A separate createRoot() mounted into a node that's merely
 * nested (in the DOM) inside the app's real root does NOT inherit React
 * context: useAuth()/<Link> inside it would read AuthProvider's/Router's
 * *default* context value instead of the real one and throw, so nothing
 * would ever render. Plain DOM avoids that whole class of problem.
 */
function renderAccountCta(
  node: Element,
  { isAuthenticated, user, onLogout }: { isAuthenticated: boolean; user: AuthUser | null; onLogout: () => void },
) {
  node.innerHTML = ''

  if (isAuthenticated) {
    const logoutBtn = document.createElement('button')
    logoutBtn.type = 'button'
    logoutBtn.className = 'kapa-navbar-logout-link'
    logoutBtn.textContent = 'Logout'
    logoutBtn.addEventListener('click', onLogout)
    node.appendChild(logoutBtn)
  }

  const loginHref = '/my-account'
  const accountRoute = isAuthenticated && user ? getPostLoginPath(user.role) ?? loginHref : loginHref
  const link = document.createElement('a')
  link.setAttribute('href', isAuthenticated ? accountRoute : loginHref)
  link.className = 'default-btn'
  link.textContent = isAuthenticated ? 'Account' : 'Login'
  node.appendChild(link)
}

/**
 * Brings the slots `pruneKapaNavbar` leaves in a cloned template page to
 * life: the account CTA/logout button (there can be more than one copy —
 * desktop nav + the responsive nav each have their own), and the live
 * service categories inside the Services dropdown. Call with `ready` once
 * `pageSpec` is set (the cloned markup is in the DOM).
 */
export function useMountKapaNavbarWidgets(ready: boolean) {
  const { isAuthenticated, user, logout } = useAuth()

  useEffect(() => {
    if (!ready) return

    document.querySelectorAll(`.${ACCOUNT_CTA_MOUNT_CLASS}`).forEach((node) => {
      renderAccountCta(node, { isAuthenticated, user, onLogout: logout })
    })
  }, [ready, isAuthenticated, user, logout])

  useEffect(() => {
    if (!ready) return

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
    }
  }, [ready])
}
