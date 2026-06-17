import { CheckCircleOutlined, PrinterOutlined, SelectOutlined, SendOutlined } from '@ant-design/icons'
import { Button, Card, Divider, Select, Space, Tag, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth'
import {
  fetchInvoiceDetail,
  fetchRepairOrderDetail,
  generateInvoice,
  recordInvoicePayment,
  type InvoiceApiRecord,
  type RepairOrderApiRecord,
} from '../../api/accountantApi'
import { AccountantShell, accountantPalette } from '../../ui/AccountantShell'

const { Text } = Typography

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

function statusTone(label: string) {
  switch (label) {
    case 'Paid':
      return { bg: '#dcfce7', color: '#166534' }
    case 'Awaiting payment':
      return { bg: '#fef3c7', color: '#92400e' }
    case 'Ready to bill':
      return { bg: '#dbeafe', color: '#1d4ed8' }
    default:
      return { bg: '#f3f4f6', color: '#6b7280' }
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
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

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
        paymentMethod: 'Direct payment at service desk',
        serviceAdvisor: order.advisorId?.fullName || 'Service advisor updating',
        technician: order.technicianId?.fullName || 'Technician updating',
        items: order.services.map((service) => ({
          label: service.name,
          qty: service.quantity,
          amount: service.priceAtTime * service.quantity,
        })),
        subtotal: order.totalCost || 0,
        discount: 0,
        total: order.totalCost || 0,
      }
    }

    const invoice = viewState.detail
    const status = invoice.status === 'paid' ? 'Paid' : invoice.status === 'cancelled' ? 'Cancelled' : 'Awaiting payment'
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
      paymentMethod: paymentMethodLabel(invoice.latestPayment?.method),
      serviceAdvisor: invoice.serviceAdvisor?.fullName || 'Service advisor updating',
      technician: invoice.technician?.fullName || 'Technician updating',
      items: invoice.lineItems.map((item) => ({
        label: item.description,
        qty: item.quantity,
        amount: item.lineTotal,
      })),
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      total: invoice.total,
    }
  }, [viewState])

  const actions = useMemo(() => {
    if (!viewState) {
      return { canGenerate: false, canSettle: false, isPaid: false }
    }

    if (viewState.kind === 'repairOrder') {
      return { canGenerate: true, canSettle: false, isPaid: false }
    }

    return {
      canGenerate: false,
      canSettle: viewState.detail.status !== 'paid' && viewState.detail.status !== 'cancelled',
      isPaid: viewState.detail.status === 'paid',
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

      await recordInvoicePayment(token, viewState.detail.id, paymentMethod)
      setSuccessMessage('Payment recorded successfully.')
      const refreshed = await fetchInvoiceDetail(token, viewState.detail.id)
      setViewState({ kind: 'invoice', detail: refreshed.invoice })
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to complete accountant action.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AccountantShell eyebrow="Accountant dashboard" title="Confirm invoice">
      {!kind || !id ? (
        <Card bordered={false} className="rounded-[32px]" styles={{ body: { padding: 24 } }} style={{ background: accountantPalette.panel, boxShadow: accountantPalette.shadow }}>
          <div className="text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: accountantPalette.textMuted }}>
            Billing action
          </div>
          <div className="mt-3 font-['Oswald'] text-[32px] leading-none" style={{ color: accountantPalette.ink }}>
            Select an item from invoice management
          </div>
          <p className="mt-4 max-w-[620px] text-sm leading-7" style={{ color: accountantPalette.textMuted }}>
            Open a completed repair order to generate an invoice, or open an existing invoice to record direct payment at the service desk.
          </p>
        </Card>
      ) : (
        <div
          className="gap-5"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.3fr) minmax(320px, 0.7fr)',
          }}
        >
          <Card bordered={false} className="rounded-[32px]" loading={isLoading} styles={{ body: { padding: 24 } }} style={{ background: accountantPalette.panel, boxShadow: accountantPalette.shadow }}>
            {requestError ? (
              <div className="mb-5 rounded-[18px] border px-4 py-3 text-sm font-medium" style={{ borderColor: '#fecaca', background: '#fff1f2', color: '#991b1b' }}>
                {requestError}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mb-5 rounded-[18px] border px-4 py-3 text-sm font-medium" style={{ borderColor: '#bbf7d0', background: '#f0fdf4', color: '#166534' }}>
                {successMessage}
              </div>
            ) : null}

            {detailMeta ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: accountantPalette.textMuted }}>
                      {detailMeta.eyebrow}
                    </div>
                    <div className="mt-2 font-['Oswald'] text-[32px] leading-none" style={{ color: accountantPalette.ink }}>
                      {detailMeta.displayId}
                    </div>
                    <div className="mt-2 text-sm" style={{ color: accountantPalette.textMuted }}>
                      {detailMeta.subtitle} • {detailMeta.issuedAt}
                    </div>
                  </div>

                  <Tag bordered={false} className="!rounded-full !px-4 !py-2 !text-[11px] !font-bold !uppercase !tracking-[0.18em]" style={statusTone(detailMeta.status)}>
                    {detailMeta.status}
                  </Tag>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {[
                    { label: 'Customer', value: detailMeta.customer },
                    { label: 'Contact', value: detailMeta.contact },
                    { label: 'Vehicle', value: detailMeta.vehicle },
                    { label: 'Payment method', value: detailMeta.paymentMethod },
                    { label: 'Service advisor', value: detailMeta.serviceAdvisor },
                    { label: 'Technician', value: detailMeta.technician },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[22px] border px-4 py-4" style={{ borderColor: accountantPalette.border, background: 'rgba(255,255,255,0.7)' }}>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accountantPalette.textMuted }}>
                        {item.label}
                      </div>
                      <div className="mt-2 text-sm font-semibold" style={{ color: accountantPalette.inkSoft }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                <Divider />

                <div className="space-y-4">
                  {detailMeta.items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-4 rounded-[20px] border px-4 py-4" style={{ borderColor: accountantPalette.border, background: 'rgba(255,255,255,0.72)' }}>
                      <div>
                        <div className="font-semibold" style={{ color: accountantPalette.inkSoft }}>
                          {item.label}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.14em]" style={{ color: accountantPalette.textMuted }}>
                          Qty {item.qty}
                        </div>
                      </div>
                      <div className="font-['Oswald'] text-[26px] leading-none" style={{ color: accountantPalette.ink }}>
                        {formatMoney(item.amount, currency)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </Card>

          <div className="grid gap-5">
            <Card bordered={false} className="rounded-[32px]" styles={{ body: { padding: 24 } }} style={{ background: `linear-gradient(180deg, #1a1919 0%, #173a39 100%)`, boxShadow: '0 26px 65px rgba(15, 14, 14, 0.18)' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-white/60">Approval</div>
                  <div className="mt-2 font-['Oswald'] text-[28px] leading-none text-white">
                    {actions.canGenerate ? 'Generate official invoice' : actions.isPaid ? 'Payment already settled' : 'Record direct payment'}
                  </div>
                </div>
                <CheckCircleOutlined className="text-xl text-[#ffb347]" />
              </div>

              <div className="mt-5 space-y-4">
                {[
                  actions.canGenerate ? 'Repair order has been completed and is ready for accountant billing.' : 'Invoice values were generated from the approved repair order.',
                  'Customer will settle directly at the service desk or by confirmed bank transfer.',
                  'Payment records should match the method agreed with the customer.',
                ].map((item) => (
                  <div key={item} className="rounded-[18px] bg-white/6 px-4 py-3 text-sm font-medium text-white/84">
                    {item}
                  </div>
                ))}
              </div>
            </Card>

            <Card bordered={false} className="rounded-[32px]" styles={{ body: { padding: 24 } }} style={{ background: accountantPalette.panel, boxShadow: accountantPalette.shadow }}>
              <div className="flex items-center justify-between">
                <Text className="!text-[12px] !font-semibold !uppercase !tracking-[0.18em]" style={{ color: accountantPalette.textMuted }}>
                  Totals
                </Text>
                <span className="font-['Oswald'] text-[20px]" style={{ color: accountantPalette.ink }}>
                  Summary
                </span>
              </div>

              {actions.canSettle ? (
                <div className="mt-5">
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
              ) : null}

              <div className="mt-5 space-y-4">
                {detailMeta
                  ? [
                      ['Subtotal', detailMeta.subtotal],
                      ['Discount', detailMeta.discount],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span style={{ color: accountantPalette.textMuted }}>{label}</span>
                        <span className="font-semibold" style={{ color: accountantPalette.inkSoft }}>{formatMoney(Number(value), currency)}</span>
                      </div>
                    ))
                  : null}
              </div>

              <Divider />

              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold uppercase tracking-[0.18em]" style={{ color: accountantPalette.inkSoft }}>
                  Grand total
                </span>
                <span className="font-['Oswald'] text-[34px] leading-none" style={{ color: accountantPalette.red }}>
                  {formatMoney(detailMeta?.total || 0, currency)}
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
                    {actions.canGenerate ? 'Generate invoice' : 'Record payment'}
                  </Button>
                ) : (
                  <Button icon={<CheckCircleOutlined />} size="large" disabled>
                    Payment already settled
                  </Button>
                )}
                <Button icon={<SendOutlined />} size="large">
                  Send invoice to customer
                </Button>
                <Button icon={<PrinterOutlined />} size="large">
                  Print invoice copy
                </Button>
              </Space>
            </Card>
          </div>
        </div>
      )}
    </AccountantShell>
  )
}
