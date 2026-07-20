import { forwardRef, type ReactNode } from 'react'
import { asset } from '../../lib/asset'
import { PDF_EXPORT_IGNORE_ATTRIBUTE } from '../../lib/pdf-export'
import { CustomerStatusBadge } from '../kapa-customer'

export type InvoiceDocumentStatusTone = 'completed' | 'in-progress' | 'pending' | 'ready'

export type InvoiceDocumentLineItem = {
  key: string
  code: string
  label: string
  description?: string
  kindLabel?: string | null
  addedMidRepair?: boolean
  quantity: number
  unitPrice: string
  lineTotal: string
}

export type InvoiceDocumentProps = {
  invoiceId: string
  statusLabel: string
  statusTone: InvoiceDocumentStatusTone
  tagline?: string
  issuedAt: string
  serviceDate?: string
  repairOrderId: string
  bookingLabel?: string | null
  paymentMethod: string
  customerName: string
  customerAddress?: string
  customerPhone?: string
  customerEmail?: string | null
  vehicle: string
  plate: string
  vin: string
  mileage: string
  items: InvoiceDocumentLineItem[]
  paymentNote?: string
  notes?: string[]
  subtotal: string
  discount: string
  tax: string
  total: string
  quoteBanner?: string | null
  amountPaid?: string
  showAmountPaid?: boolean
  balanceDue: string
  accountantName?: string
  footer?: ReactNode
}

// The one and only visual template for a Kapa invoice — the customer's
// invoices page, the accountant's confirm page, and any printed/PDF copy all
// render this exact markup so the "same document" is never just similar.
export const InvoiceDocument = forwardRef<HTMLDivElement, InvoiceDocumentProps>(function InvoiceDocument(
  {
    invoiceId,
    statusLabel,
    statusTone,
    tagline = 'Customer invoice issued by accounting after repair completion.',
    issuedAt,
    serviceDate,
    repairOrderId,
    bookingLabel,
    paymentMethod,
    customerName,
    customerAddress,
    customerPhone,
    customerEmail,
    vehicle,
    plate,
    vin,
    mileage,
    items,
    paymentNote,
    notes = [],
    subtotal,
    discount,
    tax,
    total,
    quoteBanner,
    amountPaid,
    showAmountPaid,
    balanceDue,
    accountantName,
    footer,
  },
  ref,
) {
  return (
    <div className="customer-invoice-sheet" ref={ref}>
      <div className="customer-invoice-sheet__masthead">
        <div className="customer-invoice-sheet__brand">
          <img src={asset('/wp-content/uploads/2023/01/Kapa_Logo-1.svg')} alt="Kapa" />
          <div>
            <span className="customer-invoice-sheet__eyebrow">Kapa Auto Care Center</span>
            <p>{tagline}</p>
          </div>
        </div>

        <div className="customer-invoice-sheet__headline">
          <span className="customer-invoice-sheet__type">Tax Invoice</span>
          <strong id="invoice-detail-title">{invoiceId}</strong>
          <CustomerStatusBadge tone={statusTone}>{statusLabel}</CustomerStatusBadge>
        </div>
      </div>

      <div className="customer-invoice-sheet__topline">
        <div className="customer-invoice-sheet__garage">
          <strong>Kapa Auto Care Center</strong>
          <span>Thon 3, Thach Hoa, Thach That, Hanoi</span>
          <span>support@kapa-garage.com</span>
          <span>+(84)848637886</span>
        </div>
        <table className="customer-invoice-sheet__meta-table">
          <tbody>
            <tr>
              <td>Issued date</td>
              <td>{issuedAt}</td>
            </tr>
            {serviceDate ? (
              <tr>
                <td>Service date</td>
                <td>{serviceDate}</td>
              </tr>
            ) : null}
            <tr>
              <td>Repair order</td>
              <td>{repairOrderId}</td>
            </tr>
            <tr>
              <td>Booking</td>
              <td>{bookingLabel ?? 'Customer record'}</td>
            </tr>
            <tr>
              <td>Payment method</td>
              <td>{paymentMethod}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="customer-invoice-sheet__parties">
        <div className="customer-invoice-sheet__column">
          <span className="customer-booking-card__label">Billed to</span>
          <strong>{customerName}</strong>
          {customerAddress ? <p>{customerAddress}</p> : null}
          {customerPhone ? <p>{customerPhone}</p> : null}
          {customerEmail ? <p>{customerEmail}</p> : null}
        </div>

        <div className="customer-invoice-sheet__column">
          <span className="customer-booking-card__label">Vehicle details</span>
          <div className="customer-invoice-sheet__facts">
            <div>
              <span>Make / model</span>
              <strong>{vehicle}</strong>
            </div>
            <div>
              <span>Plate</span>
              <strong>{plate}</strong>
            </div>
            <div>
              <span>VIN</span>
              <strong>{vin}</strong>
            </div>
            <div>
              <span>Odometer</span>
              <strong>{mileage}</strong>
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
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.key}>
                <td>{item.code}</td>
                <td>
                  <strong>{item.label}</strong>
                  {item.description ? <span>{item.description}</span> : null}
                  {item.kindLabel || item.addedMidRepair ? (
                    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {item.kindLabel ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 999,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: 'rgba(15, 14, 14, 0.06)',
                            color: 'rgba(15, 14, 14, 0.6)',
                          }}
                        >
                          {item.kindLabel}
                        </span>
                      ) : null}
                      {item.addedMidRepair ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 999,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: '#fef3c7',
                            color: '#92400e',
                          }}
                        >
                          Added mid-repair
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </td>
                <td className="customer-invoice-sheet__table-number">{item.quantity}</td>
                <td className="customer-invoice-sheet__table-number">{item.unitPrice}</td>
                <td className="customer-invoice-sheet__table-number">{item.lineTotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="customer-invoice-sheet__summary">
        <div className="customer-invoice-sheet__note">
          <span className="customer-booking-card__label">Payment note</span>
          {paymentNote ? <p>{paymentNote}</p> : null}
          {notes.map((note, index) => (
            <p key={index}>{note}</p>
          ))}
        </div>

        <table className="customer-invoice-sheet__totals">
          <tbody>
            <tr>
              <td>Subtotal</td>
              <td>{subtotal}</td>
            </tr>
            <tr>
              <td>Discount</td>
              <td>{discount}</td>
            </tr>
            <tr>
              <td>Tax</td>
              <td>{tax}</td>
            </tr>
            <tr>
              <td>Total</td>
              <td>{total}</td>
            </tr>
            {quoteBanner ? (
              <tr>
                <td colSpan={2}>
                  <div
                    style={{
                      marginTop: 8,
                      borderRadius: 10,
                      padding: '8px 12px',
                      fontSize: 12,
                      background: '#fef3c7',
                      color: '#92400e',
                    }}
                  >
                    {quoteBanner}
                  </div>
                </td>
              </tr>
            ) : null}
            {showAmountPaid && amountPaid ? (
              <tr>
                <td>Paid so far</td>
                <td>{amountPaid}</td>
              </tr>
            ) : null}
            <tr className="customer-invoice-sheet__grand-total">
              <td>Balance Due</td>
              <td>{balanceDue}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="customer-invoice-sheet__footer">
        <div className="customer-invoice-sheet__footer-copy">
          {accountantName ? <span>Issued by {accountantName}</span> : null}
          <span>Thank you for choosing Kapa Auto Care Center.</span>
        </div>

        {footer ? (
          <div className="customer-modal__actions" {...{ [PDF_EXPORT_IGNORE_ATTRIBUTE]: 'true' }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
})
