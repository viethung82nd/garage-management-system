import { DollarOutlined, FileDoneOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Input, Progress, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth'
import { fetchAdminSummary } from '../../../admin/dashboard/api/dashboardApi'
import {
  fetchAccountantInvoices,
  fetchCompletedRepairOrders,
  type InvoiceApiRecord,
  type RepairOrderApiRecord,
} from '../../api/accountantApi'
import { AccountantShell, accountantPalette } from '../../ui/AccountantShell'

const { Text } = Typography

type QueueStatus = 'Ready to bill' | 'Awaiting payment' | 'Paid' | 'Cancelled'

type InvoiceWorkItem = {
  key: string
  kind: 'repairOrder' | 'invoice'
  id: string
  displayId: string
  repairOrderDisplayId: string
  customer: string
  vehicle: string
  advisor: string
  technician: string
  status: QueueStatus
  paymentMethod: string
  issuedAt: string
  dueAt: string
  total: number
  sortValue: string
  searchText: string
}

function toneByStatus(status: QueueStatus) {
  switch (status) {
    case 'Ready to bill':
      return { bg: '#dbeafe', color: '#1d4ed8' }
    case 'Awaiting payment':
      return { bg: '#fef3c7', color: '#92400e' }
    case 'Paid':
      return { bg: '#dcfce7', color: '#166534' }
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

function formatCompactMoney(value: number, currency = 'VND') {
  if (currency === 'VND') {
    return `${new Intl.NumberFormat('vi-VN', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)} ₫`
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
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

function mapInvoiceToQueueItem(invoice: InvoiceApiRecord): InvoiceWorkItem {
  const status: QueueStatus =
    invoice.status === 'paid' ? 'Paid' : invoice.status === 'cancelled' ? 'Cancelled' : 'Awaiting payment'

  const customer = invoice.customer?.fullName || 'Customer updating'
  const vehicle = formatVehicle({
    brand: invoice.vehicle?.brand,
    model: invoice.vehicle?.model,
    year: invoice.vehicle?.year ?? null,
    licensePlate: invoice.vehicle?.licensePlate,
  })

  return {
    key: invoice.id,
    kind: 'invoice',
    id: invoice.id,
    displayId: invoice.displayId,
    repairOrderDisplayId: invoice.repairOrder?.displayId || 'Repair order pending',
    customer,
    vehicle,
    advisor: invoice.serviceAdvisor?.fullName || 'Service advisor updating',
    technician: invoice.technician?.fullName || 'Technician updating',
    status,
    paymentMethod: toPaymentLabel(invoice.latestPayment?.method),
    issuedAt: formatDateTime(invoice.issuedAt),
    dueAt: status === 'Paid' ? 'Settled' : 'Awaiting counter confirmation',
    total: invoice.total,
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
    vehicle,
    advisor: order.advisorId?.fullName || 'Service advisor updating',
    technician: order.technicianId?.fullName || 'Technician updating',
    status: 'Ready to bill',
    paymentMethod: 'Direct at desk',
    issuedAt: formatDateTime(order.completedAt),
    dueAt: 'Invoice not issued',
    total: order.totalCost || 0,
    sortValue: order.completedAt || '',
    searchText: [displayId, customer, vehicle, order.vehicleId?.licensePlate].filter(Boolean).join(' ').toLowerCase(),
  }
}

function MetricCard({
  label,
  value,
  delta,
  tone,
}: {
  label: string
  value: string | number
  delta: string
  tone: 'emerald' | 'blue' | 'amber' | 'violet'
}) {
  const toneMap = {
    emerald: { accent: accountantPalette.green, soft: 'rgba(47, 143, 99, 0.14)' },
    blue: { accent: accountantPalette.navy, soft: 'rgba(31, 54, 92, 0.14)' },
    amber: { accent: '#c67a00', soft: 'rgba(255, 179, 71, 0.18)' },
    violet: { accent: accountantPalette.violet, soft: 'rgba(138, 63, 252, 0.14)' },
  } as const

  const currentTone = toneMap[tone]

  return (
    <Card bordered={false} styles={{ body: { padding: 0 } }} className="overflow-hidden rounded-[28px]" style={{ background: `linear-gradient(135deg, ${accountantPalette.panel} 0%, ${accountantPalette.panelAlt} 100%)`, boxShadow: accountantPalette.shadow }}>
      <div className="relative overflow-hidden p-5">
        <div className="absolute right-[-32px] top-[-32px] h-28 w-28 rounded-full" style={{ background: currentTone.soft }} />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <Text className="!text-[11px] !font-semibold !uppercase !tracking-[0.18em]" style={{ color: accountantPalette.textMuted }}>
              {label}
            </Text>
            <div className="mt-2 font-['Oswald'] text-[34px] leading-none md:text-[38px]" style={{ color: accountantPalette.ink }}>
              {value}
            </div>
          </div>
          <div className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ background: currentTone.soft, color: currentTone.accent }}>
            {delta}
          </div>
        </div>
      </div>
    </Card>
  )
}

function PaymentMixChart({
  items,
}: {
  items: Array<{ label: string; value: number; color: string }>
}) {
  const total = Math.max(items.reduce((sum, item) => sum + item.value, 0), 1)
  let currentOffset = 0

  return (
    <div className="grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-center">
      <div className="relative mx-auto h-[180px] w-[180px]">
        <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
          <circle cx="110" cy="110" r="72" fill="none" stroke="rgba(15,14,14,0.08)" strokeWidth="24" />
          {items.map((item) => {
            const dash = (item.value / total) * 452.39
            const circle = (
              <circle
                key={item.label}
                cx="110"
                cy="110"
                r="72"
                fill="none"
                stroke={item.color}
                strokeWidth="24"
                strokeDasharray={`${dash} 452.39`}
                strokeDashoffset={-currentOffset}
                strokeLinecap="round"
              />
            )
            currentOffset += dash
            return circle
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="font-['Oswald'] text-[34px] leading-none" style={{ color: accountantPalette.ink }}>
            {total}
          </div>
          <div className="mt-2 text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: accountantPalette.textMuted }}>
            Payment records
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.7)' }}>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ background: item.color }} />
              <span className="text-sm font-semibold" style={{ color: accountantPalette.inkSoft }}>
                {item.label}
              </span>
            </div>
            <span className="font-['Oswald'] text-[28px] leading-none" style={{ color: accountantPalette.ink }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RevenueBars({
  items,
  currency,
}: {
  items: Array<{ label: string; value: number; color: string }>
  currency: string
}) {
  const max = Math.max(...items.map((item) => item.value), 1)

  return (
    <div className="space-y-5">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="text-sm font-semibold" style={{ color: accountantPalette.inkSoft }}>
              {item.label}
            </span>
            <span className="font-['Oswald'] text-[24px] leading-none" style={{ color: accountantPalette.ink }}>
              {formatCompactMoney(item.value, currency)}
            </span>
          </div>
          <div className="h-4 overflow-hidden rounded-full" style={{ background: 'rgba(15,14,14,0.12)', boxShadow: 'inset 0 1px 2px rgba(15,14,14,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: `linear-gradient(90deg, ${item.color} 0%, ${accountantPalette.ink} 100%)`,
                boxShadow: `0 8px 18px ${item.color}45`,
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
        const [summaryResponse, invoiceResponse, repairOrders] = await Promise.all([
          fetchAdminSummary(token),
          fetchAccountantInvoices(token),
          fetchCompletedRepairOrders(token),
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

  const overviewCards = useMemo(() => {
    const readyToBill = items.filter((item) => item.status === 'Ready to bill')
    const awaitingPayment = items.filter((item) => item.status === 'Awaiting payment')
    const paid = items.filter((item) => item.status === 'Paid')

    return [
      { label: 'Invoices pending issue', value: readyToBill.length, delta: `${readyToBill.length} completed orders`, tone: 'amber' as const },
      { label: 'Awaiting payment', value: awaitingPayment.length, delta: formatCompactMoney(outstandingRevenue, currency), tone: 'blue' as const },
      { label: 'Paid records', value: paid.length, delta: formatCompactMoney(collectedRevenue, currency), tone: 'emerald' as const },
      { label: 'Billing queue', value: items.length, delta: `${filteredItems.length} visible`, tone: 'violet' as const },
    ]
  }, [collectedRevenue, currency, filteredItems.length, items, outstandingRevenue])

  const paymentMix = useMemo(() => {
    const counts = {
      Cash: 0,
      Card: 0,
      'Bank transfer': 0,
      'E-wallet': 0,
    }

    for (const item of items) {
      if (item.status !== 'Paid' && item.status !== 'Awaiting payment') {
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
      { label: 'Cash', value: counts.Cash, color: '#ffb347' },
      { label: 'Card', value: counts.Card, color: '#f51304' },
      { label: 'Bank transfer', value: counts['Bank transfer'], color: '#1f365c' },
      { label: 'E-wallet', value: counts['E-wallet'], color: '#197b74' },
    ]
  }, [items])

  const serviceRevenue = useMemo(() => {
    const groups = new Map<string, number>()

    const palette = ['#f51304', '#1f365c', '#ffb347', '#197b74']

    for (const invoice of invoicesData) {
      for (const service of invoice.repairOrder?.services || []) {
        const label = service.category || service.name
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
        color: accountantPalette.red,
      },
      {
        label: 'Paid records',
        value: Math.round((items.filter((item) => item.status === 'Paid').length / total) * 100),
        color: accountantPalette.amber,
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
            <div className="text-xs" style={{ color: accountantPalette.textMuted }}>{record.repairOrderDisplayId}</div>
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
          </div>
        ),
      },
      {
        title: 'Ops owner',
        key: 'owner',
        render: (_, record) => (
          <div className="space-y-1">
            <div className="text-sm font-medium" style={{ color: accountantPalette.inkSoft }}>{record.advisor}</div>
            <div className="text-xs" style={{ color: accountantPalette.textMuted }}>{record.technician}</div>
          </div>
        ),
      },
      {
        title: 'Issued / Queue',
        key: 'datetime',
        render: (_, record) => (
          <div className="space-y-1">
            <div className="font-medium" style={{ color: accountantPalette.inkSoft }}>{record.issuedAt}</div>
            <div className="text-xs" style={{ color: accountantPalette.textMuted }}>{record.dueAt}</div>
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
            <Button type="primary" size="small" style={{ background: accountantPalette.red, borderColor: accountantPalette.red }}>
              {record.kind === 'repairOrder' ? 'Generate' : record.status === 'Paid' ? 'View' : 'Settle'}
            </Button>
          </Link>
        ),
      },
    ],
    [currency],
  )

  return (
    <AccountantShell eyebrow="Accountant dashboard" title="Invoice management">
      <div
        className="gap-4"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        {overviewCards.map((item) => (
          <MetricCard key={item.label} label={item.label} value={item.value} delta={item.delta} tone={item.tone} />
        ))}
      </div>

      {requestError ? (
        <div
          className="rounded-[22px] border px-5 py-4 text-sm font-medium"
          style={{ borderColor: '#fecaca', background: '#fff1f2', color: '#991b1b' }}
        >
          {requestError}
        </div>
      ) : null}

      <div
        className="gap-5"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.55fr) minmax(320px, 0.95fr)',
        }}
      >
        <Card
          bordered={false}
          className="rounded-[32px]"
          styles={{ body: { padding: 20 } }}
          style={{ background: accountantPalette.panel, boxShadow: accountantPalette.shadow }}
          title={
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: accountantPalette.textMuted }}>
                Billing queue
              </div>
              <div className="mt-2 font-['Oswald'] text-[30px] leading-none" style={{ color: accountantPalette.ink }}>
                Invoice issuance & settlement
              </div>
            </div>
          }
          extra={
            <Space>
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search invoice, repair order, or plate"
                className="!rounded-full"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button type="primary" icon={<FileDoneOutlined />} style={{ background: accountantPalette.red, borderColor: accountantPalette.red }}>
                Review queue
              </Button>
            </Space>
          }
        >
          <Table rowKey="key" columns={columns} dataSource={filteredItems} pagination={false} loading={isLoading} scroll={{ x: 1120 }} className="bo-table" />
        </Card>

        <div className="grid gap-5">
          <Card bordered={false} className="rounded-[32px]" styles={{ body: { padding: 20 } }} style={{ background: `linear-gradient(180deg, #1a1919 0%, #173a39 100%)`, boxShadow: '0 26px 65px rgba(15, 14, 14, 0.18)' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-white/60">Settlement health</div>
                <div className="mt-2 font-['Oswald'] text-[28px] leading-none text-white">Collection progress</div>
              </div>
              <DollarOutlined className="text-xl text-[#ffb347]" />
            </div>

            <div className="mt-5 space-y-4">
              {settlementProgress.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-white/88">{item.label}</span>
                    <span className="font-['Oswald'] text-[22px] leading-none text-white">{item.value}%</span>
                  </div>
                  <Progress percent={Number(item.value)} strokeColor={item.color} trailColor="rgba(255,255,255,0.1)" showInfo={false} />
                </div>
              ))}
            </div>
          </Card>

          <Card bordered={false} className="rounded-[32px]" styles={{ body: { padding: 20 } }} style={{ background: accountantPalette.panel, boxShadow: accountantPalette.shadow }}>
            <div className="mb-5">
              <div className="text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: accountantPalette.textMuted }}>
                Payment channels
              </div>
              <div className="mt-2 font-['Oswald'] text-[28px] leading-none" style={{ color: accountantPalette.ink }}>
                Method distribution
              </div>
            </div>
            <PaymentMixChart items={paymentMix} />
          </Card>
        </div>
      </div>

      <Card bordered={false} className="rounded-[32px]" styles={{ body: { padding: 20 } }} style={{ background: accountantPalette.panel, boxShadow: accountantPalette.shadow }}>
        <div className="mb-5">
          <div className="text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: accountantPalette.textMuted }}>
            Financial performance
          </div>
          <div className="mt-2 font-['Oswald'] text-[28px] leading-none" style={{ color: accountantPalette.ink }}>
            Revenue by service group
          </div>
        </div>
        <RevenueBars
          items={
            serviceRevenue.length > 0
              ? serviceRevenue
              : [{ label: 'Awaiting invoice activity', value: 0, color: '#f51304' }]
          }
          currency={currency}
        />
      </Card>
    </AccountantShell>
  )
}
