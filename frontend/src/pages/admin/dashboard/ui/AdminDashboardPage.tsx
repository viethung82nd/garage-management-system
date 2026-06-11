import {
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PieChartOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Avatar, Badge, Button, Card, Menu, Progress, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { bookingOverview, bookingRecords, weeklyStatus, type BookingRecord } from '../model/mock'

const { Title, Text } = Typography
const KAPA_LOGO_URL = '/kapa-auth/wp-content/uploads/2023/01/Kapa_Logo-1.svg'

const dashboardPalette = {
  ink: '#0f0e0e',
  inkSoft: '#2a2727',
  textMuted: '#6b6262',
  canvas: '#f7f2ec',
  panel: '#fffdfa',
  panelAlt: '#f4eee8',
  border: 'rgba(15, 14, 14, 0.08)',
  red: '#f51304',
  redDeep: '#cf1a10',
  amber: '#ffb347',
  teal: '#197b74',
  navy: '#1f365c',
  green: '#2f8f63',
  shadow: '0 24px 70px rgba(15, 14, 14, 0.08)',
} as const

const serviceMix = [
  { label: 'Diagnostics', value: 36, color: dashboardPalette.red },
  { label: 'Maintenance', value: 24, color: dashboardPalette.navy },
  { label: 'Brake & suspension', value: 18, color: dashboardPalette.amber },
  { label: 'AC & electrical', value: 14, color: dashboardPalette.teal },
  { label: 'Tire & alignment', value: 8, color: dashboardPalette.green },
]

const dailyTraffic = [
  { label: 'Mon', value: 18 },
  { label: 'Tue', value: 24 },
  { label: 'Wed', value: 20 },
  { label: 'Thu', value: 28 },
  { label: 'Fri', value: 32 },
  { label: 'Sat', value: 26 },
  { label: 'Sun', value: 14 },
]

const technicianLoad = [
  { label: 'Tech An', value: 82, color: dashboardPalette.red },
  { label: 'Tech Mai', value: 68, color: dashboardPalette.navy },
  { label: 'Tech Huy', value: 57, color: dashboardPalette.teal },
  { label: 'Tech Duc', value: 91, color: dashboardPalette.amber },
]

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

function DashboardMetricCard({
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
    emerald: {
      accent: dashboardPalette.green,
      soft: 'rgba(47, 143, 99, 0.14)',
    },
    blue: {
      accent: dashboardPalette.navy,
      soft: 'rgba(31, 54, 92, 0.14)',
    },
    amber: {
      accent: '#c67a00',
      soft: 'rgba(255, 179, 71, 0.18)',
    },
    violet: {
      accent: '#8a3ffc',
      soft: 'rgba(138, 63, 252, 0.14)',
    },
  } as const

  const currentTone = toneMap[tone]

  return (
    <Card
      bordered={false}
      styles={{ body: { padding: 0 } }}
      className="overflow-hidden rounded-[28px] admin-dashboard-metric-card"
      style={{
        background: `linear-gradient(135deg, ${dashboardPalette.panel} 0%, ${dashboardPalette.panelAlt} 100%)`,
        boxShadow: dashboardPalette.shadow,
      }}
    >
      <div className="relative overflow-hidden p-5">
        <div
          className="absolute right-[-32px] top-[-32px] h-28 w-28 rounded-full"
          style={{ background: currentTone.soft }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <Text className="!text-[11px] !font-semibold !uppercase !tracking-[0.18em]" style={{ color: dashboardPalette.textMuted }}>
              {label}
            </Text>
            <div className="mt-2 font-['Oswald'] text-[34px] leading-none md:text-[38px]" style={{ color: dashboardPalette.ink }}>
              {value}
            </div>
          </div>
          <div
            className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ background: currentTone.soft, color: currentTone.accent }}
          >
            {delta}
          </div>
        </div>
      </div>
    </Card>
  )
}

function DonutChart() {
  const total = serviceMix.reduce((sum, item) => sum + item.value, 0)
  let currentOffset = 0

  return (
    <div className="grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-center">
      <div className="relative mx-auto h-[180px] w-[180px]">
        <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
          <circle cx="110" cy="110" r="72" fill="none" stroke="rgba(15,14,14,0.08)" strokeWidth="24" />
          {serviceMix.map((item) => {
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
          <div className="font-['Oswald'] text-[34px] leading-none" style={{ color: dashboardPalette.ink }}>
            {total}
          </div>
          <div className="mt-2 text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: dashboardPalette.textMuted }}>
            Revenue mix
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {serviceMix.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.7)' }}>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ background: item.color }} />
              <span className="text-sm font-semibold" style={{ color: dashboardPalette.inkSoft }}>
                {item.label}
              </span>
            </div>
            <span className="font-['Oswald'] text-[28px] leading-none" style={{ color: dashboardPalette.ink }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function VerticalBarChart() {
  const max = Math.max(...dailyTraffic.map((item) => item.value))

  return (
    <div className="rounded-[28px] border px-4 pb-3 pt-4" style={{ borderColor: dashboardPalette.border, background: 'rgba(255,255,255,0.7)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          alignItems: 'end',
          gap: '12px',
          height: '220px',
        }}
      >
        {dailyTraffic.map((item, index) => {
          const height = `${(item.value / max) * 100}%`
          const accent = index === 4 ? dashboardPalette.red : index % 2 === 0 ? dashboardPalette.navy : dashboardPalette.amber

          return (
            <div key={item.label} className="flex h-full flex-col justify-end">
              <div className="mb-2 text-center font-['Oswald'] text-[18px] leading-none" style={{ color: dashboardPalette.ink }}>
                {item.value}
              </div>
              <div className="flex h-[150px] items-end">
                <div
                  className="w-full rounded-t-[18px] transition-transform duration-300 hover:-translate-y-1"
                  style={{
                    minHeight: '20px',
                    height,
                    background: `linear-gradient(180deg, ${accent} 0%, rgba(15,14,14,0.82) 100%)`,
                    boxShadow: `0 12px 24px ${accent}30`,
                  }}
                />
              </div>
              <div className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: dashboardPalette.textMuted }}>
                {item.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HorizontalBarChart() {
  return (
    <div className="space-y-5">
      {technicianLoad.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="text-sm font-semibold" style={{ color: dashboardPalette.inkSoft }}>
              {item.label}
            </span>
            <span className="font-['Oswald'] text-[24px] leading-none" style={{ color: dashboardPalette.ink }}>
              {item.value}%
            </span>
          </div>
          <div className="h-4 overflow-hidden rounded-full" style={{ background: 'rgba(15,14,14,0.12)', boxShadow: 'inset 0 1px 2px rgba(15,14,14,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${item.value}%`,
                background: `linear-gradient(90deg, ${item.color} 0%, ${dashboardPalette.ink} 100%)`,
                boxShadow: `0 8px 18px ${item.color}45`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboardPage() {
  const [collapsed, setCollapsed] = useState(false)
  const sidebarWidth = collapsed ? 76 : 288

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
        render: (value: number) => <span className="font-semibold" style={{ color: dashboardPalette.ink }}>${value}</span>,
      },
    ],
    [],
  )

  return (
    <div
      className="min-h-screen"
      style={{
        background: `radial-gradient(circle at top left, rgba(245, 19, 4, 0.12), transparent 22%), radial-gradient(circle at top right, rgba(255, 179, 71, 0.16), transparent 22%), ${dashboardPalette.canvas}`,
        color: dashboardPalette.ink,
        fontFamily: 'var(--font-body)',
      }}
    >
      <div className="flex min-h-screen">
        <aside
          className="admin-dashboard-sidebar shrink-0 border-r transition-[width] duration-300"
          style={{
            width: sidebarWidth,
            background: `linear-gradient(180deg, ${dashboardPalette.ink} 0%, ${dashboardPalette.redDeep} 100%)`,
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '18px 0 60px rgba(15, 14, 14, 0.14)',
          }}
        >
          <div className="sticky top-0 flex h-screen flex-col">
          <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 border-b border-white/10 px-4 py-5 text-center">
            <img src={KAPA_LOGO_URL} alt="Kapa" className={collapsed ? 'h-10 w-auto max-w-[56px]' : 'h-20 w-auto max-w-[150px]'} />
            {!collapsed && (
              <div className="flex flex-col items-center">
                    <div className="font-['Oswald'] text-[24px] uppercase leading-none text-white">Admin</div>
                <div
                  className="mt-2 text-[11px] font-semibold uppercase tracking-[0.24em]"
                  style={{ color: 'rgba(255, 255, 255, 0.82)' }}
                >
                  Garage control room
                </div>
              </div>
            )}
          </div>

          <div className="px-3 py-5">
            <Menu
              theme="dark"
              mode="inline"
              defaultSelectedKeys={['dashboard']}
              className="!border-0 !bg-transparent"
              style={{ fontFamily: 'var(--font-body)' }}
              items={[
                { key: 'dashboard', icon: <DashboardOutlined />, label: 'Overview' },
                { key: 'repair-orders', icon: <ClockCircleOutlined />, label: 'Repair orders' },
                { key: 'users', icon: <TeamOutlined />, label: 'Users' },
                { key: 'reports', icon: <PieChartOutlined />, label: 'Reports' },
                { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
              ]}
            />
          </div>

          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header
            className="sticky top-0 z-30 flex h-20 items-center justify-between border-b px-5 md:px-6 backdrop-blur-xl"
            style={{
              background: 'rgba(255, 253, 250, 0.82)',
              borderColor: dashboardPalette.border,
            }}
          >
            <div>
              <div className="flex items-center gap-3">
                <Button
                  type="text"
                  icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={() => setCollapsed((value) => !value)}
                  className="!inline-flex !h-11 !w-11 !items-center !justify-center !rounded-full"
                  style={{ color: dashboardPalette.ink }}
                />
                <span className="text-[12px] font-semibold uppercase tracking-[0.26em]" style={{ color: dashboardPalette.textMuted }}>
                  Admin dashboard
                </span>
              </div>
              <Title level={2} className="!mb-0 !mt-1 !font-['Oswald'] !text-[28px] md:!text-[34px] !leading-none" style={{ color: dashboardPalette.ink }}>
                Garage operations overview
              </Title>
            </div>

            <Space size="middle">
              <Badge dot offset={[-4, 8]}>
                <Button shape="circle" icon={<BellOutlined />} />
              </Badge>
              <Space size="middle" className="rounded-full border px-3 py-2" style={{ borderColor: dashboardPalette.border, background: dashboardPalette.panel }}>
                <Avatar style={{ background: dashboardPalette.red, color: '#fff' }}>A</Avatar>
                <div className="leading-tight">
                  <div className="text-sm font-semibold" style={{ color: dashboardPalette.ink }}>
                    Admin
                  </div>
                  <div className="text-xs" style={{ color: dashboardPalette.textMuted }}>
                    System administrator
                  </div>
                </div>
              </Space>
            </Space>
          </header>

          <section className="px-4 py-5 md:px-6" style={{ background: 'transparent' }}>
            <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5">
              <div
                className="gap-4"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                }}
              >
                {bookingOverview.map((item) => (
                  <DashboardMetricCard key={item.label} label={item.label} value={item.value} delta={item.delta} tone={item.tone} />
                ))}
              </div>

              <div
                className="gap-5"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
                }}
              >
                <Card
                  bordered={false}
                  className="rounded-[32px]"
                  styles={{ body: { padding: 20 } }}
                  style={{
                    background: dashboardPalette.panel,
                    boxShadow: dashboardPalette.shadow,
                  }}
                  title={
                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: dashboardPalette.textMuted }}>
                        Service advisor queue
                      </div>
                      <div className="mt-2 font-['Oswald'] text-[30px] leading-none" style={{ color: dashboardPalette.ink }}>
                        Active reception & repair orders
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
                    dataSource={bookingRecords}
                    pagination={false}
                    size="middle"
                    scroll={{ x: 980 }}
                    className="admin-dashboard-table"
                  />
                </Card>

                <div
                  className="gap-5"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  }}
                >
                  <Card
                    bordered={false}
                    className="rounded-[32px]"
                    styles={{ body: { padding: 20 } }}
                    style={{
                      background: `linear-gradient(180deg, #1a1919 0%, #33201c 100%)`,
                      boxShadow: '0 26px 65px rgba(15, 14, 14, 0.18)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-white/60">Status balance</div>
                        <div className="mt-2 font-['Oswald'] text-[28px] leading-none text-white">Repair order pipeline</div>
                      </div>
                      <CheckCircleOutlined className="text-xl text-[#ffb347]" />
                    </div>

                    <div className="mt-5 space-y-3">
                      {weeklyStatus.map((item) => (
                        <div key={item.label}>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="font-semibold text-white/88">{item.label}</span>
                            <span className="font-['Oswald'] text-[22px] leading-none text-white">{item.value}</span>
                          </div>
                          <Progress percent={item.value} strokeColor={item.color} trailColor="rgba(255,255,255,0.1)" showInfo={false} />
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card
                    bordered={false}
                    className="rounded-[32px]"
                    styles={{ body: { padding: 20 } }}
                    style={{ background: dashboardPalette.panel, boxShadow: dashboardPalette.shadow }}
                  >
                    <div className="mb-5">
                      <div className="text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: dashboardPalette.textMuted }}>
                        Technician productivity
                      </div>
                      <div className="mt-2 font-['Oswald'] text-[28px] leading-none" style={{ color: dashboardPalette.ink }}>
                        Completion by technician
                      </div>
                    </div>
                    <HorizontalBarChart />
                  </Card>
                </div>
              </div>

              <div
                className="gap-5"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                }}
              >
                <Card
                  bordered={false}
                  className="rounded-[32px]"
                  styles={{ body: { padding: 20 } }}
                  style={{ background: dashboardPalette.panel, boxShadow: dashboardPalette.shadow }}
                >
                    <div className="mb-5">
                      <div className="text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: dashboardPalette.textMuted }}>
                        Accounting overview
                      </div>
                      <div className="mt-2 font-['Oswald'] text-[28px] leading-none" style={{ color: dashboardPalette.ink }}>
                        Revenue by service
                      </div>
                    </div>
                    <DonutChart />
                </Card>

                <Card
                  bordered={false}
                  className="rounded-[32px]"
                  styles={{ body: { padding: 20 } }}
                  style={{ background: dashboardPalette.panel, boxShadow: dashboardPalette.shadow }}
                >
                    <div className="mb-5">
                      <div className="text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: dashboardPalette.textMuted }}>
                        Vehicle intake
                      </div>
                      <div className="mt-2 font-['Oswald'] text-[28px] leading-none" style={{ color: dashboardPalette.ink }}>
                        Daily reception volume
                      </div>
                    </div>
                    <VerticalBarChart />
                </Card>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
