import { Link } from 'react-router-dom'
import { CustomerStatusBadge } from './CustomerStatusBadge'

export type BookingCardRecord = {
  id: string
  dateTime: string
  vehicle: string
  plate: string
  services: string[]
  advisor: string
  branch: string
  amount: string
  statusLabel: string
  statusTone: 'completed' | 'in-progress' | 'pending' | 'ready'
}

export function CustomerBookingCard({
  booking,
}: {
  booking: BookingCardRecord
}) {
  return (
    <div className="customer-booking-card">
      <div className="customer-booking-card__header">
        <div>
          <span className="customer-booking-card__eyebrow">Booking ID</span>
          <h3>{booking.id}</h3>
        </div>
        <CustomerStatusBadge tone={booking.statusTone}>{booking.statusLabel}</CustomerStatusBadge>
      </div>

      <div className="customer-booking-card__grid">
        <div>
          <span className="customer-booking-card__label">Date / Time</span>
          <strong>{booking.dateTime}</strong>
        </div>
        <div>
          <span className="customer-booking-card__label">Vehicle</span>
          <strong>{booking.vehicle}</strong>
          <p>{booking.plate}</p>
        </div>
        <div>
          <span className="customer-booking-card__label">Advisor / Branch</span>
          <strong>{booking.advisor}</strong>
          <p>{booking.branch}</p>
        </div>
        <div>
          <span className="customer-booking-card__label">Amount</span>
          <strong>{booking.amount}</strong>
        </div>
      </div>

      <div className="customer-booking-card__services">
        <span className="customer-booking-card__label">Services</span>
        <div className="customer-booking-card__tags">
          {booking.services.map((service) => (
            <span key={service}>{service}</span>
          ))}
        </div>
      </div>

      <div className="customer-booking-card__actions">
        <Link to="/customer/tracking" className="default-btn customer-primary-btn customer-primary-btn--ghost">
          View Progress
          <span />
        </Link>
      </div>
    </div>
  )
}
