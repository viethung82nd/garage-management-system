import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { useAuth } from '../../../../shared/auth'
import {
  fetchCustomerBookings,
  fetchCustomerInvoices,
  type CustomerBookingApiRecord,
  type CustomerInvoiceApiRecord,
} from '../../api/customerApi'
import type { CustomerInvoiceRecord, CustomerInvoiceStatus } from '../../model/mock'

const GARAGE_NAME = 'Kapa Auto Care Center'

function parseMoney(value: string) {
  return Number(value.replace(/[^0-9.-]+/g, ''))
}

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

function formatDateOnly(value?: string | null) {
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
  }).format(date)
}

function paymentMethodLabel(method?: string | null): CustomerInvoiceRecord['paymentMethod'] {
  switch (method) {
    case 'bankTransfer':
      return 'Bank transfer'
    case 'card':
      return 'Card at counter'
    case 'cash':
      return 'Cash at garage'
    default:
      return 'Cash at garage'
  }
}

function paymentNote(invoice: CustomerInvoiceApiRecord) {
  if (invoice.status === 'paid') {
    return 'Paid directly at the service desk and confirmed by accounting.'
  }

  if (invoice.latestPayment?.status === 'pending') {
    return 'Payment attempt is pending confirmation from the garage.'
  }

  return 'Awaiting direct payment confirmation from customer.'
}

function inferBookingId(invoice: CustomerInvoiceApiRecord, bookings: CustomerBookingApiRecord[]) {
  const booking = bookings.find((item) => item.vehicleId?._id === invoice.vehicle?.id)
  return booking ? `BK-${booking._id.slice(-6).toUpperCase()}` : undefined
}

function mapInvoiceStatus(invoice: CustomerInvoiceApiRecord): {
  label: CustomerInvoiceStatus
  tone: CustomerInvoiceRecord['statusTone']
} {
  if (invoice.status === 'paid') {
    return { label: 'Paid', tone: 'completed' as const }
  }
  if (invoice.status === 'cancelled') {
    return { label: 'Cancelled', tone: 'ready' as const }
  }
  return { label: 'Awaiting payment', tone: 'pending' as const }
}

export default function CustomerInvoicesPage() {
  const { token, user } = useAuth()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<CustomerInvoiceApiRecord[]>([])
  const [bookings, setBookings] = useState<CustomerBookingApiRecord[]>([])
  const [requestError, setRequestError] = useState('')

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false

    const load = async () => {
      setRequestError('')

      try {
        const [invoiceResponse, bookingResponse] = await Promise.all([
          fetchCustomerInvoices(token),
          fetchCustomerBookings(token),
        ])

        if (cancelled) {
          return
        }

        setInvoices(invoiceResponse.invoices)
        setBookings(bookingResponse.bookings)
      } catch (error) {
        if (!cancelled) {
          setRequestError(error instanceof Error ? error.message : 'Unable to load your invoices.')
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [token])

  const customerInvoices = useMemo<CustomerInvoiceRecord[]>(() => {
    return invoices.map((invoice) => {
      const mappedStatus = mapInvoiceStatus(invoice)

      return {
        id: invoice.displayId,
        repairOrderId: invoice.repairOrder?.displayId || 'Repair order pending',
        bookingId: inferBookingId(invoice, bookings),
        issuedAt: formatDateTime(invoice.issuedAt),
        serviceDate: formatDateOnly(invoice.repairOrder?.completedAt || invoice.repairOrder?.startedAt || invoice.issuedAt),
        vehicle: [invoice.vehicle?.brand, invoice.vehicle?.model, invoice.vehicle?.year].filter(Boolean).join(' ') || 'Vehicle updating',
        plate: invoice.vehicle?.licensePlate || 'Not recorded',
        vin: invoice.vehicle?.chassisNumber || invoice.vehicle?.engineNumber || 'Not recorded',
        mileage: 'Not recorded',
        advisor: invoice.serviceAdvisor?.fullName || 'Service advisor updating',
        technician: invoice.technician?.fullName || 'Technician updating',
        customerName: invoice.customer?.fullName || user?.fullName || 'Customer',
        customerPhone: invoice.customer?.phone || user?.phone || 'No phone on file',
        customerEmail: invoice.customer?.email || user?.email || 'No email on file',
        customerAddress: 'No address on file',
        accountantName: invoice.accountant?.fullName || 'Kapa accounting',
        invoiceStatus: mappedStatus.label,
        statusTone: mappedStatus.tone,
        paymentMethod: paymentMethodLabel(invoice.latestPayment?.method),
        paymentNote: paymentNote(invoice),
        subtotal: formatMoney(invoice.subtotal),
        tax: formatMoney(0),
        discount: formatMoney(invoice.discount),
        total: formatMoney(invoice.total),
        serviceItems: invoice.lineItems.map((item, index) => ({
          item: `SRV-${String(index + 1).padStart(2, '0')}`,
          label: item.description,
          description: `Service quantity ${item.quantity} approved in the repair order.`,
          quantity: item.quantity,
          unitPrice: formatMoney(item.unitPrice),
          lineTotal: formatMoney(item.lineTotal),
        })),
        issueImages: [],
        garageName: GARAGE_NAME,
        customerNote: invoice.status === 'unpaid' ? 'Please settle at the service desk or confirm your direct transfer with the accountant.' : undefined,
      }
    })
  }, [bookings, invoices, user?.email, user?.fullName, user?.phone])

  const filteredInvoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return customerInvoices.filter((invoice) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        invoice.id.toLowerCase().includes(normalizedQuery) ||
        invoice.repairOrderId.toLowerCase().includes(normalizedQuery) ||
        invoice.vehicle.toLowerCase().includes(normalizedQuery) ||
        invoice.plate.toLowerCase().includes(normalizedQuery)

      const matchesStatus = status === 'all' || invoice.statusTone === status

      return matchesQuery && matchesStatus
    })
  }, [customerInvoices, query, status])

  const summary = useMemo(
    () => ({
      paid: customerInvoices.filter((invoice) => invoice.statusTone === 'completed').length,
      awaiting: customerInvoices.filter((invoice) => invoice.statusTone === 'pending').length,
      updated: customerInvoices.filter((invoice) => invoice.statusTone === 'ready').length,
    }),
    [customerInvoices],
  )

  const selectedInvoice = useMemo(
    () => customerInvoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [customerInvoices, selectedInvoiceId],
  )

  return (
    <CustomerPageLayout title="Customer Invoices" breadcrumb="Invoices">
      <section className="customer-section">
        <CustomerAccountNav />
        <CustomerSectionHeading eyebrow="Billing Records" title="Your invoices" description="Direct invoices uploaded by Kapa accounting." compact />

        <div className="customer-metric-strip customer-metric-strip--three">
          <CustomerMetricCard label="Paid" value={summary.paid} />
          <CustomerMetricCard label="Awaiting Payment" value={summary.awaiting} accent />
          <CustomerMetricCard label="Adjusted / Updated" value={summary.updated} />
        </div>

        <div className="customer-toolbar">
          <CustomerPanel>
            <CustomerFormField id="invoice-search" label="Search">
              <CustomerInput
                id="invoice-search"
                name="invoice-search"
                placeholder="Invoice ID, repair order, vehicle, or plate"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </CustomerFormField>
          </CustomerPanel>

          <CustomerPanel>
            <CustomerFormField id="invoice-status" label="Status">
              <CustomerSelect id="invoice-status" name="invoice-status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="completed">Paid</option>
                <option value="pending">Awaiting payment</option>
                <option value="ready">Adjusted / updated</option>
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
        {filteredInvoices.length === 0 ? (
          <CustomerEmptyState
            title="No invoice found"
            description="Try another keyword or open your booking history for the matching repair order."
            action={
              <div className="customer-empty-actions">
                <Link to="/customer/bookings" className="default-btn customer-primary-btn">
                  View Booking History
                  <span />
                </Link>
              </div>
            }
          />
        ) : (
          <div className="customer-bookings-table-wrap">
            <div className="customer-bookings-table-scroll">
              <table className="customer-bookings-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Issued</th>
                    <th>Vehicle</th>
                    <th>Repair Order</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <strong>{invoice.id}</strong>
                        <span>{invoice.garageName}</span>
                      </td>
                      <td>{invoice.issuedAt}</td>
                      <td>
                        <strong>{invoice.vehicle}</strong>
                        <span>{invoice.plate}</span>
                      </td>
                      <td>
                        <strong>{invoice.repairOrderId}</strong>
                        <span>{invoice.bookingId ?? 'Customer record'}</span>
                      </td>
                      <td>
                        <CustomerStatusBadge tone={invoice.statusTone}>{invoice.invoiceStatus}</CustomerStatusBadge>
                      </td>
                      <td>
                        <strong>{invoice.paymentMethod}</strong>
                        <span>{invoice.paymentNote}</span>
                      </td>
                      <td className="customer-bookings-table__amount">{invoice.total}</td>
                      <td>
                        <div className="customer-table-actions">
                          <button type="button" className="customer-table-link" onClick={() => setSelectedInvoiceId(invoice.id)}>
                            View detail
                          </button>
                          <button type="button" className="customer-table-link customer-table-link--ghost">
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {selectedInvoice ? (
        <div className="customer-modal-backdrop" role="presentation" onClick={() => setSelectedInvoiceId(null)}>
          <div className="customer-modal customer-modal--invoice" role="dialog" aria-modal="true" aria-labelledby="invoice-detail-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="customer-modal__close" aria-label="Close detail" onClick={() => setSelectedInvoiceId(null)}>
              ×
            </button>

            <div className="customer-modal__content customer-modal__content--invoice">
              <div className="customer-invoice-sheet">
                <div className="customer-invoice-sheet__masthead">
                  <div className="customer-invoice-sheet__brand">
                    <img src={asset('/wp-content/uploads/2023/01/Kapa_Logo-1.svg')} alt="Kapa" />
                    <div>
                      <span className="customer-invoice-sheet__eyebrow">Kapa Auto Care Center</span>
                      <p>Customer invoice issued by accounting after repair completion.</p>
                    </div>
                  </div>

                  <div className="customer-invoice-sheet__headline">
                    <span className="customer-invoice-sheet__type">Tax Invoice</span>
                    <strong id="invoice-detail-title">{selectedInvoice.id}</strong>
                    <CustomerStatusBadge tone={selectedInvoice.statusTone}>{selectedInvoice.invoiceStatus}</CustomerStatusBadge>
                  </div>
                </div>

                <div className="customer-invoice-sheet__topline">
                  <div className="customer-invoice-sheet__garage">
                    <strong>Kapa Auto Care Center</strong>
                    <span>7011 Vermont Ave</span>
                    <span>Los Angeles, CA 90044</span>
                    <span>support@kapa-garage.com</span>
                    <span>+1 (323) 750-1234</span>
                  </div>
                  <table className="customer-invoice-sheet__meta-table">
                    <tbody>
                      <tr>
                        <td>Issued date</td>
                        <td>{selectedInvoice.issuedAt}</td>
                      </tr>
                      <tr>
                        <td>Service date</td>
                        <td>{selectedInvoice.serviceDate}</td>
                      </tr>
                      <tr>
                        <td>Repair order</td>
                        <td>{selectedInvoice.repairOrderId}</td>
                      </tr>
                      <tr>
                        <td>Booking</td>
                        <td>{selectedInvoice.bookingId ?? 'Customer record'}</td>
                      </tr>
                      <tr>
                        <td>Payment method</td>
                        <td>{selectedInvoice.paymentMethod}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="customer-invoice-sheet__parties">
                  <div className="customer-invoice-sheet__column">
                    <span className="customer-booking-card__label">Billed to</span>
                    <strong>{selectedInvoice.customerName}</strong>
                    <p>{selectedInvoice.customerAddress}</p>
                    <p>{selectedInvoice.customerPhone}</p>
                    <p>{selectedInvoice.customerEmail}</p>
                  </div>

                  <div className="customer-invoice-sheet__column">
                    <span className="customer-booking-card__label">Vehicle details</span>
                    <div className="customer-invoice-sheet__facts">
                      <div>
                        <span>Make / model</span>
                        <strong>{selectedInvoice.vehicle}</strong>
                      </div>
                      <div>
                        <span>Plate</span>
                        <strong>{selectedInvoice.plate}</strong>
                      </div>
                      <div>
                        <span>VIN</span>
                        <strong>{selectedInvoice.vin}</strong>
                      </div>
                      <div>
                        <span>Odometer</span>
                        <strong>{selectedInvoice.mileage}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="customer-invoice-sheet__table-wrap">
                  <table className="customer-invoice-sheet__table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>GST</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.serviceItems.map((item) => {
                        const gstAmount = 0
                        const lineGrandTotal = parseMoney(item.lineTotal) + gstAmount

                        return (
                          <tr key={`${selectedInvoice.id}-${item.item}`}>
                            <td>{item.item}</td>
                            <td>
                              <strong>{item.label}</strong>
                              <span>{item.description}</span>
                            </td>
                            <td className="customer-invoice-sheet__table-number">{item.quantity}</td>
                            <td className="customer-invoice-sheet__table-number">{item.unitPrice}</td>
                            <td className="customer-invoice-sheet__table-number">{formatMoney(gstAmount)}</td>
                            <td className="customer-invoice-sheet__table-number">{formatMoney(lineGrandTotal)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="customer-invoice-sheet__summary">
                  <div className="customer-invoice-sheet__note">
                    <span className="customer-booking-card__label">Payment note</span>
                    <p>{selectedInvoice.paymentNote}</p>
                    {selectedInvoice.customerNote ? <p>{selectedInvoice.customerNote}</p> : null}
                  </div>

                  <table className="customer-invoice-sheet__totals">
                    <tbody>
                      <tr>
                        <td>Subtotal</td>
                        <td>{selectedInvoice.subtotal}</td>
                      </tr>
                      <tr>
                        <td>Tax</td>
                        <td>{selectedInvoice.tax}</td>
                      </tr>
                      <tr>
                        <td>Discount</td>
                        <td>{selectedInvoice.discount}</td>
                      </tr>
                      <tr className="customer-invoice-sheet__grand-total">
                        <td>Balance Due</td>
                        <td>{selectedInvoice.total}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="customer-invoice-sheet__footer">
                  <div className="customer-invoice-sheet__footer-copy">
                    <span>Issued by {selectedInvoice.accountantName}</span>
                    <span>Thank you for choosing Kapa Auto Care Center.</span>
                  </div>

                  <div className="customer-modal__actions">
                    <button type="button" className="default-btn customer-primary-btn customer-primary-btn--ghost">
                      Download invoice
                      <span />
                    </button>
                    <button type="button" className="default-btn customer-primary-btn customer-primary-btn--ghost" onClick={() => setSelectedInvoiceId(null)}>
                      Close
                      <span />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </CustomerPageLayout>
  )
}
