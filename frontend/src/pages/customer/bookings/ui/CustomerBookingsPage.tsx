import { useEffect, useMemo, useState } from 'react'
import {
  CustomerAccountNav,
  CustomerEmptyState,
  CustomerFormField,
  CustomerInput,
  CustomerMetricCard,
  CustomerPageLayout,
  CustomerPanel,
  CustomerRepairStatusPanel,
  CustomerSectionHeading,
  CustomerSelect,
  CustomerStatusBadge,
  CustomerTextarea,
} from '../../../../shared/ui/kapa-customer'
import {
  cancelCustomerBooking,
  fetchCustomerBookings,
  fetchCustomerInvoices,
  fetchCustomerRepairOrders,
  type CustomerBookingApiRecord,
  type CustomerInvoiceApiRecord,
  type CustomerRepairOrderApiRecord,
} from '../../api/customerApi'
import type { TrackingRecord } from '../../model/mock'
import { fetchTrackingRecord, TrackingApiError } from '../../tracking/api/trackingApi'
import { mapTrackingRecord } from '../../tracking/lib/mapTrackingRecord'
import { useAuth } from '../../../../shared/auth'

const GARAGE_NAME = 'Kapa Auto Care Center'

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

function toDisplayBookingId(id: string) {
  return `APT-${id.slice(-6).toUpperCase()}`
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

function mapStatus(order: CustomerRepairOrderApiRecord) {
  switch (order.status) {
    case 'inProgress':
    case 'reworkRequired':
      return { statusLabel: 'In Progress', statusTone: 'in-progress' as const }
    case 'pending':
      return { statusLabel: 'Pending Intake', statusTone: 'pending' as const }
    case 'waitingParts':
    case 'waitingCustomer':
    case 'onHold':
      return { statusLabel: 'On Hold', statusTone: 'pending' as const }
    case 'cancelled':
      return { statusLabel: 'Cancelled', statusTone: 'pending' as const }
    // Mechanical work is done but it hasn't passed QC yet — not ready for
    // pickup until readyForDelivery, so this still reads as in-progress.
    case 'completed':
      return { statusLabel: 'In Progress', statusTone: 'in-progress' as const }
    case 'readyForDelivery':
      return { statusLabel: 'Ready for Pickup', statusTone: 'ready' as const }
    // Handover (deliverVehicle) is itself gated on the invoice being paid in
    // full, so reaching either of these already implies a settled invoice —
    // no need to cross-check invoice.status here.
    case 'delivered':
    case 'closed':
      return { statusLabel: 'Completed', statusTone: 'completed' as const }
    default:
      return { statusLabel: 'Updating', statusTone: 'pending' as const }
  }
}

function findMatchingBooking(order: CustomerRepairOrderApiRecord, bookings: CustomerBookingApiRecord[]) {
  return bookings.find((booking) => booking.vehicleId?._id === order.vehicleId?._id) || null
}

function formatBookingDateOnly(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function mapUpcomingStatus(status: string) {
  if (status === 'confirmed' || status === 'rescheduled') {
    return { statusLabel: status === 'rescheduled' ? 'Rescheduled' : 'Confirmed', statusTone: 'in-progress' as const }
  }
  return { statusLabel: 'Pending review', statusTone: 'pending' as const }
}

type BookingRow = {
  key: string
  // Distinguishes a real repair order from a booking that hasn't been
  // received yet — the Action column and its click handler branch on this.
  kind: 'order' | 'upcoming'
  // Set only for kind: 'upcoming' — the raw Booking id the Cancel action
  // needs (a repair order has no booking id of its own to cancel).
  bookingId?: string
  orderId: string
  displayId: string
  invoiceId: string
  dateTime: string
  // Raw ISO-sortable date used to interleave upcoming (future) bookings
  // and past repair orders into one chronological list.
  sortKey: string
  vehicle: string
  plate: string
  intakeType: 'Appointment' | 'Walk-in'
  advisor: string
  technician: string
  garageName: string
  amount: string
  paymentMethod: string
  invoiceStatus: string
  statusLabel: string
  statusTone: 'completed' | 'in-progress' | 'pending' | 'ready'
}

export default function CustomerBookingsPage() {
  const { token, user } = useAuth()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [trackingResult, setTrackingResult] = useState<TrackingRecord | null>(null)
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [trackingError, setTrackingError] = useState('')
  const [repairOrders, setRepairOrders] = useState<CustomerRepairOrderApiRecord[]>([])
  const [bookings, setBookings] = useState<CustomerBookingApiRecord[]>([])
  const [invoices, setInvoices] = useState<CustomerInvoiceApiRecord[]>([])
  const [requestError, setRequestError] = useState('')
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [cancelError, setCancelError] = useState('')

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

  const bookingHistory = useMemo<BookingRow[]>(() => {
    return repairOrders.map((order) => {
      const invoice = invoices.find((item) => item.repairOrder?.id === order._id) || null
      const linkedBooking = findMatchingBooking(order, bookings)
      const visualStatus = mapStatus(order)

      return {
        key: order._id,
        kind: 'order' as const,
        orderId: order._id,
        displayId: toDisplayOrderId(order._id),
        invoiceId: invoice?.displayId || 'Invoice pending',
        dateTime: formatDateTime(order.startedAt || order.completedAt),
        sortKey: order.startedAt || order.completedAt || '',
        vehicle: formatVehicle(order),
        plate: order.vehicleId?.licensePlate || '',
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
      }
    })
  }, [bookings, invoices, repairOrders])

  // Bookings still awaiting reception — once a service advisor receives the
  // vehicle, repairOrderId is set and it moves out of here (it's a real
  // order above instead, and no longer something the customer can cancel).
  // Shaped as BookingRow so it can sit in the very same table/status filter
  // as repair-order history rather than a separate section.
  const upcomingRows = useMemo<BookingRow[]>(() => {
    return bookings
      .filter(
        (booking) =>
          ['pending', 'confirmed', 'rescheduled'].includes(booking.status) && !booking.repairOrderId,
      )
      .map((booking) => {
        const visualStatus = mapUpcomingStatus(booking.status)
        return {
          key: booking._id,
          kind: 'upcoming' as const,
          bookingId: booking._id,
          orderId: booking._id,
          displayId: toDisplayBookingId(booking._id),
          invoiceId: 'Not yet invoiced',
          dateTime: `${formatBookingDateOnly(booking.bookingDate)} · ${booking.timeSlot}`,
          sortKey: booking.bookingDate,
          vehicle: [booking.vehicleId?.brand, booking.vehicleId?.model].filter(Boolean).join(' ') || 'Vehicle updating',
          plate: booking.vehicleId?.licensePlate || 'Not recorded',
          intakeType: booking.source === 'walkIn' ? 'Walk-in' : 'Appointment',
          advisor: booking.advisorId?.fullName || 'Awaiting reception',
          technician: 'Not assigned yet',
          garageName: GARAGE_NAME,
          amount: '—',
          paymentMethod: '—',
          invoiceStatus: '—',
          statusLabel: visualStatus.statusLabel,
          statusTone: visualStatus.statusTone,
        }
      })
  }, [bookings])

  // One combined, chronologically-sorted list — an upcoming (future) booking
  // naturally sorts to the top since its date is later than any past order.
  const allBookingRows = useMemo<BookingRow[]>(() => {
    return [...upcomingRows, ...bookingHistory].sort((a, b) => b.sortKey.localeCompare(a.sortKey))
  }, [upcomingRows, bookingHistory])

  function openCancelModal(bookingId: string) {
    setCancelTargetId(bookingId)
    setCancelReason('')
    setCancelError('')
  }

  function closeCancelModal() {
    if (cancelSubmitting) return
    setCancelTargetId(null)
    setCancelReason('')
    setCancelError('')
  }

  async function confirmCancelBooking() {
    if (!token || !cancelTargetId || cancelSubmitting) return

    setCancelSubmitting(true)
    setCancelError('')
    try {
      const response = await cancelCustomerBooking(token, cancelTargetId, cancelReason.trim() || undefined)
      setBookings((current) => current.map((item) => (item._id === cancelTargetId ? response.booking : item)))
      setCancelTargetId(null)
      setCancelReason('')
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : 'Unable to cancel this appointment.')
    } finally {
      setCancelSubmitting(false)
    }
  }

  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return allBookingRows.filter((booking) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        booking.displayId.toLowerCase().includes(normalizedQuery) ||
        booking.vehicle.toLowerCase().includes(normalizedQuery) ||
        booking.plate.toLowerCase().includes(normalizedQuery)

      const matchesStatus = status === 'all' || booking.statusTone === status

      return matchesQuery && matchesStatus
    })
  }, [allBookingRows, query, status])

  const summary = useMemo(
    () => ({
      completed: allBookingRows.filter((booking) => booking.statusTone === 'completed').length,
      inProgress: allBookingRows.filter((booking) => booking.statusTone === 'in-progress').length,
      pending: allBookingRows.filter((booking) => booking.statusTone === 'pending' || booking.statusTone === 'ready').length,
    }),
    [allBookingRows],
  )

  const selectedBooking = useMemo(
    () => allBookingRows.find((booking) => booking.displayId === selectedBookingId) ?? null,
    [allBookingRows, selectedBookingId],
  )

  async function openBookingDetail(booking: BookingRow) {
    setSelectedBookingId(booking.displayId)
    setTrackingResult(null)
    setTrackingError('')

    if (!user?.phone || !booking.plate) {
      setTrackingError('Unable to load live repair status — no phone on file for this account.')
      return
    }

    setTrackingLoading(true)
    try {
      const response = await fetchTrackingRecord({ plate: booking.plate, orderId: booking.orderId })
      setTrackingResult(mapTrackingRecord(response))
    } catch (error) {
      setTrackingError(error instanceof TrackingApiError ? error.message : 'Unable to load repair status right now.')
    } finally {
      setTrackingLoading(false)
    }
  }

  function closeBookingDetail() {
    setSelectedBookingId(null)
    setTrackingResult(null)
    setTrackingError('')
  }

  return (
    <CustomerPageLayout title="Booking History" breadcrumb="Booking History">
      <section className="customer-section">
        <CustomerAccountNav />
        <CustomerSectionHeading eyebrow="Service Records" title="Booking history" description="Latest orders in one view." compact centered />

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
                    <tr key={booking.key}>
                      <td>
                        <strong>{booking.displayId}</strong>
                        <span>{booking.invoiceId}</span>
                      </td>
                      <td>{booking.dateTime}</td>
                      <td>
                        <strong>{booking.vehicle}</strong>
                        <span>{booking.plate || 'Not recorded'}</span>
                      </td>
                      <td>{booking.intakeType}</td>
                      <td>
                        <CustomerStatusBadge tone={booking.statusTone}>{booking.statusLabel}</CustomerStatusBadge>
                      </td>
                      <td>{booking.invoiceStatus}</td>
                      <td className="customer-bookings-table__amount">{booking.amount}</td>
                      <td>
                        {booking.kind === 'upcoming' ? (
                          <button type="button" className="customer-table-link" onClick={() => openCancelModal(booking.bookingId!)}>
                            Cancel
                          </button>
                        ) : (
                          <button type="button" className="customer-table-link" onClick={() => void openBookingDetail(booking)}>
                            View detail
                          </button>
                        )}
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
        <div className="customer-modal-backdrop" role="presentation" onClick={closeBookingDetail}>
          <div
            className="customer-modal customer-modal--tracking"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="customer-modal__close" aria-label="Close detail" onClick={closeBookingDetail}>
              ×
            </button>

            <div className="customer-modal__content customer-modal__content--tracking">
              <div className="customer-modal__header">
                <div>
                  <span className="customer-booking-card__eyebrow">Repair Order Detail</span>
                  <h3 id="booking-detail-title">{selectedBooking.displayId}</h3>
                  <p>
                    {selectedBooking.vehicle} • {selectedBooking.plate || 'Plate not recorded'}
                  </p>
                </div>
                <CustomerStatusBadge tone={selectedBooking.statusTone}>{selectedBooking.statusLabel}</CustomerStatusBadge>
              </div>

              {trackingLoading ? <CustomerPanel>Loading live repair status...</CustomerPanel> : null}
              {trackingError ? <CustomerPanel className="customer-panel--error">{trackingError}</CustomerPanel> : null}
              {trackingResult ? <CustomerRepairStatusPanel result={trackingResult} /> : null}

              <div className="customer-modal__footer">
                <button type="button" className="default-btn customer-primary-btn customer-primary-btn--ghost" onClick={closeBookingDetail}>
                  Close
                  <span />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {cancelTargetId ? (
        <div className="customer-modal-backdrop" role="presentation" onClick={closeCancelModal}>
          <div
            className="customer-modal customer-modal--tracking"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-appointment-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="customer-modal__close" aria-label="Close" onClick={closeCancelModal}>
              ×
            </button>

            <div className="customer-modal__content customer-modal__content--tracking">
              <div className="customer-modal__header">
                <div>
                  <span className="customer-booking-card__eyebrow">Cancel appointment</span>
                  <h3 id="cancel-appointment-title">Cancel this appointment?</h3>
                  <p>This can't be undone — you'll need to book a new appointment if you change your mind.</p>
                </div>
              </div>

              <CustomerFormField id="cancel-reason" label="Reason (optional)">
                <CustomerTextarea
                  id="cancel-reason"
                  name="cancel-reason"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Let us know why, if you'd like."
                />
              </CustomerFormField>

              {cancelError ? <CustomerPanel className="customer-panel--error">{cancelError}</CustomerPanel> : null}

              <div className="customer-modal__footer">
                <button
                  type="button"
                  className="default-btn customer-primary-btn customer-primary-btn--ghost"
                  onClick={closeCancelModal}
                  disabled={cancelSubmitting}
                >
                  Keep appointment
                  <span />
                </button>
                <button
                  type="button"
                  className="default-btn customer-primary-btn"
                  onClick={() => void confirmCancelBooking()}
                  disabled={cancelSubmitting}
                >
                  {cancelSubmitting ? 'Cancelling...' : 'Cancel appointment'}
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
