import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, WalletOutlined } from '@ant-design/icons'
import { Button, Card, Empty, Progress, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../../../../shared/auth'
import { InlineBanner, useCountUp } from '../../../../widgets/backoffice-shell'
import { fetchAdminBookings, fetchAdminDailyIntake, fetchAdminSummary, type AdminSummaryResponse } from '../api/dashboardApi'
import { fetchRevenueReport, type RevenueReport } from '../../reports/api/reportsApi'
import { AdminShell, adminPalette } from '../../ui/AdminShell'

const { Text } = Typography
const dashboardPalette = adminPalette

type BookingStatus = 'Pending' | 'Confirmed' | 'In Service' | 'Completed' | 'Cancelled'

type BookingRecord = {
  key: string
  customer: string
  vehicle: string
  service: string
  date: string
  time: string
  status: BookingStatus
  channel: 'Guest' | 'Customer' | 'Walk-in'
  amount: number
}

const CHART_COLOR_CYCLE = [dashboardPalette.red, dashboardPalette.navy, dashboardPalette.amber, dashboardPalette.teal, dashboardPalette.green]

function statusTagColor(status: BookingRecord['status']) {
  switch (status) {
    case 'Pending':
      return '#ffedd5'
    case 'Confirmed':
      return '#dbeafe'
    case 'In Service':
      return '#d1fae5'
    case 'Completed':
      return '#dcfce7'
    case 'Cancelled':
      return '#f3f4f6'
    default:
      return '#f3f4f6'
  }
}

function statusTextColor(status: BookingRecord['status']) {
  switch (status) {
    case 'Pending':
      return '#9a3412'
    case 'Confirmed':
      return '#1d4ed8'
    case 'In Service':
      return '#0f766e'
    case 'Completed':
      return '#166534'
    case 'Cancelled':
      return '#6b7280'
    default:
      return '#6b7280'
  }
}

function channelTone(channel: BookingRecord['channel']) {
  switch (channel) {
    case 'Guest':
      return { bg: '#fee2e2', color: '#b91c1c' }
    case 'Customer':
      return { bg: '#dbeafe', color: '#1d4ed8' }
    case 'Walk-in':
      return { bg: '#fef3c7', color: '#92400e' }
    default:
      return { bg: '#f3f4f6', color: '#6b7280' }
  }
}

// Full digit groups, not compact notation ("1,8 Tr ₫") — compact notation
// abbreviates using Vietnamese words (N = nghìn, Tr = triệu), which reads as
// a typo/garbled currency to anyone not expecting it.
function formatCurrency(value: number, currency: string) {
  if (currency === 'VND') {
    return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatBookingDate(value: string) {
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

function mapBookingStatus(status: string): BookingRecord['status'] {
  switch (status) {
    case 'confirmed':
      return 'Confirmed'
    case 'completed':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
    case 'pending':
      return 'Pending'
    default:
      return 'Confirmed'
  }
}

function mapBookingChannel(source?: string, accountType?: string): BookingRecord['channel'] {
  if (source === 'walkIn' || accountType === 'walkIn') {
    return 'Walk-in'
  }

  return 'Customer'
}

function mapBookingRecordFromApi(
  booking: Awaited<ReturnType<typeof fetchAdminBookings>>['bookings'][number],
): BookingRecord {
  const vehicleLabel = [booking.vehicleId?.brand, booking.vehicleId?.model, booking.vehicleId?.year]
    .filter(Boolean)
    .join(' ')

  return {
    key: `BK-${booking._id.slice(-6).toUpperCase()}`,
    customer: booking.customerId?.fullName || 'Walk-in customer',
    vehicle: vehicleLabel || booking.vehicleId?.licensePlate || 'Vehicle updating',
    service: booking.serviceId?.name || booking.note || 'Service advisor intake',
    date: formatBookingDate(booking.bookingDate),
    time: booking.timeSlot,
    status: mapBookingStatus(booking.status),
    channel: mapBookingChannel(booking.source, booking.customerId?.accountType),
    amount: booking.serviceId?.basePrice || 0,
  }
}

function DashboardMetricCard({
  label,
  value,
  delta,
  tone,
  icon,
  enterDelay,
}: {
  label: string
  value: string | number
  delta: string
  tone: 'emerald' | 'blue' | 'amber' | 'violet'
  icon: ReactNode
  enterDelay: number
}) {
  const toneMap = {
    emerald: dashboardPalette.green,
    blue: dashboardPalette.navy,
    amber: dashboardPalette.amber,
    violet: '#7c3aed',
  } as const

  const accent = toneMap[tone]
  const displayValue = useCountUp(value)

  return (
    <Card
      bordered={false}
      styles={{ body: { padding: 20 } }}
      className={`bo-card-hover bo-enter bo-enter-${enterDelay} overflow-hidden rounded-2xl`}
      style={{
        background: dashboardPalette.panel,
        boxShadow: dashboardPalette.shadow,
        border: `1px solid ${dashboardPalette.border}`,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div
            className="text-[28px] leading-none font-bold md:text-[30px]"
            style={{ color: accent, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
          >
            {displayValue}
          </div>
          <Text
            className="!mt-2 !block !text-[13px] !leading-[1.3] !font-medium"
            style={{ color: dashboardPalette.textMuted }}
          >
            {label}
          </Text>
          <div className="mt-1 text-xs" style={{ color: dashboardPalette.textMuted }}>
            {delta}
          </div>
        </div>
        <span className="shrink-0 text-[42px] leading-none" style={{ color: accent }}>
          {icon}
        </span>
      </div>
    </Card>
  )
}

type ChartSlice = { label: string; value: number; color: string }

function DonutChart({
  data,
  centerLabel,
  formatValue = (value: number) => String(value),
}: {
  data: ChartSlice[]
  centerLabel: string
  formatValue?: (value: number) => string
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let currentOffset = 0

  if (!data.length || total <= 0) {
    return <Empty description="No completed orders in this period yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    // Stacked, not a side-by-side grid: the two cards in this row are packed
    // by `auto-fit, minmax(320px, 1fr)`, so card width depends on how many
    // siblings fit the *viewport*, not on the viewport breakpoint itself —a
    // `lg:` 2-column split fired even when the card itself was squeezed down
    // to ~300px, forcing the legend into a column too narrow for its
    // currency values (which can't shrink) and pushing them past the card
    // edge. Full-width stacking is correct at every card width.
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
          <circle cx="110" cy="110" r="72" fill="none" stroke="#eef1f5" strokeWidth="22" />
          {data.map((item) => {
            const dash = (item.value / total) * 452.39
            const circle = (
              <circle
                key={item.label}
                cx="110"
                cy="110"
                r="72"
                fill="none"
                stroke={item.color}
                strokeWidth="22"
                strokeDasharray={`${dash} 452.39`}
                strokeDashoffset={-currentOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            )
            currentOffset += dash
            return circle
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-[18px] leading-none font-semibold" style={{ color: dashboardPalette.ink, fontVariantNumeric: 'tabular-nums' }}>
            {formatValue(total)}
          </div>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: dashboardPalette.textMuted }}>
            {centerLabel}
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 space-y-2">
        {data.map((item) => (
          <div
            key={item.label}
            className="flex min-w-0 items-center justify-between gap-4 rounded-xl px-4 py-2.5 transition-colors duration-150 hover:bg-black/3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
              <span className="truncate text-sm font-medium" style={{ color: dashboardPalette.inkSoft }} title={item.label}>
                {item.label}
              </span>
            </div>
            <span className="shrink-0 text-[16px] leading-none font-semibold" style={{ color: dashboardPalette.ink, fontVariantNumeric: 'tabular-nums' }}>
              {formatValue(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function VerticalBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((item) => item.value))
  const peakValue = Math.max(...data.map((item) => item.value))

  return (
    <div className="rounded-xl border px-4 pb-3 pt-4" style={{ borderColor: dashboardPalette.border, background: '#fafbfc' }}>
      {/* Fixed column count squeezes unreadably narrow on small screens once
          columns drop below ~56px — scroll horizontally instead of shrinking
          bars/labels past legibility. */}
      <div className="overflow-x-auto">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${data.length}, minmax(56px, 1fr))`,
            alignItems: 'end',
            gap: '12px',
            height: '220px',
            minWidth: data.length * 68,
          }}
        >
          {data.map((item) => {
          const height = `${(item.value / max) * 100}%`
          const isPeak = item.value > 0 && item.value === peakValue
          const accent = isPeak ? dashboardPalette.red : dashboardPalette.navy

          return (
            <div key={item.label} className="flex h-full flex-col justify-end">
              <div className="mb-2 text-center text-[14px] leading-none font-semibold" style={{ color: dashboardPalette.ink, fontVariantNumeric: 'tabular-nums' }}>
                {item.value}
              </div>
              <div className="flex h-[150px] items-end">
                <div
                  className="w-full rounded-t-[10px] transition-transform duration-300 ease-out hover:-translate-y-1"
                  style={{
                    minHeight: item.value > 0 ? '20px' : '2px',
                    height,
                    background: accent,
                    opacity: isPeak ? 1 : 0.82,
                  }}
                />
              </div>
              <div className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: dashboardPalette.textMuted }}>
                {item.label}
              </div>
            </div>
          )
          })}
        </div>
      </div>
    </div>
  )
}

function HorizontalBarChart({ data }: { data: ChartSlice[] }) {
  if (!data.length) {
    return <Empty description="No completed orders in this period yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="truncate text-sm font-medium" style={{ color: dashboardPalette.inkSoft }} title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 text-[16px] leading-none font-semibold" style={{ color: dashboardPalette.ink, fontVariantNumeric: 'tabular-nums' }}>
              {item.value}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full" style={{ background: '#eef1f5' }}>
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${item.value}%`,
                background: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

const OVERVIEW_CARD_META = [
  { key: 'total', label: 'Total bookings', tone: 'blue' as const, icon: <CalendarOutlined /> },
  { key: 'pending', label: 'Pending bookings', tone: 'amber' as const, icon: <ClockCircleOutlined /> },
  { key: 'completed', label: 'Completed visits', tone: 'emerald' as const, icon: <CheckCircleOutlined /> },
  { key: 'outstanding', label: 'Outstanding invoices', tone: 'violet' as const, icon: <WalletOutlined /> },
]

export default function AdminDashboardPage() {
  const { token } = useAuth()
  const [summary, setSummary] = useState<AdminSummaryResponse | null>(null)
  const [tableRows, setTableRows] = useState<BookingRecord[]>([])
  const [revenueReport, setRevenueReport] = useState<RevenueReport | null>(null)
  const [dailyIntake, setDailyIntake] = useState<{ date: string; count: number }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [requestError, setRequestError] = useState('')

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false

    const loadDashboard = async () => {
      setIsLoading(true)
      setRequestError('')

      try {
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 29)
        const isoDate = (date: Date) => date.toISOString().slice(0, 10)

        const [summaryResponse, bookingsResponse, revenueResponse, dailyIntakeResponse] = await Promise.all([
          fetchAdminSummary(token),
          fetchAdminBookings(token),
          fetchRevenueReport(token, isoDate(start), isoDate(end)),
          fetchAdminDailyIntake(token, 7),
        ])

        if (cancelled) {
          return
        }

        setSummary(summaryResponse)
        setTableRows(bookingsResponse.bookings.map(mapBookingRecordFromApi))
        setRevenueReport(revenueResponse.report)
        setDailyIntake(dailyIntakeResponse.days)
      } catch (error) {
        if (!cancelled) {
          setRequestError(error instanceof Error ? error.message : 'Unable to load dashboard data.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [token])

  const overviewCards = useMemo(() => {
    if (!summary) {
      return OVERVIEW_CARD_META.map((meta) => ({ ...meta, value: '—', delta: 'Loading…' }))
    }

    const { total, today, byStatus } = summary.bookings
    const values: Record<string, { value: string | number; delta: string }> = {
      total: { value: total, delta: `Today ${today}` },
      pending: { value: byStatus.pending || 0, delta: `Confirmed ${byStatus.confirmed || 0}` },
      completed: { value: byStatus.completed || 0, delta: `Cancelled ${byStatus.cancelled || 0}` },
      outstanding: {
        value: formatCurrency(summary.revenue.outstanding, summary.revenue.currency),
        delta: `Collected ${formatCurrency(summary.revenue.collected, summary.revenue.currency)}`,
      },
    }

    return OVERVIEW_CARD_META.map((meta) => ({ ...meta, ...values[meta.key] }))
  }, [summary])

  const serviceMixData = useMemo<ChartSlice[]>(() => {
    const byService = revenueReport?.byService ?? []
    return byService
      .filter((row) => row.revenue > 0)
      .slice(0, 6)
      .map((row, index) => ({
        label: row.serviceName || 'Unnamed service',
        value: row.revenue,
        color: CHART_COLOR_CYCLE[index % CHART_COLOR_CYCLE.length],
      }))
  }, [revenueReport])

  const technicianLoadData = useMemo<ChartSlice[]>(() => {
    const byTechnician = revenueReport?.byTechnician ?? []
    return byTechnician.slice(0, 6).map((row, index) => ({
      label: row.technicianName || 'Unassigned',
      value: Math.round(row.completionRate * 100),
      color: CHART_COLOR_CYCLE[index % CHART_COLOR_CYCLE.length],
    }))
  }, [revenueReport])

  const dailyTrafficData = useMemo(
    () =>
      dailyIntake.map((day) => ({
        label: new Date(`${day.date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
        value: day.count,
      })),
    [dailyIntake],
  )

  const statusProgress = useMemo(() => {
    if (!summary) {
      return [
        { label: 'Pending', value: 0, color: '#f59e0b' },
        { label: 'Confirmed', value: 0, color: '#2563eb' },
        { label: 'Completed', value: 0, color: '#10b981' },
        { label: 'Cancelled', value: 0, color: '#8b5cf6' },
      ]
    }

    const total = Math.max(summary.bookings.total, 1)
    const byStatus = summary.bookings.byStatus

    return [
      { label: 'Pending', value: Math.round(((byStatus.pending || 0) / total) * 100), color: '#f59e0b' },
      { label: 'Confirmed', value: Math.round(((byStatus.confirmed || 0) / total) * 100), color: '#2563eb' },
      { label: 'Completed', value: Math.round(((byStatus.completed || 0) / total) * 100), color: '#10b981' },
      { label: 'Cancelled', value: Math.round(((byStatus.cancelled || 0) / total) * 100), color: '#8b5cf6' },
    ]
  }, [summary])

  const columns = useMemo<ColumnsType<BookingRecord>>(
    () => [
      {
        title: 'Booking ID',
        dataIndex: 'key',
        key: 'key',
        render: (value: string) => <span className="font-semibold" style={{ color: dashboardPalette.ink }}>{value}</span>,
      },
      {
        title: 'Customer',
        dataIndex: 'customer',
        key: 'customer',
        render: (value: string) => <span className="font-medium" style={{ color: dashboardPalette.inkSoft }}>{value}</span>,
      },
      {
        title: 'Vehicle',
        dataIndex: 'vehicle',
        key: 'vehicle',
        render: (value: string) => <span style={{ color: dashboardPalette.textMuted }}>{value}</span>,
      },
      {
        title: 'Service',
        dataIndex: 'service',
        key: 'service',
        render: (value: string) => <span style={{ color: dashboardPalette.textMuted }}>{value}</span>,
      },
      {
        title: 'Date / Time',
        key: 'datetime',
        render: (_, record) => (
          <div className="space-y-1">
            <div className="font-medium" style={{ color: dashboardPalette.inkSoft }}>
              {record.date}
            </div>
            <div className="text-xs" style={{ color: dashboardPalette.textMuted }}>
              {record.time}
            </div>
          </div>
        ),
      },
      {
        title: 'Channel',
        dataIndex: 'channel',
        key: 'channel',
        render: (value: BookingRecord['channel']) => {
          const tone = channelTone(value)
          return (
            <Tag
              bordered={false}
              className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold !uppercase !tracking-[0.16em]"
              style={{ background: tone.bg, color: tone.color }}
            >
              {value}
            </Tag>
          )
        },
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (value: BookingRecord['status']) => (
          <Tag
            bordered={false}
            className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold !uppercase !tracking-[0.16em]"
            style={{ background: statusTagColor(value), color: statusTextColor(value) }}
          >
            {value}
          </Tag>
        ),
      },
      {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
        render: (value: number) => (
          <span className="font-semibold" style={{ color: dashboardPalette.ink }}>
            {new Intl.NumberFormat('vi-VN').format(value)} ₫
          </span>
        ),
      },
    ],
    [],
  )

  return (
    <AdminShell eyebrow="Admin dashboard" title="Garage operations overview">
      <div className="gap-4 *:min-w-0" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {overviewCards.map((item, index) => (
          <DashboardMetricCard
            key={item.label}
            label={item.label}
            value={item.value}
            delta={item.delta}
            tone={item.tone}
            icon={item.icon}
            enterDelay={index + 1}
          />
        ))}
      </div>

      {requestError ? <InlineBanner tone="error">{requestError}</InlineBanner> : null}

      <Card
        bordered={false}
        className="bo-enter bo-enter-2 rounded-2xl"
        styles={{ body: { padding: 20 } }}
        style={{ background: dashboardPalette.panel, boxShadow: dashboardPalette.shadow, border: `1px solid ${dashboardPalette.border}` }}
        title={
          <div className="py-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: dashboardPalette.textMuted }}>
              Service advisor queue
            </div>
            <div className="mt-1.5 text-[19px] leading-none font-semibold" style={{ color: dashboardPalette.ink }}>
              Active reception &amp; repair orders
            </div>
          </div>
        }
        extra={
          <Button type="primary" style={{ background: dashboardPalette.red, borderColor: dashboardPalette.red }}>
            Export CSV
          </Button>
        }
      >
        <Table
          rowKey="key"
          columns={columns}
          dataSource={tableRows}
          pagination={{ pageSize: 6, size: 'small' }}
          size="middle"
          loading={isLoading}
          scroll={{ x: 1080 }}
          className="bo-table"
        />
      </Card>

      <div className="gap-5 *:min-w-0" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', alignItems: 'start' }}>
        <Card
          bordered={false}
          className="bo-enter bo-enter-3 rounded-2xl"
          styles={{ body: { padding: 20 } }}
          style={{
            background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
            boxShadow: '0 10px 32px rgba(15, 23, 42, 0.18)',
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Status balance</div>
              <div className="mt-1.5 text-[19px] leading-none font-semibold text-white">Repair order pipeline</div>
            </div>
            <CheckCircleOutlined className="text-lg text-white/70" />
          </div>

          <div className="mt-5 space-y-3">
            {statusProgress.map((item) => (
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

          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
            <span className="text-white/55">Total bookings on record</span>
            <span className="text-[18px] font-semibold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {summary?.bookings.total ?? '—'}
            </span>
          </div>
        </Card>

        <Card
          bordered={false}
          className="bo-enter bo-enter-4 rounded-2xl"
          styles={{ body: { padding: 20 } }}
          style={{ background: dashboardPalette.panel, boxShadow: dashboardPalette.shadow, border: `1px solid ${dashboardPalette.border}` }}
        >
          <div className="mb-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: dashboardPalette.textMuted }}>
              Technician productivity · last 30 days
            </div>
            <div className="mt-1.5 text-[19px] leading-none font-semibold" style={{ color: dashboardPalette.ink }}>
              Completion by technician
            </div>
          </div>
          <HorizontalBarChart data={technicianLoadData} />
        </Card>
      </div>

      <div className="gap-5 *:min-w-0" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <Card
          bordered={false}
          className="bo-enter bo-enter-5 rounded-2xl"
          styles={{ body: { padding: 20 } }}
          style={{ background: dashboardPalette.panel, boxShadow: dashboardPalette.shadow, border: `1px solid ${dashboardPalette.border}` }}
        >
          <div className="mb-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: dashboardPalette.textMuted }}>
              Accounting overview · last 30 days
            </div>
            <div className="mt-1.5 text-[19px] leading-none font-semibold" style={{ color: dashboardPalette.ink }}>
              Revenue by service
            </div>
          </div>
          <DonutChart data={serviceMixData} centerLabel="Revenue mix" formatValue={(value) => formatCurrency(value, revenueReport?.currency || 'VND')} />
        </Card>

        <Card
          bordered={false}
          className="bo-enter bo-enter-5 rounded-2xl"
          styles={{ body: { padding: 20 } }}
          style={{ background: dashboardPalette.panel, boxShadow: dashboardPalette.shadow, border: `1px solid ${dashboardPalette.border}` }}
        >
          <div className="mb-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: dashboardPalette.textMuted }}>
              Vehicle intake · last 7 days
            </div>
            <div className="mt-1.5 text-[19px] leading-none font-semibold" style={{ color: dashboardPalette.ink }}>
              Daily reception volume
            </div>
          </div>
          <VerticalBarChart data={dailyTrafficData} />
        </Card>
      </div>
    </AdminShell>
  )
}
