import { getPostLoginPath } from '../../auth'
import type { AuthUser } from '../../auth'

type KapaAccountCtaProps = {
  isAuthenticated: boolean
  user: AuthUser | null
  onLogout: () => void
  contactHref?: string
}

/**
 * Auth-aware replacement for the cloned template's static "Get Free Quote"
 * button. Mounted via createRoot into each `.kapa-account-cta-mount` slot that
 * `pruneKapaNavbar` leaves behind, since the raw cloned markup is a static
 * string and can't react to login state on its own.
 *
 * Takes auth state as props rather than calling useAuth()/<Link> itself:
 * this component is rendered into its own createRoot(), a separate React
 * tree from the app's, so it has no access to AuthProvider's or
 * BrowserRouter's context — the parent page (which does) must read that
 * state and pass it in. For the same reason this uses a plain <a href>
 * instead of <Link>, which would silently fail to navigate outside a Router.
 */
export function KapaAccountCta({ isAuthenticated, user, onLogout, contactHref = '/contact-us' }: KapaAccountCtaProps) {
  const accountRoute = isAuthenticated && user ? getPostLoginPath(user.role) ?? contactHref : contactHref
  const ctaLabel = isAuthenticated ? 'Account' : 'Get Free Quote'

  return (
    <>
      {isAuthenticated ? (
        <button type="button" className="kapa-navbar-logout-link" onClick={onLogout}>
          Logout
        </button>
      ) : null}
      <a href={isAuthenticated ? accountRoute : contactHref} className="default-btn">
        {ctaLabel}
      </a>
    </>
  )
}
