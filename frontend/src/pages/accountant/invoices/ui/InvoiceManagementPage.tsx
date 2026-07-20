import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DollarOutlined, FileTextOutlined, SearchOutlined, WalletOutlined, WarningOutlined } from '@ant-design/icons'
import { Card, Empty, Input, Progress, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth'
import { InlineBanner, StatCard } from '../../../../widgets/backoffice-shell'
import { fetchAdminSummary } from '../../../admin/dashboard/api/dashboardApi'
import { fetchRevenueReport } from '../../../admin/reports/api/reportsApi'
import {
  fetchAccountantInvoices,
  fetchCompletedRepairOrders,
  type InvoiceApiRecord,
  type RepairOrderApiRecord,
} from '../../api/accountantApi'
import { AccountantShell, accountantPalette } from '../../ui/AccountantShell'

type QueueStatus = 'Ready to bill' | 'Awaiting payment' | 'Overdue' | 'Partially paid' | 'Paid' | 'Cancelled'

type InvoiceWorkItem = {
  key: string
  kind: 'repairOrder' | 'invoice'
  id: string
  displayId: string
  repairOrderDisplayId: string
  customer: string
  contact: string
  vehicle: string
  advisor: string
  technician: string
  status: QueueStatus
  paymentMethod: string
  issuedAt: string
  dueAt: string | null
  queueNote: string
  total: number
  balanceDue: number
  sortValue: string
  searchText: string
}

// Same semantic status palette as the invoice document (InvoiceConfirmPage) — one
// consistent meaning for "paid"/"awaiting"/"overdue"/"ready"/"cancelled" across both pages.
function toneByStatus(status: QueueStatus) {
  switch (status) {
    case 'Ready to bill':
      return { bg: '#dbeafe', color: '#1e3a5f' }
    case 'Awaiting payment':
      return { bg: '#fef3c7', color: '#92400e' }
    case 'Overdue':
      return { bg: '#fee2e2', color: '#dc2626' }
    case 'Partially paid':
      return { bg: '#ede9fe', color: '#6d28d9' }
    case 'Paid':
      return { bg: '#d1fae5', color: '#047857' }
    case 'Cancelled':
      return { bg: '#f3f4f6', color: '#6b7280' }
  }
}

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

function formatVehicle(record: { brand?: string; model?: string; year?: number | null; licensePlate?: string }) {
  const primary = [record.brand, record.model, record.year].filter(Boolean).join(' ')
  if (primary && record.licensePlate) {
    return `${primary} • ${record.licensePlate}`
  }
  return primary || record.licensePlate || 'Vehicle updating'
}

function toPaymentLabel(method?: string | null) {
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

function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
}

function formatShortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(date)
}

function mapInvoiceToQueueItem(invoice: InvoiceApiRecord): InvoiceWorkItem {
  const isOpen = invoice.status !== 'paid' && invoice.status !== 'cancelled'
  const isPastDue = isOpen && !!invoice.dueAt && new Date(invoice.dueAt).getTime() < Date.now()

  const status: QueueStatus =
    invoice.status === 'paid'
      ? 'Paid'
      : invoice.status === 'cancelled'
        ? 'Cancelled'
        : isPastDue
          ? 'Overdue'
          : invoice.status === 'partiallyPaid'
            ? 'Partially paid'
            : 'Awaiting payment'

  const customer = invoice.customer?.fullName || 'Customer updating'
  const vehicle = formatVehicle({
    brand: invoice.vehicle?.brand,
    model: invoice.vehicle?.model,
    year: invoice.vehicle?.year ?? null,
    licensePlate: invoice.vehicle?.licensePlate,
  })

  let queueNote = 'Awaiting counter confirmation'
  if (status === 'Paid') {
    queueNote = 'Settled'
  } else if (status === 'Cancelled') {
    queueNote = 'Cancelled'
  } else if (status === 'Overdue' && invoice.dueAt) {
    queueNote = `Overdue by ${daysBetween(new Date(invoice.dueAt), new Date())}d`
  } else if (status === 'Partially paid') {
    queueNote = `${formatMoney(invoice.balanceDue)} remaining`
  } else if (invoice.dueAt) {
    queueNote = `Due ${formatShortDate(invoice.dueAt)}`
  }

  return {
    key: invoice.id,
    kind: 'invoice',
    id: invoice.id,
    displayId: invoice.displayId,
    repairOrderDisplayId: invoice.repairOrder?.displayId || 'Repair order pending',
    customer,
    contact: invoice.customer?.phone || '',
    vehicle,
    advisor: invoice.serviceAdvisor?.fullName || 'Service advisor updating',
    technician: invoice.technician?.fullName || 'Technician updating',
    status,
    paymentMethod: toPaymentLabel(invoice.latestPayment?.method),
    issuedAt: formatDateTime(invoice.issuedAt),
    dueAt: invoice.dueAt || null,
    queueNote,
    total: invoice.total,
    balanceDue: invoice.balanceDue,
    sortValue: invoice.issuedAt,
    searchText: [invoice.displayId, invoice.repairOrder?.displayId, customer, vehicle, invoice.vehicle?.licensePlate].filter(Boolean).join(' ').toLowerCase(),
  }
}

function mapRepairOrderToQueueItem(order: RepairOrderApiRecord): InvoiceWorkItem {
  const customer = order.vehicleId?.customerId?.fullName || 'Walk-in customer'
  const vehicle = formatVehicle({
    brand: order.vehicleId?.brand,
    model: order.vehicleId?.model,
    year: order.vehicleId?.year,
    licensePlate: order.vehicleId?.licensePlate,
  })
  const displayId = `RO-${order._id.slice(-6).toUpperCase()}`

  return {
    key: order._id,
    kind: 'repairOrder',
    id: order._id,
    displayId,
    repairOrderDisplayId: displayId,
    customer,
    contact: order.vehicleId?.customerId?.phone || '',
    vehicle,
    advisor: order.advisorId?.fullName || 'Service advisor updating',
    technician: order.technicianId?.fullName || 'Technician updating',
    status: 'Ready to bill',
    paymentMethod: 'Direct at desk',
    issuedAt: formatDateTime(order.completedAt),
    dueAt: null,
    queueNote: 'Invoice not issued',
    total: order.totalCost || 0,
    balanceDue: order.totalCost || 0,
    sortValue: order.completedAt || '',
    searchText: [displayId, customer, vehicle, order.vehicleId?.licensePlate].filter(Boolean).join(' ').toLowerCase(),
  }
}

/** Horizontal breakdown bars — same visual language as RevenueBars below, so the
 * page reads as one consistent chart system instead of mixing a donut in. */
function PaymentMixChart({
  items,
}: {
  items: Array<{ label: string; value: number; color: string }>
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0)

  if (total <= 0) {
    return <Empty description="No settled or awaiting payments yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
              <span className="text-sm font-medium" style={{ color: accountantPalette.inkSoft }}>
                {item.label}
              </span>
            </div>
            <span className="shrink-0 text-[16px] leading-none font-semibold" style={{ color: accountantPalette.ink, fontVariantNumeric: 'tabular-nums' }}>
              {item.value}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full" style={{ background: '#eef1f5' }}>
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${(item.value / total) * 100}%`, background: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Same visual formula as the horizontal bar chart on the admin dashboard. */
function RevenueBars({
  items,
  currency,
}: {
  items: Array<{ label: string; value: number; color: string }>
  currency: string
}) {
  const max = Math.max(...items.map((item) => item.value), 1)

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="truncate text-sm font-medium" style={{ color: accountantPalette.inkSoft }} title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 text-[16px] leading-none font-semibold" style={{ color: accountantPalette.ink, fontVariantNumeric: 'tabular-nums' }}>
              {formatMoney(item.value, currency)}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full" style={{ background: '#eef1f5' }}>
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function InvoiceManagementPage() {
  const { token } = useAuth()
  const [items, setItems] = useState<InvoiceWorkItem[]>([])
  const [invoicesData, setInvoicesData] = useState<InvoiceApiRecord[]>([])
  const [currency, setCurrency] = useState('VND')
  const [collectedRevenue, setCollectedRevenue] = useState(0)
  const [outstandingRevenue, setOutstandingRevenue] = useState(0)
  const [collectedToday, setCollectedToday] = useState(0)
  const [collectedThisMonth, setCollectedThisMonth] = useState(0)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [requestError, setRequestError] = useState('')

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setRequestError('')

      try {
        const now = new Date()
        const isoDate = (date: Date) => date.toISOString().slice(0, 10)
        const today = isoDate(now)
        const firstOfMonth = isoDate(new Date(now.getFullYear(), now.getMonth(), 1))

        const [summaryResponse, invoiceResponse, repairOrders, todayReport, monthReport] = await Promise.all([
          fetchAdminSummary(token),
          fetchAccountantInvoices(token),
          fetchCompletedRepairOrders(token),
          fetchRevenueReport(token, today, today),
          fetchRevenueReport(token, firstOfMonth, today),
        ])

        if (cancelled) {
          return
        }

        const invoicedRepairOrderIds = new Set(
          invoiceResponse.invoices.map((invoice) => invoice.repairOrder?.id).filter(Boolean),
        )

        const readyToBill = repairOrders
          .filter((order) => !invoicedRepairOrderIds.has(order._id))
          .map(mapRepairOrderToQueueItem)

        const invoiceItems = invoiceResponse.invoices.map(mapInvoiceToQueueItem)
        setInvoicesData(invoiceResponse.invoices)

        setItems(
          [...readyToBill, ...invoiceItems].sort((left, right) => right.sortValue.localeCompare(left.sortValue)),
        )
        setCurrency(summaryResponse.revenue.currency)
        setCollectedRevenue(summaryResponse.revenue.collected)
        setOutstandingRevenue(summaryResponse.revenue.outstanding)
        setCollectedToday(todayReport.report.totalRevenue)
        setCollectedThisMonth(monthReport.report.totalRevenue)
      } catch (error) {
        if (!cancelled) {
          setRequestError(error instanceof Error ? error.message : 'Unable to load invoice queue.')
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
  }, [token])

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) {
      return items
    }

    return items.filter((item) => item.searchText.includes(keyword))
  }, [items, search])

  const filteredTotal = useMemo(() => filteredItems.reduce((sum, item) => sum + item.total, 0), [filteredItems])

  const overviewCards = useMemo(() => {
    const readyToBill = items.filter((item) => item.status === 'Ready to bill')
    const awaitingPayment = items.filter((item) => item.status === 'Awaiting payment')
    const overdue = items.filter((item) => item.status === 'Overdue')
    const overdueTotal = overdue.reduce((sum, item) => sum + item.total, 0)
    const paid = items.filter((item) => item.status === 'Paid')

    return [
      { label: 'Invoices pending issue', value: readyToBill.length, note: `${readyToBill.length} completed orders`, tone: 'amber' as const, icon: <FileTextOutlined /> },
      { label: 'Awaiting payment', value: awaitingPayment.length, note: formatMoney(outstandingRevenue, currency), tone: 'blue' as const, icon: <ClockCircleOutlined /> },
      { label: 'Overdue', value: overdue.length, note: overdue.length > 0 ? formatMoney(overdueTotal, currency) : 'Nothing past due', tone: 'red' as const, icon: <WarningOutlined /> },
      { label: 'Paid records', value: paid.length, note: formatMoney(collectedRevenue, currency), tone: 'emerald' as const, icon: <CheckCircleOutlined /> },
      { label: 'Collected today', value: formatMoney(collectedToday, currency), note: 'Settled today', tone: 'violet' as const, icon: <CalendarOutlined /> },
      { label: 'Collected this month', value: formatMoney(collectedThisMonth, currency), note: 'Month to date', tone: 'blue' as const, icon: <DollarOutlined /> },
    ]
  }, [collectedRevenue, collectedThisMonth, collectedToday, currency, items, outstandingRevenue])

  const paymentMix = useMemo(() => {
    const counts = {
      Cash: 0,
      Card: 0,
      'Bank transfer': 0,
      'E-wallet': 0,
    }

    for (const item of items) {
      if (item.status !== 'Paid' && item.status !== 'Awaiting payment' && item.status !== 'Partially paid') {
        continue
      }

      switch (item.paymentMethod) {
        case 'Cash':
          counts.Cash += 1
          break
        case 'Card':
          counts.Card += 1
          break
        case 'Bank transfer':
          counts['Bank transfer'] += 1
          break
        case 'E-wallet':
          counts['E-wallet'] += 1
          break
        default:
          break
      }
    }

    return [
      { label: 'Cash', value: counts.Cash, color: accountantPalette.amber },
      { label: 'Card', value: counts.Card, color: accountantPalette.red },
      { label: 'Bank transfer', value: counts['Bank transfer'], color: accountantPalette.navy },
      { label: 'E-wallet', value: counts['E-wallet'], color: accountantPalette.teal },
    ].filter((item) => item.value > 0)
  }, [items])

  const serviceRevenue = useMemo(() => {
    const groups = new Map<string, number>()

    const palette = [accountantPalette.red, accountantPalette.navy, accountantPalette.amber, accountantPalette.teal]

    for (const invoice of invoicesData) {
      for (const service of invoice.repairOrder?.services || []) {
        // Group by category only — a custom/quote-typed line with no catalog
        // category must not leak its full item name in as its own "group".
        const label = service.category || 'Other'
        const current = groups.get(label) || 0
        groups.set(label, current + service.priceAtTime * service.quantity)
      }
    }

    return Array.from(groups.entries()).map(([label, value], index) => ({
      label,
      value,
      color: palette[index % palette.length],
    }))
  }, [invoicesData])

  const settlementProgress = useMemo(() => {
    const total = Math.max(items.length, 1)

    return [
      {
        label: 'Ready to bill',
        value: Math.round((items.filter((item) => item.status === 'Ready to bill').length / total) * 100),
        color: accountantPalette.teal,
      },
      {
        label: 'Awaiting payment',
        value: Math.round((items.filter((item) => item.status === 'Awaiting payment').length / total) * 100),
        color: accountantPalette.amber,
      },
      {
        label: 'Overdue',
        value: Math.round((items.filter((item) => item.status === 'Overdue').length / total) * 100),
        color: '#dc2626',
      },
      {
        label: 'Partially paid',
        value: Math.round((items.filter((item) => item.status === 'Partially paid').length / total) * 100),
        color: '#6d28d9',
      },
      {
        label: 'Paid records',
        value: Math.round((items.filter((item) => item.status === 'Paid').length / total) * 100),
        color: accountantPalette.green,
      },
    ]
  }, [items])

  const columns = useMemo<ColumnsType<InvoiceWorkItem>>(
    () => [
      {
        title: 'Invoice',
        dataIndex: 'displayId',
        key: 'displayId',
        render: (value: string, record) => (
          <div className="space-y-1">
            <div className="font-semibold" style={{ color: accountantPalette.ink }}>{value}</div>
            {record.repairOrderDisplayId !== value ? (
              <div className="text-xs" style={{ color: accountantPalette.textMuted }}>{record.repairOrderDisplayId}</div>
            ) : null}
          </div>
        ),
      },
      {
        title: 'Customer / Vehicle',
        key: 'customer',
        render: (_, record) => (
          <div className="space-y-1">
            <div className="font-medium" style={{ color: accountantPalette.inkSoft }}>{record.customer}</div>
            <div className="text-xs" style={{ color: accountantPalette.textMuted }}>{record.vehicle}</div>
            {record.contact ? (
              <div className="text-xs" style={{ color: accountantPalette.textMuted }}>{record.contact}</div>
            ) : null}
          </div>
        ),
      },
      {
        title: 'Issued / Queue',
        key: 'datetime',
        render: (_, record) => (
          <div className="space-y-1">
            <div className="font-medium" style={{ color: accountantPalette.inkSoft }}>{record.issuedAt}</div>
            <div className="text-xs" style={{ color: record.status === 'Overdue' ? '#dc2626' : accountantPalette.textMuted, fontWeight: record.status === 'Overdue' ? 600 : 400 }}>{record.queueNote}</div>
          </div>
        ),
      },
      {
        title: 'Payment',
        dataIndex: 'paymentMethod',
        key: 'paymentMethod',
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (value: QueueStatus) => {
          const tone = toneByStatus(value)
          return (
            <Tag bordered={false} className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold !uppercase !tracking-[0.16em]" style={{ background: tone.bg, color: tone.color }}>
              {value}
            </Tag>
          )
        },
      },
      {
        title: 'Total',
        dataIndex: 'total',
        key: 'total',
        render: (value: number) => <span className="font-semibold" style={{ color: accountantPalette.ink }}>{formatMoney(value, currency)}</span>,
      },
      {
        title: '',
        key: 'action',
        render: (_, record) => (
          <Link to={`/accountant/invoices/confirm?kind=${record.kind}&id=${record.id}`}>
            <span className="font-semibold" style={{ color: accountantPalette.red }}>
              {record.kind === 'repairOrder' ? 'Generate' : record.status === 'Paid' ? 'View' : 'Settle'}
            </span>
          </Link>
        ),
      },
    ],
    [currency],
  )

  return (
    <AccountantShell eyebrow="Accountant dashboard" title="Invoice management">
      <div className="gap-4 *:min-w-0" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {overviewCards.map((item, index) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={item.value}
            note={item.note}
            icon={item.icon}
            palette={accountantPalette}
            tone={item.tone}
            enterDelay={index + 1}
          />
        ))}
      </div>

      {requestError ? <InlineBanner tone="error">{requestError}</InlineBanner> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card
          bordered={false}
          className="bo-card-hover bo-enter rounded-2xl"
          styles={{ body: { padding: '4px 20px 20px' } }}
          style={{ background: accountantPalette.panel, boxShadow: accountantPalette.shadow, border: `1px solid ${accountantPalette.border}` }}
          title={
            <div className="py-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accountantPalette.textMuted }}>
                Billing queue
              </div>
              <div className="mt-1.5 text-[19px] leading-none font-semibold" style={{ color: accountantPalette.ink }}>
                Invoice issuance &amp; settlement
              </div>
            </div>
          }
          extra={
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search invoice, repair order, or plate"
              className="!rounded-full"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          }
        >
          <Table
            rowKey="key"
            columns={columns}
            dataSource={filteredItems}
            pagination={{ pageSize: 8, size: 'small' }}
            loading={isLoading}
            scroll={{ x: 1120 }}
            className="bo-table"
            summary={() =>
              filteredItems.length > 0 ? (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={5}>
                    <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: accountantPalette.textMuted }}>
                      Total · {filteredItems.length} item{filteredItems.length === 1 ? '' : 's'}
                    </span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <span className="font-bold" style={{ color: accountantPalette.ink }}>{formatMoney(filteredTotal, currency)}</span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} />
                </Table.Summary.Row>
              ) : null
            }
          />
        </Card>

        <div className="flex h-full flex-col gap-5">
          <Card
            bordered={false}
            className="bo-card-hover bo-enter bo-enter-2 flex flex-1 flex-col rounded-2xl"
            styles={{ body: { display: 'flex', flex: 1, flexDirection: 'column', padding: 20 } }}
            style={{ background: `linear-gradient(160deg, #1a1919 0%, #173a39 100%)`, boxShadow: '0 10px 32px rgba(15, 14, 14, 0.18)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Settlement health</div>
                <div className="mt-1.5 text-[19px] leading-none font-semibold text-white">Collection progress</div>
              </div>
              <WalletOutlined className="text-lg text-white/70" />
            </div>

            <div className="mt-5 flex flex-1 flex-col justify-center gap-4">
              {settlementProgress.map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-white/80">{item.label}</span>
                    <span className="text-[16px] leading-none font-semibold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {item.value}%
                    </span>
                  </div>
                  <Progress percent={item.value} strokeColor={item.color} trailColor="rgba(255,255,255,0.12)" showInfo={false} size="small" />
                </div>
              ))}
            </div>
          </Card>

          <Card
            bordered={false}
            className="bo-card-hover bo-enter bo-enter-3 rounded-2xl"
            styles={{ body: { padding: 20 } }}
            style={{ background: accountantPalette.panel, boxShadow: accountantPalette.shadow, border: `1px solid ${accountantPalette.border}` }}
          >
            <div className="mb-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accountantPalette.textMuted }}>
                Payment channels
              </div>
              <div className="mt-1.5 text-[19px] leading-none font-semibold" style={{ color: accountantPalette.ink }}>
                Method distribution
              </div>
            </div>
            <PaymentMixChart items={paymentMix} />
          </Card>
        </div>
      </div>

      <Card
        bordered={false}
        className="bo-card-hover bo-enter bo-enter-4 rounded-2xl"
        styles={{ body: { padding: 20 } }}
        style={{ background: accountantPalette.panel, boxShadow: accountantPalette.shadow, border: `1px solid ${accountantPalette.border}` }}
      >
        <div className="mb-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accountantPalette.textMuted }}>
            Financial performance
          </div>
          <div className="mt-1.5 text-[19px] leading-none font-semibold" style={{ color: accountantPalette.ink }}>
            Revenue by service group
          </div>
        </div>
        {serviceRevenue.length > 0 ? (
          <RevenueBars items={serviceRevenue} currency={currency} />
        ) : (
          <Empty description="No invoiced services yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>
    </AccountantShell>
  )
}
