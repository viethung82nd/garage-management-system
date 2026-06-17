import { useEffect, useMemo, useState } from 'react'
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
import {
  fetchCustomerBookings,
  fetchCustomerInvoices,
  fetchCustomerRepairOrders,
  type CustomerBookingApiRecord,
  type CustomerInvoiceApiRecord,
  type CustomerRepairOrderApiRecord,
} from '../../api/customerApi'
import type { BookingHistoryRecord } from '../../model/mock'
import { useAuth } from '../../../../shared/auth'

const GARAGE_NAME = 'Kapa Auto Care Center'
const DETAIL_IMAGES = [
  '/wp-content/uploads/2024/12/service1.jpg',
  '/wp-content/uploads/2022/11/choose.webp',
  '/wp-content/uploads/2024/12/banner-bg2.jpg',
]

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Updating'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatVehicle(order: CustomerRepairOrderApiRecord) {
  return [order.vehicleId?.brand, order.vehicleId?.model, order.vehicleId?.year].filter(Boolean).join(' ') || 'Vehicle updating'
}

function toDisplayOrderId(id: string) {
  return `RO-${id.slice(-6).toUpperCase()}`
}

function paymentMethodLabel(method?: string | null) {
  switch (method) {
    case 'bankTransfer':
      return 'Bank transfer'
    case 'eWallet':
      return 'E-wallet'
    case 'card':
      return 'Card'
    case 'cash':
      return 'Cash'
    default:
      return 'Pending confirmation'
  }
}

function mapStatus(order: CustomerRepairOrderApiRecord, invoice?: CustomerInvoiceApiRecord | null) {
  switch (order.status) {
    case 'inProgress':
      return { statusLabel: 'In Progress', statusTone: 'in-progress' as const }
    case 'pending':
      return { statusLabel: 'Pending Intake', statusTone: 'pending' as const }
    case 'cancelled':
      return { statusLabel: 'Cancelled', statusTone: 'pending' as const }
    case 'completed':
      if (invoice?.status === 'paid') {
        return { statusLabel: 'Completed', statusTone: 'completed' as const }
      }
      return { statusLabel: 'Ready for Pickup', statusTone: 'ready' as const }
    default:
      return { statusLabel: 'Updating', statusTone: 'pending' as const }
  }
}

function findMatchingBooking(order: CustomerRepairOrderApiRecord, bookings: CustomerBookingApiRecord[]) {
  return bookings.find((booking) => booking.vehicleId?._id === order.vehicleId?._id) || null
}

export default function CustomerBookingsPage() {
  const { token } = useAuth()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [repairOrders, setRepairOrders] = useState<CustomerRepairOrderApiRecord[]>([])
  const [bookings, setBookings] = useState<CustomerBookingApiRecord[]>([])
  const [invoices, setInvoices] = useState<CustomerInvoiceApiRecord[]>([])
  const [requestError, setRequestError] = useState('')

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false

    const load = async () => {
      setRequestError('')

      try {
        const [bookingResponse, repairOrderResponse, invoiceResponse] = await Promise.all([
          fetchCustomerBookings(token),
          fetchCustomerRepairOrders(token),
          fetchCustomerInvoices(token),
        ])

        if (cancelled) {
          return
        }

        setBookings(bookingResponse.bookings)
        setRepairOrders(repairOrderResponse)
        setInvoices(invoiceResponse.invoices)
      } catch (error) {
        if (!cancelled) {
          setRequestError(error instanceof Error ? error.message : 'Unable to load your booking history.')
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [token])

  const bookingHistory = useMemo<BookingHistoryRecord[]>(() => {
    return repairOrders.map((order) => {
      const invoice = invoices.find((item) => item.repairOrder?.id === order._id) || null
      const linkedBooking = findMatchingBooking(order, bookings)
      const visualStatus = mapStatus(order, invoice)

      return {
        id: toDisplayOrderId(order._id),
        invoiceId: invoice?.displayId || 'Invoice pending',
        dateTime: formatDateTime(order.startedAt || order.completedAt),
        vehicle: formatVehicle(order),
        plate: order.vehicleId?.licensePlate || 'Not recorded',
        intakeType: linkedBooking?.source === 'walkIn' ? 'Walk-in' : 'Appointment',
        advisor: order.advisorId?.fullName || 'Service advisor updating',
        technician: order.technicianId?.fullName || 'Technician updating',
        garageName: GARAGE_NAME,
        amount: formatMoney(invoice?.total || order.totalCost || 0),
        paymentMethod: paymentMethodLabel(invoice?.latestPayment?.method),
        invoiceStatus:
          invoice?.status === 'paid'
            ? 'Paid'
            : invoice?.status === 'unpaid'
              ? 'Awaiting payment'
              : invoice?.status === 'cancelled'
                ? 'Cancelled'
                : 'Invoice not issued',
        statusLabel: visualStatus.statusLabel,
        statusTone: visualStatus.statusTone,
        primaryService: order.services[0]?.name || 'Service advisor intake',
        approvedServices: order.services.map((service) => service.name),
        detailImages: DETAIL_IMAGES,
        issueSummary:
          order.stepNotes[0]?.content ||
          (order.services.length > 0
            ? `Approved services: ${order.services.map((service) => service.name).join(', ')}.`
            : 'Repair order recorded and awaiting more service notes.'),
        additionalProposal: undefined,
      }
    })
  }, [bookings, invoices, repairOrders])

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
  }, [bookingHistory, query, status])

  const summary = useMemo(
    () => ({
      completed: bookingHistory.filter((booking) => booking.statusTone === 'completed').length,
      inProgress: bookingHistory.filter((booking) => booking.statusTone === 'in-progress').length,
      pending: bookingHistory.filter((booking) => booking.statusTone === 'pending' || booking.statusTone === 'ready').length,
    }),
    [bookingHistory],
  )

  const selectedBooking = useMemo(
    () => bookingHistory.find((booking) => booking.id === selectedBookingId) ?? null,
    [bookingHistory, selectedBookingId],
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

        {requestError ? (
          <div className="customer-panel mt-4 text-sm" style={{ color: '#991b1b', border: '1px solid #fecaca', background: '#fff1f2' }}>
            {requestError}
          </div>
        ) : null}
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
