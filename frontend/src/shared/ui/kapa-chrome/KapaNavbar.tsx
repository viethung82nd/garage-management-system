import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPostLoginPath, useAuth } from '../../auth'
import { apiRequest } from '../../lib/api-client'
import { asset } from '../../lib/asset'

type LegacyCurrentPage = 'account' | 'lost-password'
type ActiveSection = 'shop' | 'contact' | 'customer' | null

type ServiceCategoryLite = { _id: string; name: string; isActive: boolean }

function MenuLink({
  label,
  href = '#',
  active = false,
}: {
  label: string
  href?: string
  active?: boolean
}) {
  return (
    <a
      title={label}
      href={href}
      data-toggle="dropdown"
      aria-haspopup="true"
      aria-expanded="false"
      className={`dropdown-toggle nav-link${active ? ' active' : ''}`}
    >
      {label}
    </a>
  )
}

export function KapaNavbar({
  activeSection = null,
  current,
  logoHref = '/my-account',
  accountHref = '/my-account',
  contactHref = '/contact-us',
}: {
  activeSection?: ActiveSection
  current?: LegacyCurrentPage
  logoHref?: string
  accountHref?: string
  contactHref?: string
}) {
  const { isAuthenticated, logout, user } = useAuth()
  const resolvedActiveSection = current === 'account' || current === 'lost-password' ? 'shop' : activeSection === 'customer' ? 'shop' : activeSection
  const isServicesActive = resolvedActiveSection === 'shop'
  const isContactActive = activeSection === 'contact'
  const accountRoute = isAuthenticated && user ? getPostLoginPath(user.role) ?? accountHref : accountHref
  const logoRoute = isAuthenticated && user ? getPostLoginPath(user.role) ?? logoHref : logoHref
  const ctaLabel = isAuthenticated ? 'Account' : 'Get Free Quote'

  const [categories, setCategories] = useState<ServiceCategoryLite[]>([])

  useEffect(() => {
    let cancelled = false
    apiRequest<ServiceCategoryLite[]>('/api/services/categories')
      .then((response) => {
        if (!cancelled) setCategories(response.filter((category) => category.isActive))
      })
      .catch(() => {
        // Public menu data is a nice-to-have — a failed fetch just leaves the "All services" link.
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <div className="navbar-area is-sticky">
        <div className="main-responsive-nav">
          <div className="container">
            <div className="main-responsive-menu logo-cls">
              <div className="logo">
                <Link to={logoRoute}>
                  <img src={asset('/wp-content/uploads/2023/01/Kapa_Logo_Black.svg')} alt="Kapa" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="main-navbar">
          <div className="container-fluid">
            <nav className="navbar navbar-expand-md navbar-light">
              <div className="collapse navbar-collapse mean-menu" id="navbarSupportedContent" style={{ display: 'block' }}>
                <ul id="menu-navbar-left-menu" className="navbar-nav me-auto">
                  <li className="menu-item menu-item-type-custom menu-item-object-custom nav-item">
                    <Link title="Home" to="/" className="nav-link">
                      Home
                    </Link>
                  </li>
                  <li className="menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children dropdown nav-item">
                    <MenuLink label="Services" href="/services" active={isServicesActive} />
                    <ul className="dropdown-menu" role="menu">
                      <li className="nav-item">
                        <Link className="dropdown-item" to="/services">
                          All services
                        </Link>
                      </li>
                      {categories.map((category) => (
                        <li className="nav-item" key={category._id}>
                          <Link className="dropdown-item" to={`/services?category=${encodeURIComponent(category.name)}`}>
                            {category.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                  <li className="menu-item menu-item-type-post_type menu-item-object-page nav-item">
                    <Link title="Appointment" to="/appointment" className="nav-link">
                      Appointment
                    </Link>
                  </li>
                  <li className="menu-item menu-item-type-post_type menu-item-object-page nav-item">
                    <Link title="Track Repair" to="/tracking" className="nav-link">
                      Track Repair
                    </Link>
                  </li>
                </ul>

                <div className="main-logo-box">
                  <Link to={logoRoute}>
                    <img src={asset('/wp-content/uploads/2023/01/Kapa_Logo-1.svg')} alt="Kapa" />
                  </Link>
                </div>

                <ul id="menu-navbar-right-menu" className="navbar-nav ms-auto">
                  <li className="menu-item menu-item-type-post_type menu-item-object-page nav-item">
                    <Link title="Contact Us" to={contactHref} className={`nav-link${isContactActive ? ' active' : ''}`}>
                      Contact Us
                    </Link>
                  </li>
                </ul>

                <div className="others-options d-flex align-items-center">
                  {isAuthenticated ? (
                    <div className="option-item">
                      <button type="button" className="kapa-navbar-logout-link" onClick={logout}>
                        Logout
                      </button>
                    </div>
                  ) : null}
                  <div className="option-item">
                    <Link to={isAuthenticated ? accountRoute : contactHref} className="default-btn">
                      {ctaLabel}
                    </Link>
                  </div>
                </div>
              </div>
            </nav>
          </div>
        </div>

        <div className="others-option-for-responsive">
          <div className="container">
            <div className="others-options">
              {isAuthenticated ? (
                <div className="option-item">
                  <button type="button" className="kapa-navbar-logout-link" onClick={logout}>
                    Logout
                  </button>
                </div>
              ) : null}
              <div className="option-item">
                <Link to={isAuthenticated ? accountRoute : contactHref} className="default-btn">
                  {ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="et-demo-options-toolbar">
        <a href="#" className="hint--bounce hint--left hint--black" id="toggle-quick-options" aria-label="RTL Demo">
          <i className="fa fa-align-right" />
        </a>
        <a
          href="mailto:hello@envytheme.com"
          target="_blank"
          rel="nofollow"
          className="hint--bounce hint--left hint--black"
          aria-label="Reach Us"
        >
          <i className="fa fa-life-ring" />
        </a>
        <a href="#" target="_blank" rel="nofollow" className="hint--bounce hint--left hint--black" aria-label="Documentation">
          <i className="fa fa-book" />
        </a>
      </div>
    </>
  )
}
