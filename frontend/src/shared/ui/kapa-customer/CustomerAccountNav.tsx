import { NavLink } from 'react-router-dom'

const links = [
  { to: '/customer/profile', label: 'Profile' },
  { to: '/customer/bookings', label: 'Booking History' },
  { to: '/customer/invoices', label: 'Invoices' },
  { to: '/customer/reviews', label: 'Reviews' },
]

// "Track Repair" and "Logout" are deliberately not repeated here — both
// already live in the global header (KapaNavbar), so this sub-nav only
// covers account-specific pages the header doesn't link to.
export function CustomerAccountNav() {
  return (
    <div className="customer-account-nav">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) => `customer-account-nav__link${isActive ? ' customer-account-nav__link--active' : ''}`}
        >
          {link.label}
        </NavLink>
      ))}
    </div>
  )
}
