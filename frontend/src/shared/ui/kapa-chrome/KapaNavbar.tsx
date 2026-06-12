import { Link } from 'react-router-dom'
import { asset } from '../../lib/asset'

type LegacyCurrentPage = 'account' | 'lost-password'
type ActiveSection = 'shop' | 'contact' | 'customer' | null

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
  const resolvedActiveSection = current === 'account' || current === 'lost-password' ? 'shop' : activeSection === 'customer' ? 'shop' : activeSection
  const isShopActive = resolvedActiveSection === 'shop'
  const isContactActive = activeSection === 'contact'

  return (
    <>
      <div className="navbar-area is-sticky">
        <div className="main-responsive-nav">
          <div className="container">
            <div className="main-responsive-menu logo-cls">
              <div className="logo">
                <Link to={logoHref}>
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
                  <li className="menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children dropdown nav-item">
                    <MenuLink label="Home" />
                    <ul className="dropdown-menu" role="menu">
                      <li className="nav-item">
                        <a className="dropdown-item" href="#">
                          Home 1
                        </a>
                      </li>
                      <li className="nav-item">
                        <a className="dropdown-item" href="#">
                          Home 2
                        </a>
                      </li>
                      <li className="nav-item">
                        <a className="dropdown-item" href="#">
                          Home 3
                        </a>
                      </li>
                    </ul>
                  </li>
                  <li className="menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children dropdown nav-item">
                    <MenuLink label="Pages" />
                  </li>
                  <li className="menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children dropdown nav-item">
                    <MenuLink label="Services" />
                  </li>
                  <li className="menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children dropdown nav-item">
                    <MenuLink label="Shop" active={isShopActive} />
                    <ul className="dropdown-menu" role="menu">
                      <li className="nav-item">
                        <a className="dropdown-item" href="#">
                          Shop
                        </a>
                      </li>
                      <li className="nav-item">
                        <a className="dropdown-item" href="#">
                          Product Details
                        </a>
                      </li>
                      <li className="nav-item">
                        <a className="dropdown-item" href="#">
                          Cart
                        </a>
                      </li>
                      <li className="nav-item">
                        <a className="dropdown-item" href="#">
                          Checkout
                        </a>
                      </li>
                      <li className="nav-item">
                        <Link className="dropdown-item" to={accountHref}>
                          My account
                        </Link>
                      </li>
                    </ul>
                  </li>
                  <li className="menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children dropdown nav-item">
                    <MenuLink label="Blog" />
                  </li>
                </ul>

                <div className="main-logo-box">
                  <Link to={logoHref}>
                    <img src={asset('/wp-content/uploads/2023/01/Kapa_Logo-1.svg')} alt="Kapa" />
                  </Link>
                </div>

                <ul id="menu-navbar-right-menu" className="navbar-nav ms-auto">
                  <li className="menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children dropdown nav-item">
                    <MenuLink label="Projects" />
                  </li>
                  <li className="menu-item menu-item-type-post_type menu-item-object-page nav-item">
                    <Link title="Contact Us" to={contactHref} className={`nav-link${isContactActive ? ' active' : ''}`}>
                      Contact Us
                    </Link>
                  </li>
                </ul>

                <div className="others-options d-flex align-items-center">
                  <div className="option-item">
                    <div className="cart-btn">
                      <a href="#">
                        <i className="ri-shopping-cart-fill" />
                        <span className="mini-cart-count">0</span>
                      </a>
                    </div>
                  </div>
                  <div className="option-item">
                    <Link to={contactHref} className="default-btn">
                      Get Free Quote
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
              <div className="option-item">
                <div className="cart-btn">
                  <a href="#">
                    <i className="ri-shopping-cart-fill" />
                    <span className="mini-cart-count">0</span>
                  </a>
                </div>
              </div>
              <div className="option-item">
                <Link to={contactHref} className="default-btn">
                  Get Free Quote
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
