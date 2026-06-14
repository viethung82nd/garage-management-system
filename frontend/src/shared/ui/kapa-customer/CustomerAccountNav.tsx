import { NavLink } from 'react-router-dom'

const links = [
  { to: '/customer/profile', label: 'Profile' },
  { to: '/customer/bookings', label: 'Booking History' },
  { to: '/tracking', label: 'Track Repair' },
]

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
