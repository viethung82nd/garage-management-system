import { CheckCircleOutlined, FileSearchOutlined, PrinterOutlined, SelectOutlined, SendOutlined } from '@ant-design/icons'
import { Button, Card, Divider, Empty, Input, InputNumber, Modal, Select, Space, Tag } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth'
import { exportNodeToPdf } from '../../../../shared/lib/pdf-export'
import { InlineBanner } from '../../../../widgets/backoffice-shell'
import {
  fetchInvoiceDetail,
  fetchQuotationById,
  fetchRepairOrderDetail,
  generateInvoice,
  recordInvoicePayment,
  sendInvoiceToCustomer,
  type InvoiceApiRecord,
  type QuoteApiRecord,
  type RepairOrderApiRecord,
} from '../../api/accountantApi'
import { AccountantShell, accountantPalette } from '../../ui/AccountantShell'

type ViewState =
  | { kind: 'repairOrder'; detail: RepairOrderApiRecord }
  | { kind: 'invoice'; detail: InvoiceApiRecord }

function formatMoney(value: number, currency = 'VND') {
  if (currency === 'VND') {
    return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value)
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

function formatVehicleLabel(record: { brand?: string; model?: string; year?: number | null; licensePlate?: string }) {
  const main = [record.brand, record.model, record.year].filter(Boolean).join(' ')
  if (main && record.licensePlate) {
    return `${main} • ${record.licensePlate}`
  }
  return main || record.licensePlate || 'Vehicle updating'
}

// Semantic status colors for a finance/billing tool: green = settled, amber = pending
// action, navy = informational/ready, grey = void. Kept distinct from the brand red
// (which stays reserved for primary actions) so status never reads as "alert".
function statusTone(label: string) {
  switch (label) {
    case 'Paid':
      return { bg: '#d1fae5', color: '#047857' }
    case 'Partially paid':
      return { bg: '#ede9fe', color: '#6d28d9' }
    case 'Awaiting payment':
      return { bg: '#fef3c7', color: '#92400e' }
    case 'Overdue':
      return { bg: '#fee2e2', color: '#dc2626' }
    case 'Ready to bill':
      return { bg: '#dbeafe', color: '#1e3a5f' }
    default:
      return { bg: '#f3f4f6', color: '#6b7280' }
  }
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
      return 'Direct at desk'
  }
}

function repairOrderDisplayId(id: string) {
  return `RO-${id.slice(-6).toUpperCase()}`
}

export default function InvoiceConfirmPage() {
  const { token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const kind = searchParams.get('kind')
  const id = searchParams.get('id')
  const [viewState, setViewState] = useState<ViewState | null>(null)
  const [currency] = useState('VND')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null)
  const [paymentReference, setPaymentReference] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isPrinting, setIsPrinting] = useState(false)
  const [isSendingInvoice, setIsSendingInvoice] = useState(false)
  const [quote, setQuote] = useState<QuoteApiRecord | null>(null)
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const printableRef = useRef<HTMLDivElement>(null)

  async function handlePrintCopy() {
    if (!printableRef.current || !detailMeta) return
    setIsPrinting(true)
    try {
      await exportNodeToPdf(printableRef.current, `invoice-${detailMeta.displayId}`)
    } finally {
      setIsPrinting(false)
    }
  }

  useEffect(() => {
    setQuote(null)
    setIsQuoteModalOpen(false)
  }, [id, kind])

  useEffect(() => {
    if (!token || !kind || !id) {
      setViewState(null)
      return
    }

    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setRequestError('')
      setSuccessMessage('')

      try {
        if (kind === 'invoice') {
          const response = await fetchInvoiceDetail(token, id)
          if (cancelled) {
            return
          }
          setViewState({ kind: 'invoice', detail: response.invoice })
          setPaymentMethod(response.invoice.latestPayment?.method || 'cash')
          return
        }

        if (kind === 'repairOrder') {
          const response = await fetchRepairOrderDetail(token, id)
          if (cancelled) {
            return
          }
          setViewState({ kind: 'repairOrder', detail: response })
          setPaymentMethod('cash')
          return
        }

        if (!cancelled) {
          setRequestError('Unsupported invoice queue item.')
          setViewState(null)
        }
      } catch (error) {
        if (!cancelled) {
          setRequestError(error instanceof Error ? error.message : 'Unable to load invoice detail.')
          setViewState(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [id, kind, token])

  const detailMeta = useMemo(() => {
    if (!viewState) {
      return null
    }

    if (viewState.kind === 'repairOrder') {
      const order = viewState.detail
      return {
        eyebrow: 'Ready for billing',
        displayId: repairOrderDisplayId(order._id),
        subtitle: formatVehicleLabel({
          brand: order.vehicleId?.brand,
          model: order.vehicleId?.model,
          year: order.vehicleId?.year,
          licensePlate: order.vehicleId?.licensePlate,
        }),
        status: 'Ready to bill',
        customer: order.vehicleId?.customerId?.fullName || 'Walk-in customer',
        contact: order.vehicleId?.customerId?.phone || 'Updating',
        vehicle: formatVehicleLabel({
          brand: order.vehicleId?.brand,
          model: order.vehicleId?.model,
          year: order.vehicleId?.year,
          licensePlate: order.vehicleId?.licensePlate,
        }),
        issuedAt: formatDateTime(order.completedAt),
        dueAt: null as string | null,
        paymentMethod: 'Direct payment at service desk',
        paymentReference: null as string | null,
        serviceAdvisor: order.advisorId?.fullName || 'Service advisor updating',
        technician: order.technicianId?.fullName || 'Technician updating',
        items: order.services.map((service) => ({
          label: service.name,
          qty: service.quantity,
          amount: service.priceAtTime * service.quantity,
          kind: service.kind || 'service',
          source: service.source || 'quote',
        })),
        subtotal: order.totalCost || 0,
        discount: 0,
        taxAmount: 0,
        total: order.totalCost || 0,
        amountPaid: 0,
        balanceDue: order.totalCost || 0,
        quoteId: order.quoteId || null,
        quotedTotal: order.quotedTotal ?? null,
        sentAt: null as string | null,
      }
    }

    const invoice = viewState.detail
    const isOpen = invoice.status !== 'paid' && invoice.status !== 'cancelled'
    const isPastDue = isOpen && !!invoice.dueAt && new Date(invoice.dueAt).getTime() < Date.now()
    const status = invoice.status === 'paid'
      ? 'Paid'
      : invoice.status === 'cancelled'
        ? 'Cancelled'
        : isPastDue
          ? 'Overdue'
          : invoice.status === 'partiallyPaid'
            ? 'Partially paid'
            : 'Awaiting payment'
    return {
      eyebrow: 'Invoice detail',
      displayId: invoice.displayId,
      subtitle: formatVehicleLabel({
        brand: invoice.vehicle?.brand,
        model: invoice.vehicle?.model,
        year: invoice.vehicle?.year ?? null,
        licensePlate: invoice.vehicle?.licensePlate,
      }),
      status,
      customer: invoice.customer?.fullName || 'Customer updating',
      contact: invoice.customer?.phone || invoice.customer?.email || 'Updating',
      vehicle: formatVehicleLabel({
        brand: invoice.vehicle?.brand,
        model: invoice.vehicle?.model,
        year: invoice.vehicle?.year ?? null,
        licensePlate: invoice.vehicle?.licensePlate,
      }),
      issuedAt: formatDateTime(invoice.issuedAt),
      dueAt: invoice.dueAt || null,
      paymentMethod: paymentMethodLabel(invoice.latestPayment?.method),
      paymentReference: invoice.latestPayment?.reference || null,
      serviceAdvisor: invoice.serviceAdvisor?.fullName || 'Service advisor updating',
      technician: invoice.technician?.fullName || 'Technician updating',
      items: invoice.lineItems.map((item) => ({
        label: item.description,
        qty: item.quantity,
        amount: item.lineTotal,
        kind: item.kind || 'service',
        source: item.source || 'quote',
      })),
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      taxAmount: invoice.taxAmount || 0,
      total: invoice.total,
      amountPaid: invoice.amountPaid || 0,
      balanceDue: invoice.balanceDue,
      quoteId: invoice.quoteId || null,
      quotedTotal: invoice.quotedTotal ?? null,
      sentAt: invoice.sentAt || null,
    }
  }, [viewState])

  // Keep the payment-amount input defaulted to the current balance due —
  // resets after a partial payment so the next one defaults to what's left.
  useEffect(() => {
    setPaymentAmount(detailMeta?.balanceDue ?? null)
  }, [detailMeta?.balanceDue])

  async function handleViewQuote() {
    if (!token || !detailMeta?.quoteId) return
    setIsQuoteModalOpen(true)
    if (quote) return
    setIsLoadingQuote(true)
    try {
      const response = await fetchQuotationById(token, detailMeta.quoteId)
      setQuote(response)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to load the original quote.')
    } finally {
      setIsLoadingQuote(false)
    }
  }

  const actions = useMemo(() => {
    if (!viewState) {
      return { canGenerate: false, canSettle: false, isPaid: false, isPartiallyPaid: false }
    }

    if (viewState.kind === 'repairOrder') {
      return { canGenerate: true, canSettle: false, isPaid: false, isPartiallyPaid: false }
    }

    return {
      canGenerate: false,
      canSettle: viewState.detail.status !== 'paid' && viewState.detail.status !== 'cancelled',
      isPaid: viewState.detail.status === 'paid',
      isPartiallyPaid: viewState.detail.status === 'partiallyPaid',
    }
  }, [viewState])

  const handlePrimaryAction = async () => {
    if (!token || !viewState) {
      return
    }

    setIsSubmitting(true)
    setRequestError('')
    setSuccessMessage('')

    try {
      if (viewState.kind === 'repairOrder') {
        const response = await generateInvoice(token, viewState.detail._id)
        setSuccessMessage('Invoice generated successfully.')
        setSearchParams({
          kind: 'invoice',
          id: response.invoice.id,
        })
        return
      }

      const currentBalance = viewState.detail.balanceDue
      if (!paymentAmount || paymentAmount <= 0 || paymentAmount > currentBalance) {
        throw new Error(`Amount must be between 0 and the remaining balance (${currentBalance.toLocaleString('vi-VN')} ₫).`)
      }
      const isFullPayment = paymentAmount >= currentBalance
      await recordInvoicePayment(token, viewState.detail.id, paymentMethod, paymentAmount, paymentReference)
      setSuccessMessage(isFullPayment ? 'Payment recorded — invoice settled in full.' : 'Partial payment recorded.')
      setPaymentReference('')
      const refreshed = await fetchInvoiceDetail(token, viewState.detail.id)
      setViewState({ kind: 'invoice', detail: refreshed.invoice })
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to complete accountant action.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendInvoice = async () => {
    if (!token || !viewState || viewState.kind !== 'invoice') {
      return
    }

    setIsSendingInvoice(true)
    setRequestError('')
    setSuccessMessage('')

    try {
      const response = await sendInvoiceToCustomer(token, viewState.detail.id)
      setViewState({ kind: 'invoice', detail: response.invoice })
      setSuccessMessage('Invoice sent to the customer.')
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to send the invoice.')
    } finally {
      setIsSendingInvoice(false)
    }
  }

  return (
    <AccountantShell eyebrow="Accountant dashboard" title="Confirm invoice">
      {!kind || !id ? (
        <Card bordered={false} className="bo-enter rounded-2xl" styles={{ body: { padding: 20 } }} style={{ background: accountantPalette.panel, boxShadow: accountantPalette.shadow, border: `1px solid ${accountantPalette.border}` }}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accountantPalette.textMuted }}>
            Billing action
          </div>
          <div className="mt-1.5 text-[19px] leading-none font-semibold" style={{ color: accountantPalette.ink }}>
            Select an item from invoice management
          </div>
          <p className="mt-3 max-w-[620px] text-sm leading-6" style={{ color: accountantPalette.textMuted }}>
            Open a completed repair order to generate an invoice, or open an existing invoice to record direct payment at the service desk.
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_360px]">
          <div className="flex flex-col gap-3">
            {requestError ? <InlineBanner tone="error">{requestError}</InlineBanner> : null}
            {successMessage ? <InlineBanner tone="success">{successMessage}</InlineBanner> : null}
            {detailMeta?.quoteId ? (
              <div className="flex justify-end">
                <Button size="small" type="link" icon={<FileSearchOutlined />} onClick={handleViewQuote}>
                  View original quote
                </Button>
              </div>
            ) : null}
            <Card
              ref={printableRef}
              bordered={false}
              className="bo-enter rounded-2xl"
              loading={isLoading}
              styles={{ body: { padding: 20 } }}
              style={{ background: accountantPalette.panel, boxShadow: accountantPalette.shadow, border: `1px solid ${accountantPalette.border}` }}
            >
            {detailMeta ? (
              <>
                {/* Letterhead */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5" style={{ borderColor: accountantPalette.border }}>
                  <div>
                    <div className="text-[15px] font-bold uppercase tracking-[0.06em]" style={{ color: '#1e3a5f' }}>
                      Kapa Auto Service
                    </div>
                    <div className="mt-1 text-xs" style={{ color: accountantPalette.textMuted }}>
                      Automotive repair &amp; maintenance workshop
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: accountantPalette.textMuted }}>
                      {detailMeta.eyebrow}
                    </div>
                    <div className="mt-1 text-[22px] leading-none font-bold" style={{ color: accountantPalette.ink }}>
                      {detailMeta.displayId}
                    </div>
                    <div className="mt-1.5 text-xs" style={{ color: accountantPalette.textMuted }}>
                      Issued {detailMeta.issuedAt}
                    </div>
                    {detailMeta.dueAt ? (
                      <div className="text-xs" style={{ color: detailMeta.status === 'Overdue' ? '#dc2626' : accountantPalette.textMuted, fontWeight: detailMeta.status === 'Overdue' ? 600 : 400 }}>
                        Due {formatDateTime(detailMeta.dueAt)}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-3">
                  <Tag bordered={false} className="!rounded-full !px-4 !py-1 !text-[11px] !font-bold !uppercase !tracking-[0.18em]" style={statusTone(detailMeta.status)}>
                    {detailMeta.status}
                  </Tag>
                </div>

                {/* Bill-to / service details */}
                <div className="mt-4 grid gap-6 sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accountantPalette.textMuted }}>
                      Billed to
                    </div>
                    <div className="mt-1.5 text-sm font-semibold" style={{ color: accountantPalette.ink }}>
                      {detailMeta.customer}
                    </div>
                    <div className="mt-0.5 text-sm" style={{ color: accountantPalette.textMuted }}>
                      {detailMeta.contact}
                    </div>
                    <div className="mt-0.5 text-sm" style={{ color: accountantPalette.textMuted }}>
                      {detailMeta.vehicle}
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accountantPalette.textMuted }}>
                      Service details
                    </div>
                    <div className="mt-1.5 text-sm" style={{ color: accountantPalette.inkSoft }}>
                      Advisor: <span className="font-semibold">{detailMeta.serviceAdvisor}</span>
                    </div>
                    <div className="mt-0.5 text-sm" style={{ color: accountantPalette.inkSoft }}>
                      Technician: <span className="font-semibold">{detailMeta.technician}</span>
                    </div>
                    <div className="mt-0.5 text-sm" style={{ color: accountantPalette.inkSoft }}>
                      Payment: <span className="font-semibold">{detailMeta.paymentMethod}</span>
                      {detailMeta.paymentReference ? <span style={{ color: accountantPalette.textMuted }}> · Ref: {detailMeta.paymentReference}</span> : null}
                    </div>
                  </div>
                </div>

                {/* Itemized table */}
                <div className="mt-6 overflow-hidden rounded-xl border" style={{ borderColor: accountantPalette.border }}>
                  <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr style={{ background: accountantPalette.panelAlt }}>
                        <th className="w-10 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: accountantPalette.textMuted }}>#</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: accountantPalette.textMuted }}>Description</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: accountantPalette.textMuted }}>Qty</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: accountantPalette.textMuted }}>Unit price</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: accountantPalette.textMuted }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailMeta.items.map((item, index) => (
                        <tr key={`${item.label}-${index}`} className="border-t" style={{ borderColor: accountantPalette.border }}>
                          <td className="px-4 py-3 align-top" style={{ color: accountantPalette.textMuted, fontVariantNumeric: 'tabular-nums' }}>{index + 1}</td>
                          <td className="px-4 py-3 align-top font-medium" style={{ color: accountantPalette.inkSoft }}>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span>{item.label}</span>
                              {kindLabel(item.kind) ? (
                                <Tag bordered={false} className="!m-0 !rounded-full !px-2 !py-0 !text-[10px] !font-semibold !uppercase" style={{ background: accountantPalette.panelAlt, color: accountantPalette.textMuted }}>
                                  {kindLabel(item.kind)}
                                </Tag>
                              ) : null}
                              {item.source === 'additionalService' ? (
                                <Tag bordered={false} className="!m-0 !rounded-full !px-2 !py-0 !text-[10px] !font-semibold !uppercase" style={{ background: '#fef3c7', color: '#92400e' }}>
                                  Added mid-repair
                                </Tag>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right align-top" style={{ color: accountantPalette.textMuted, fontVariantNumeric: 'tabular-nums' }}>{item.qty}</td>
                          <td className="px-4 py-3 text-right align-top" style={{ color: accountantPalette.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                            {formatMoney(item.amount / Math.max(item.qty, 1), currency)}
                          </td>
                          <td className="px-4 py-3 text-right align-top font-semibold" style={{ color: accountantPalette.ink, fontVariantNumeric: 'tabular-nums' }}>
                            {formatMoney(item.amount, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="mt-5 flex justify-end">
                  <div className="w-full max-w-[300px] space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: accountantPalette.textMuted }}>Subtotal</span>
                      <span className="font-medium" style={{ color: accountantPalette.inkSoft, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(detailMeta.subtotal, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: accountantPalette.textMuted }}>Discount</span>
                      <span className="font-medium" style={{ color: accountantPalette.inkSoft, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(detailMeta.discount, currency)}</span>
                    </div>
                    {detailMeta.taxAmount > 0 ? (
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: accountantPalette.textMuted }}>Tax</span>
                        <span className="font-medium" style={{ color: accountantPalette.inkSoft, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(detailMeta.taxAmount, currency)}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between border-t pt-2.5" style={{ borderColor: accountantPalette.border }}>
                      <span className="text-[13px] font-semibold uppercase tracking-[0.1em]" style={{ color: accountantPalette.ink }}>Total due</span>
                      <span className="text-[22px] leading-none font-bold" style={{ color: '#1e3a5f', fontVariantNumeric: 'tabular-nums' }}>
                        {formatMoney(detailMeta.total, currency)}
                      </span>
                    </div>
                    {viewState?.kind === 'invoice' && detailMeta.quotedTotal != null && detailMeta.quotedTotal !== detailMeta.total ? (
                      <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#fef3c7', color: '#92400e' }}>
                        Quoted {formatMoney(detailMeta.quotedTotal, currency)} → Current {formatMoney(detailMeta.total, currency)}
                        {' '}({detailMeta.total > detailMeta.quotedTotal ? '+' : ''}
                        {formatMoney(detailMeta.total - detailMeta.quotedTotal, currency)} {detailMeta.total > detailMeta.quotedTotal ? 'added after quote' : 'less than quoted'})
                      </div>
                    ) : null}
                    {detailMeta.amountPaid > 0 ? (
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: accountantPalette.textMuted }}>Paid so far</span>
                        <span className="font-medium" style={{ color: '#047857', fontVariantNumeric: 'tabular-nums' }}>−{formatMoney(detailMeta.amountPaid, currency)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 border-t pt-4 text-xs" style={{ borderColor: accountantPalette.border, color: accountantPalette.textMuted }}>
                  Thank you for servicing your vehicle with us. This document is generated by Kapa Auto Service and reflects work completed under repair order {detailMeta.displayId}.
                </div>
              </>
            ) : null}
            </Card>
          </div>

          <div className="grid gap-5">
            <Card bordered={false} className="bo-enter bo-enter-2 rounded-2xl" styles={{ body: { padding: 20 } }} style={{ background: `linear-gradient(160deg, #1a1919 0%, #173a39 100%)`, boxShadow: '0 10px 32px rgba(15, 14, 14, 0.18)' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Approval</div>
                  <div className="mt-1.5 text-[19px] leading-none font-semibold text-white">
                    {actions.canGenerate ? 'Generate official invoice' : actions.isPaid ? 'Payment already settled' : actions.isPartiallyPaid ? 'Partially settled' : 'Record direct payment'}
                  </div>
                </div>
                <CheckCircleOutlined className="text-lg text-[#ffb347]" />
              </div>

              <div className="mt-5">
                <div className="rounded-xl bg-white/6 px-4 py-3 text-sm font-medium text-white/84">
                  {actions.canGenerate
                    ? 'Repair order is completed and ready for accountant billing.'
                    : actions.isPaid
                      ? 'Payment has been settled and recorded on this invoice.'
                      : actions.isPartiallyPaid
                        ? `A deposit has been recorded — ${formatMoney(detailMeta?.balanceDue || 0, currency)} still owed.`
                        : 'Record the payment method and amount the customer is settling now — a partial amount is fine.'}
                </div>
              </div>
            </Card>

            <Card bordered={false} className="bo-enter bo-enter-3 rounded-2xl" styles={{ body: { padding: 20 } }} style={{ background: accountantPalette.panel, boxShadow: accountantPalette.shadow, border: `1px solid ${accountantPalette.border}` }}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accountantPalette.textMuted }}>
                Totals
              </div>

              {actions.canSettle ? (
                <div className="mt-5 space-y-4">
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accountantPalette.textMuted }}>
                      Payment method
                    </div>
                    <Select
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                      className="!w-full"
                      options={[
                        { value: 'cash', label: 'Cash' },
                        { value: 'card', label: 'Card' },
                        { value: 'bankTransfer', label: 'Bank transfer' },
                        { value: 'eWallet', label: 'E-wallet' },
                      ]}
                    />
                  </div>
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accountantPalette.textMuted }}>
                      Amount to collect now
                    </div>
                    <InputNumber
                      value={paymentAmount}
                      onChange={setPaymentAmount}
                      min={1}
                      max={detailMeta?.balanceDue}
                      className="!w-full"
                      formatter={(value) => (value ? new Intl.NumberFormat('vi-VN').format(Number(value)) : '')}
                      parser={(value) => Number((value || '').replace(/[^\d]/g, '')) as unknown as number}
                      addonAfter="₫"
                    />
                  </div>
                  {paymentMethod !== 'cash' ? (
                    <div>
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accountantPalette.textMuted }}>
                        Transaction reference <span className="normal-case font-normal">(optional)</span>
                      </div>
                      <Input
                        value={paymentReference}
                        onChange={(event) => setPaymentReference(event.target.value)}
                        placeholder="e.g. bank transfer code"
                        maxLength={80}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              <Divider />

              {detailMeta && detailMeta.total !== detailMeta.balanceDue ? (
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span style={{ color: accountantPalette.textMuted }}>Invoice total</span>
                  <span className="font-medium" style={{ color: accountantPalette.inkSoft, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(detailMeta.total, currency)}</span>
                </div>
              ) : null}
              {detailMeta && detailMeta.amountPaid > 0 ? (
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span style={{ color: accountantPalette.textMuted }}>Paid so far</span>
                  <span className="font-medium" style={{ color: '#047857', fontVariantNumeric: 'tabular-nums' }}>−{formatMoney(detailMeta.amountPaid, currency)}</span>
                </div>
              ) : null}
              {viewState?.kind === 'invoice' && detailMeta?.quotedTotal != null && detailMeta.quotedTotal !== detailMeta.total ? (
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span style={{ color: accountantPalette.textMuted }}>Quoted</span>
                  <span className="font-medium" style={{ color: accountantPalette.inkSoft, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(detailMeta.quotedTotal, currency)}</span>
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold uppercase tracking-[0.18em]" style={{ color: accountantPalette.inkSoft }}>
                  Balance due
                </span>
                <span className="text-[26px] leading-none font-bold" style={{ color: '#1e3a5f', fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(detailMeta?.balanceDue ?? detailMeta?.total ?? 0, currency)}
                </span>
              </div>

              <Space direction="vertical" size="middle" className="mt-6 !flex">
                {(actions.canGenerate || actions.canSettle) ? (
                  <Button
                    type="primary"
                    icon={actions.canGenerate ? <CheckCircleOutlined /> : <SelectOutlined />}
                    size="large"
                    loading={isSubmitting}
                    onClick={handlePrimaryAction}
                    style={{ background: accountantPalette.red, borderColor: accountantPalette.red }}
                  >
                    {actions.canGenerate
                      ? 'Generate invoice'
                      : paymentAmount != null && detailMeta && paymentAmount < detailMeta.balanceDue
                        ? 'Record partial payment'
                        : 'Record payment in full'}
                  </Button>
                ) : (
                  <Button icon={<CheckCircleOutlined />} size="large" disabled>
                    Payment already settled
                  </Button>
                )}
                <div>
                  <Button
                    disabled={viewState?.kind !== 'invoice'}
                    icon={<SendOutlined />}
                    loading={isSendingInvoice}
                    onClick={handleSendInvoice}
                    size="large"
                    block
                  >
                    {detailMeta?.sentAt ? 'Resend invoice' : 'Send invoice to customer'}
                  </Button>
                  {detailMeta?.sentAt ? (
                    <div className="mt-1.5 truncate text-xs" style={{ color: accountantPalette.textMuted }}>
                      Last sent {formatDateTime(detailMeta.sentAt)}
                    </div>
                  ) : null}
                </div>
                <Button icon={<PrinterOutlined />} size="large" loading={isPrinting} disabled={!detailMeta} onClick={handlePrintCopy}>
                  {isPrinting ? 'Preparing PDF...' : 'Print invoice copy'}
                </Button>
              </Space>
            </Card>
          </div>
        </div>
      )}

      <Modal
        title="Original quotation"
        open={isQuoteModalOpen}
        onCancel={() => setIsQuoteModalOpen(false)}
        footer={null}
        width={560}
      >
        {isLoadingQuote ? (
          <div className="py-8 text-center text-sm" style={{ color: accountantPalette.textMuted }}>Loading quote…</div>
        ) : quote ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: accountantPalette.textMuted }}>Customer</div>
                <div className="mt-0.5 font-medium">{quote.customerName || 'Updating'}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: accountantPalette.textMuted }}>Vehicle</div>
                <div className="mt-0.5 font-medium">{[quote.vehicleName, quote.vehiclePlate].filter(Boolean).join(' • ') || 'Updating'}</div>
              </div>
            </div>
            <div className="space-y-2">
              {quote.lines.map((line, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: accountantPalette.panelAlt }}>
                  <span>{line.description || 'Line item'}{kindLabel(line.kind) ? ` (${kindLabel(line.kind)})` : ''} × {line.quantity}</span>
                  <span className="font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(line.unitPrice * line.quantity, currency)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 border-t pt-3 text-sm" style={{ borderColor: accountantPalette.border }}>
              <div className="flex items-center justify-between">
                <span style={{ color: accountantPalette.textMuted }}>Discount</span>
                <span>{quote.discountPercent}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: accountantPalette.textMuted }}>Tax</span>
                <span>{quote.taxPercent}%</span>
              </div>
              <div className="flex items-center justify-between text-base font-bold">
                <span>Quoted total</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(quote.totalEstimate, currency)}</span>
              </div>
            </div>
            {quote.note ? <div className="text-xs italic" style={{ color: accountantPalette.textMuted }}>"{quote.note}"</div> : null}
          </div>
        ) : (
          <Empty description="Quote not found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Modal>
    </AccountantShell>
  )
}
