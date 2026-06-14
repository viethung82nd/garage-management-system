import { useMemo, useState } from 'react'
import { asset } from '../../../../shared/lib/asset'
import {
  CustomerAccountNav,
  CustomerEmptyState,
  CustomerFormField,
  CustomerInput,
  CustomerMetricCard,
  CustomerPageLayout,
  CustomerPanel,
  CustomerSectionHeading,
  CustomerSelect,
  CustomerStatusBadge,
} from '../../../../shared/ui/kapa-customer'
import { bookingHistory } from '../../model/mock'

export default function CustomerBookingsPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return bookingHistory.filter((booking) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        booking.id.toLowerCase().includes(normalizedQuery) ||
        booking.vehicle.toLowerCase().includes(normalizedQuery) ||
        booking.plate.toLowerCase().includes(normalizedQuery)

      const matchesStatus = status === 'all' || booking.statusTone === status

      return matchesQuery && matchesStatus
    })
  }, [query, status])

  const summary = useMemo(
    () => ({
      completed: bookingHistory.filter((booking) => booking.statusTone === 'completed').length,
      inProgress: bookingHistory.filter((booking) => booking.statusTone === 'in-progress').length,
      pending: bookingHistory.filter((booking) => booking.statusTone === 'pending' || booking.statusTone === 'ready').length,
    }),
    [],
  )

  const selectedBooking = useMemo(
    () => bookingHistory.find((booking) => booking.id === selectedBookingId) ?? null,
    [selectedBookingId],
  )

  return (
    <CustomerPageLayout title="Booking History" breadcrumb="Booking History">
      <section className="customer-section">
        <CustomerAccountNav />
        <CustomerSectionHeading eyebrow="Service Records" title="Booking history" description="Latest orders in one view." compact />

        <div className="customer-metric-strip customer-metric-strip--three">
          <CustomerMetricCard label="Completed" value={summary.completed} />
          <CustomerMetricCard label="In Progress" value={summary.inProgress} accent />
          <CustomerMetricCard label="Pending / Ready" value={summary.pending} />
        </div>

        <div className="customer-toolbar">
          <CustomerPanel>
            <CustomerFormField id="booking-search" label="Search">
              <CustomerInput
                id="booking-search"
                name="booking-search"
                placeholder="Booking ID, vehicle, or plate"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </CustomerFormField>
          </CustomerPanel>

          <CustomerPanel>
            <CustomerFormField id="booking-status" label="Status">
              <CustomerSelect id="booking-status" name="booking-status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="completed">Completed</option>
                <option value="ready">Ready for pickup</option>
                <option value="in-progress">In progress</option>
                <option value="pending">Pending / waiting</option>
              </CustomerSelect>
            </CustomerFormField>
          </CustomerPanel>
        </div>
      </section>

      <section className="customer-section">
        {filteredBookings.length === 0 ? (
          <CustomerEmptyState title="No booking found" description="Try another keyword or reset the status filter." />
        ) : (
          <div className="customer-bookings-table-wrap">
            <div className="customer-bookings-table-scroll">
              <table className="customer-bookings-table">
                <thead>
                  <tr>
                    <th>Repair Order</th>
                    <th>Visit</th>
                    <th>Vehicle</th>
                    <th>Intake</th>
                    <th>Status</th>
                    <th>Invoice</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        <strong>{booking.id}</strong>
                        <span>{booking.invoiceId}</span>
                      </td>
                      <td>{booking.dateTime}</td>
                      <td>
                        <strong>{booking.vehicle}</strong>
                        <span>{booking.plate}</span>
                      </td>
                      <td>{booking.intakeType}</td>
                      <td>
                        <CustomerStatusBadge tone={booking.statusTone}>{booking.statusLabel}</CustomerStatusBadge>
                      </td>
                      <td>{booking.invoiceStatus}</td>
                      <td className="customer-bookings-table__amount">{booking.amount}</td>
                      <td>
                        <button
                          type="button"
                          className="customer-table-link"
                          onClick={() => {
                            setSelectedImageIndex(0)
                            setSelectedBookingId(booking.id)
                          }}
                        >
                          View detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {selectedBooking ? (
        <div className="customer-modal-backdrop" role="presentation" onClick={() => setSelectedBookingId(null)}>
          <div className="customer-modal" role="dialog" aria-modal="true" aria-labelledby="booking-detail-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="customer-modal__close" aria-label="Close detail" onClick={() => setSelectedBookingId(null)}>
              ×
            </button>

            <div className="customer-modal__media">
              <div className="customer-modal__media-main">
                <img src={asset(selectedBooking.detailImages[selectedImageIndex])} alt={selectedBooking.vehicle} />
              </div>
              <div className="customer-modal__thumbs">
                {selectedBooking.detailImages.map((image, index) => (
                  <button
                    key={`${selectedBooking.id}-${image}`}
                    type="button"
                    className={`customer-modal__thumb${selectedImageIndex === index ? ' customer-modal__thumb--active' : ''}`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img src={asset(image)} alt={`${selectedBooking.vehicle} issue ${index + 1}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="customer-modal__content">
              <div className="customer-modal__header">
                <div>
                  <span className="customer-booking-card__eyebrow">Repair Order Detail</span>
                  <h3 id="booking-detail-title">{selectedBooking.id}</h3>
                  <p>{selectedBooking.vehicle} • {selectedBooking.plate}</p>
                </div>
                <CustomerStatusBadge tone={selectedBooking.statusTone}>{selectedBooking.statusLabel}</CustomerStatusBadge>
              </div>

              <div className="customer-modal__grid">
                <div>
                  <span className="customer-booking-card__label">Garage</span>
                  <strong>{selectedBooking.garageName}</strong>
                </div>
                <div>
                  <span className="customer-booking-card__label">Intake</span>
                  <strong>{selectedBooking.intakeType}</strong>
                </div>
                <div>
                  <span className="customer-booking-card__label">Service advisor</span>
                  <strong>{selectedBooking.advisor}</strong>
                </div>
                <div>
                  <span className="customer-booking-card__label">Technician</span>
                  <strong>{selectedBooking.technician}</strong>
                </div>
                <div>
                  <span className="customer-booking-card__label">Payment method</span>
                  <strong>{selectedBooking.paymentMethod}</strong>
                </div>
                <div>
                  <span className="customer-booking-card__label">Invoice</span>
                  <strong>{selectedBooking.invoiceId}</strong>
                  <p>{selectedBooking.invoiceStatus}</p>
                </div>
              </div>

              <div className="customer-modal__section">
                <span className="customer-booking-card__label">Issue summary</span>
                <p>{selectedBooking.issueSummary}</p>
              </div>

              <div className="customer-modal__section">
                <span className="customer-booking-card__label">Approved services</span>
                <div className="customer-service-tags">
                  {selectedBooking.approvedServices.map((service) => (
                    <span key={service}>{service}</span>
                  ))}
                </div>
              </div>

              {selectedBooking.additionalProposal ? (
                <div className="customer-modal__section">
                  <span className="customer-booking-card__label">Additional proposal</span>
                  <p>{selectedBooking.additionalProposal}</p>
                </div>
              ) : null}

              <div className="customer-modal__footer">
                <div className="customer-modal__total">
                  <span className="customer-booking-card__label">Quoted total</span>
                  <strong>{selectedBooking.amount}</strong>
                </div>
                <button type="button" className="default-btn customer-primary-btn customer-primary-btn--ghost" onClick={() => setSelectedBookingId(null)}>
                  Close
                  <span />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </CustomerPageLayout>
  )
}
