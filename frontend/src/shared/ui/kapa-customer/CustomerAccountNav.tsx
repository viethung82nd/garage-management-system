import { NavLink } from 'react-router-dom'
import { useAuth } from '../../auth'

const links = [
  { to: '/customer/profile', label: 'Profile' },
  { to: '/customer/bookings', label: 'Booking History' },
  { to: '/customer/invoices', label: 'Invoices' },
  { to: '/tracking', label: 'Track Repair' },
  { to: '/customer/reviews', label: 'Reviews' },
]

export function CustomerAccountNav() {
  const { logout } = useAuth()

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
      <button type="button" className="customer-account-nav__link customer-account-nav__button" onClick={logout}>
        Logout
      </button>
    </div>
  )
}
