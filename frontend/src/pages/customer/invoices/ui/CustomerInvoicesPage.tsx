import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { exportNodeToPdf } from '../../../../shared/lib/pdf-export'
import { InvoiceDocument } from '../../../../shared/ui/invoice/InvoiceDocument'
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

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}

/** A repair order/invoice can have several technicians, one per service line — join their names for display. */
function joinTechnicianNames(names: Array<string | undefined> = []) {
  const unique = [...new Set(names.filter((name): name is string => Boolean(name)))]
  return unique.length ? unique.join(', ') : 'Technician updating'
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

function kindLabel(kind?: string) {
  switch (kind) {
    case 'labor':
      return 'Labor'
    case 'part':
      return 'Part'
    default:
      return null
  }
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
  if (invoice.status === 'partiallyPaid') {
    return { label: 'Partially paid', tone: 'in-progress' as const }
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
  const [pendingDownloadId, setPendingDownloadId] = useState<string | null>(null)
  const [downloadingSelected, setDownloadingSelected] = useState(false)
  const invoiceSheetRef = useRef<HTMLDivElement>(null)

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
        mileage: invoice.vehicle?.lastKnownMileage != null ? `${new Intl.NumberFormat('en-US').format(invoice.vehicle.lastKnownMileage)} km` : 'Not recorded',
        advisor: invoice.serviceAdvisor?.fullName || 'Service advisor updating',
        technician: joinTechnicianNames(invoice.technicians?.map((tech) => tech.fullName)),
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
        tax: formatMoney(invoice.taxAmount || 0),
        discount: formatMoney(invoice.discount),
        total: formatMoney(invoice.total),
        amountPaid: formatMoney(invoice.amountPaid || 0),
        balanceDue: formatMoney(invoice.balanceDue ?? invoice.total),
        serviceItems: invoice.lineItems.map((item, index) => ({
          item: `SRV-${String(index + 1).padStart(2, '0')}`,
          label: item.description,
          description: `Service quantity ${item.quantity} approved in the repair order.`,
          quantity: item.quantity,
          unitPrice: formatMoney(item.unitPrice),
          lineTotal: formatMoney(item.lineTotal),
          kindLabel: kindLabel(item.kind),
          addedMidRepair: item.source === 'additionalService',
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
      partiallyPaid: customerInvoices.filter((invoice) => invoice.statusTone === 'in-progress').length,
      awaiting: customerInvoices.filter((invoice) => invoice.statusTone === 'pending').length,
      updated: customerInvoices.filter((invoice) => invoice.statusTone === 'ready').length,
    }),
    [customerInvoices],
  )

  const selectedInvoice = useMemo(
    () => customerInvoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [customerInvoices, selectedInvoiceId],
  )

  useEffect(() => {
    if (!selectedInvoice || pendingDownloadId !== selectedInvoice.id || !invoiceSheetRef.current) {
      return
    }
    const node = invoiceSheetRef.current
    void exportNodeToPdf(node, `invoice-${selectedInvoice.id}`).finally(() => setPendingDownloadId(null))
  }, [pendingDownloadId, selectedInvoice])

  return (
    <CustomerPageLayout title="Customer Invoices" breadcrumb="Invoices">
      <section className="customer-section">
        <CustomerAccountNav />
        <CustomerSectionHeading eyebrow="Billing Records" title="Your invoices" description="Direct invoices uploaded by Kapa accounting." compact centered />

        <div className="customer-metric-strip customer-metric-strip--four">
          <CustomerMetricCard label="Paid" value={summary.paid} />
          <CustomerMetricCard label="Partially Paid" value={summary.partiallyPaid} accent />
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
                <option value="in-progress">Partially paid</option>
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
                          <button
                            type="button"
                            className="customer-table-link customer-table-link--ghost"
                            onClick={() => {
                              setSelectedInvoiceId(invoice.id)
                              setPendingDownloadId(invoice.id)
                            }}
                          >
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
              <InvoiceDocument
                ref={invoiceSheetRef}
                invoiceId={selectedInvoice.id}
                statusLabel={selectedInvoice.invoiceStatus}
                statusTone={selectedInvoice.statusTone}
                issuedAt={selectedInvoice.issuedAt}
                serviceDate={selectedInvoice.serviceDate}
                repairOrderId={selectedInvoice.repairOrderId}
                bookingLabel={selectedInvoice.bookingId}
                paymentMethod={selectedInvoice.paymentMethod}
                customerName={selectedInvoice.customerName}
                customerAddress={selectedInvoice.customerAddress}
                customerPhone={selectedInvoice.customerPhone}
                customerEmail={selectedInvoice.customerEmail}
                vehicle={selectedInvoice.vehicle}
                plate={selectedInvoice.plate}
                vin={selectedInvoice.vin}
                mileage={selectedInvoice.mileage}
                items={selectedInvoice.serviceItems.map((item) => ({
                  key: item.item,
                  code: item.item,
                  label: item.label,
                  description: item.description,
                  kindLabel: item.kindLabel,
                  addedMidRepair: item.addedMidRepair,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  lineTotal: item.lineTotal,
                }))}
                paymentNote={selectedInvoice.paymentNote}
                notes={selectedInvoice.customerNote ? [selectedInvoice.customerNote] : []}
                subtotal={selectedInvoice.subtotal}
                discount={selectedInvoice.discount}
                tax={selectedInvoice.tax}
                total={selectedInvoice.total}
                showAmountPaid={selectedInvoice.invoiceStatus === 'Partially paid'}
                amountPaid={selectedInvoice.amountPaid}
                balanceDue={selectedInvoice.invoiceStatus !== 'Paid' ? selectedInvoice.balanceDue : formatMoney(0)}
                accountantName={selectedInvoice.accountantName}
                footer={
                  <>
                    <button
                      type="button"
                      className="default-btn customer-primary-btn customer-primary-btn--ghost"
                      disabled={downloadingSelected}
                      onClick={async () => {
                        if (!invoiceSheetRef.current) return
                        setDownloadingSelected(true)
                        try {
                          await exportNodeToPdf(invoiceSheetRef.current, `invoice-${selectedInvoice.id}`)
                        } finally {
                          setDownloadingSelected(false)
                        }
                      }}
                    >
                      {downloadingSelected ? 'Preparing PDF...' : 'Download invoice'}
                      <span />
                    </button>
                    <button type="button" className="default-btn customer-primary-btn customer-primary-btn--ghost" onClick={() => setSelectedInvoiceId(null)}>
                      Close
                      <span />
                    </button>
                  </>
                }
              />
            </div>
          </div>
        </div>
      ) : null}
    </CustomerPageLayout>
  )
}
