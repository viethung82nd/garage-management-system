import { Link } from 'react-router-dom'
import { getPostLoginPath, useAuth } from '../../auth'

/**
 * Auth-aware replacement for the cloned template's static "Get Free Quote"
 * button. Mounted via createRoot into each `.kapa-account-cta-mount` slot that
 * `pruneKapaNavbar` leaves behind, since the raw cloned markup is a static
 * string and can't react to login state on its own.
 */
export function KapaAccountCta({ contactHref = '/contact-us' }: { contactHref?: string }) {
  const { isAuthenticated, logout, user } = useAuth()
  const accountRoute = isAuthenticated && user ? getPostLoginPath(user.role) ?? contactHref : contactHref
  const ctaLabel = isAuthenticated ? 'Account' : 'Get Free Quote'

  return (
    <>
      {isAuthenticated ? (
        <button type="button" className="kapa-navbar-logout-link" onClick={logout}>
          Logout
        </button>
      ) : null}
      <Link to={isAuthenticated ? accountRoute : contactHref} className="default-btn">
        {ctaLabel}
      </Link>
    </>
  )
}
