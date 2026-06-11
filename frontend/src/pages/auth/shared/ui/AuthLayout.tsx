import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { asset } from '../../../../shared/lib/asset'

export const sharedBodyClass =
  'wp-singular page-template-default page page-id-808 wp-theme-kapa theme-kapa woocommerce-account woocommerce-page woocommerce-js elementor-default elementor-kit-5'

export function usePageMeta(title: string, bodyClass = sharedBodyClass) {
  useEffect(() => {
    document.title = title
    const previous = document.body.className
    document.body.className = bodyClass
    return () => {
      document.body.className = previous
    }
  }, [bodyClass, title])
}

export function Topbar() {
  return (
    <div className="topbar-area">
      <div className="container-fluid">
        <div className="row align-items-center">
          <div className="col-lg-9 col-md-9">
            <ul className="topbar-information">
              <li>
                <img src={asset('/wp-content/uploads/2022/11/calling.svg')} alt="Icon Image" />
                <span> Call Us: </span> <a href="tel:3237501234">+(323) 750-1234</a>
              </li>
              <li>
                <img src={asset('/wp-content/uploads/2022/11/map.svg')} alt="Icon Image" />
                <span> Address: </span> 7011 Vermont Ave, Los Angeles, CA 90044
              </li>
            </ul>
          </div>
          <div className="col-lg-3 col-md-3">
            <ul className="topbar-information info-right">
              <li>
                <img src={asset('/wp-content/uploads/2022/11/timer.svg')} alt="Icon Image" />
                <span> Open Hours:</span> Mon-Fri || 8 AM-6PM
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

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

export function NavBar({ current }: { current: 'account' | 'lost-password' }) {
  const isAccount = current === 'account'
  return (
    <>
      <div className="navbar-area is-sticky">
        <div className="main-responsive-nav">
          <div className="container">
            <div className="main-responsive-menu logo-cls">
              <div className="logo">
                <Link to="/my-account">
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
                    <MenuLink label="Shop" active={isAccount} />
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
                        <Link className="dropdown-item" to="/my-account">
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
                  <Link to="/my-account">
                    <img src={asset('/wp-content/uploads/2023/01/Kapa_Logo-1.svg')} alt="Kapa" />
                  </Link>
                </div>

                <ul id="menu-navbar-right-menu" className="navbar-nav ms-auto">
                  <li className="menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children dropdown nav-item">
                    <MenuLink label="Projects" />
                  </li>
                  <li className="menu-item menu-item-type-post_type menu-item-object-page nav-item">
                    <a title="Contact Us" href="#" className="nav-link">
                      Contact Us
                    </a>
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
                    <a href="#" className="default-btn">
                      Get Free Quote
                    </a>
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
                <a href="#" className="default-btn">
                  Get Free Quote
                </a>
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

export function Footer() {
  return (
    <div className="footer-area pt-100">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-4 col-sm-6">
            <div className="widget single-footer-widget widget_kapa_contact_info">
              <h3 className="widget_title">Contact Information </h3>
              <ul className="info-list">
                <li>
                  <img src={asset('/wp-content/uploads/2022/11/calling.svg')} alt="Image" />
                  <span>Call Us: </span> <a href="tel:3237501234">+(323) 750-1234</a>
                </li>
                <li>
                  <img src={asset('/wp-content/uploads/2022/11/timer.svg')} alt="Image" />
                  <span>Address: </span> 7011 Vermont Ave, Los Angeles, CA 90044
                </li>
                <li>
                  <img src={asset('/wp-content/uploads/2022/11/map.svg')} alt="Image" />
                  <span>Email: </span> hellokapa@gmail.com
                </li>
              </ul>
            </div>
          </div>

          <div className="col-lg-4 col-sm-6">
            <div className="widget single-footer-widget">
              <a className="footer-logo" href="#">
                <img src={asset('/wp-content/uploads/2023/01/Kapa_Logo-1.svg')} alt="Kapa" />
              </a>
              <ul className="social-link">
                <li>
                  <a href="#">Facebook</a>
                </li>
                <li>
                  <a href="#">Twitter</a>
                </li>
                <li>
                  <a href="#">Linkedin</a>
                </li>
                <li>
                  <a href="#">Instagram</a>
                </li>
                <li>
                  <a href="#">Youtube</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="col-lg-4 col-sm-6">
            <div className="widget single-footer-widget widget_kapa_contact_info">
              <h3 className="widget_title">Contact Information </h3>
              <ul className="info-list">
                <li>
                  <span>Mon - Fri: </span> 8:00 AM - 6:00 PM
                </li>
                <li>
                  <span>Sat: </span> 8:30 AM - 2:00 PM
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="copyright-area">
          <div className="row align-items-center">
            <div className="col-lg-12">
              <div className="copyright-wrap">
                <ul className="footer-menu">
                  <li>
                    <a href="#">About Us</a>
                  </li>
                  <li>
                    <a href="#">Our Team</a>
                  </li>
                  <li>
                    <a href="#">Contact Us</a>
                  </li>
                </ul>
                <div className="copyright-text">
                  <p>
                    © Kapa All Rights Reserved by <a href="#">EnvyTheme</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PageBanner({
  title,
  breadcrumb,
}: {
  title: string
  breadcrumb: string
}) {
  return (
    <div className="page-banner-area" style={{ backgroundImage: `url(${asset('/wp-content/uploads/2022/11/banner-bg-2.webp')})` }}>
      <div className="container-fluid">
        <div className="page-banner-content">
          <ul>
            <li>
              <a href="#">Home</a>
            </li>
            <li>
              <span>{breadcrumb}</span>
            </li>
          </ul>
          <h2>{title}</h2>
        </div>
      </div>
    </div>
  )
}

export function PasswordField() {
  const [visible, setVisible] = useState(false)
  return (
    <span className="password-input">
      <input
        className="woocommerce-Input woocommerce-Input--text input-text form-control"
        type={visible ? 'text' : 'password'}
        name="password"
        id="password"
        autoComplete="current-password"
      />
      <button
        type="button"
        className="show-password-input"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-describedby="password"
        onClick={() => setVisible((value) => !value)}
      >
        <i className={visible ? 'ri-eye-line' : 'ri-eye-off-line'} />
      </button>
    </span>
  )
}
