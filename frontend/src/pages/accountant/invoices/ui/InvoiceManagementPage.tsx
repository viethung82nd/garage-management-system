import { DollarOutlined, FileDoneOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Input, Progress, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AccountantShell, accountantPalette } from '../../ui/AccountantShell'
import { invoiceOverview, invoiceRecords, paymentMix, serviceRevenue, type InvoiceRecord } from '../../model/mock'

const { Text } = Typography

function toneByStatus(status: InvoiceRecord['status']) {
  switch (status) {
    case 'Awaiting approval':
      return { bg: '#fef3c7', color: '#92400e' }
    case 'Ready to bill':
      return { bg: '#dbeafe', color: '#1d4ed8' }
    case 'Paid':
      return { bg: '#dcfce7', color: '#166534' }
    case 'Adjusted':
      return { bg: '#f3e8ff', color: '#7e22ce' }
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

function PaymentMixChart() {
  const total = paymentMix.reduce((sum, item) => sum + item.value, 0)
  let currentOffset = 0

  return (
    <div className="grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-center">
      <div className="relative mx-auto h-[180px] w-[180px]">
        <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
          <circle cx="110" cy="110" r="72" fill="none" stroke="rgba(15,14,14,0.08)" strokeWidth="24" />
          {paymentMix.map((item) => {
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
            {total}%
          </div>
          <div className="mt-2 text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: accountantPalette.textMuted }}>
            Payment mix
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {paymentMix.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.7)' }}>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ background: item.color }} />
              <span className="text-sm font-semibold" style={{ color: accountantPalette.inkSoft }}>
                {item.label}
              </span>
            </div>
            <span className="font-['Oswald'] text-[28px] leading-none" style={{ color: accountantPalette.ink }}>
              {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RevenueBars() {
  const max = Math.max(...serviceRevenue.map((item) => item.value))

  return (
    <div className="space-y-5">
      {serviceRevenue.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="text-sm font-semibold" style={{ color: accountantPalette.inkSoft }}>
              {item.label}
            </span>
            <span className="font-['Oswald'] text-[24px] leading-none" style={{ color: accountantPalette.ink }}>
              ${item.value}K
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
  const columns = useMemo<ColumnsType<InvoiceRecord>>(
    () => [
      {
        title: 'Invoice',
        dataIndex: 'id',
        key: 'id',
        render: (value: string, record) => (
          <div className="space-y-1">
            <div className="font-semibold" style={{ color: accountantPalette.ink }}>{value}</div>
            <div className="text-xs" style={{ color: accountantPalette.textMuted }}>{record.repairOrder}</div>
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
        title: 'Issued / Due',
        key: 'datetime',
        render: (_, record) => (
          <div className="space-y-1">
            <div className="font-medium" style={{ color: accountantPalette.inkSoft }}>{record.issuedAt}</div>
            <div className="text-xs" style={{ color: accountantPalette.textMuted }}>Due: {record.dueAt}</div>
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
        render: (value: InvoiceRecord['status']) => {
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
        render: (value: number) => <span className="font-semibold" style={{ color: accountantPalette.ink }}>${value.toFixed(2)}</span>,
      },
      {
        title: '',
        key: 'action',
        render: (_, record) => (
          <Link to="/accountant/invoices/confirm" state={{ invoiceId: record.id }}>
            <Button type="primary" size="small" style={{ background: accountantPalette.red, borderColor: accountantPalette.red }}>
              Confirm
            </Button>
          </Link>
        ),
      },
    ],
    [],
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
        {invoiceOverview.map((item) => (
          <MetricCard key={item.label} label={item.label} value={item.value} delta={item.delta} tone={item.tone} />
        ))}
      </div>

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
              <Input prefix={<SearchOutlined />} placeholder="Search invoice or repair order" className="!rounded-full" />
              <Button type="primary" icon={<FileDoneOutlined />} style={{ background: accountantPalette.red, borderColor: accountantPalette.red }}>
                Create invoice
              </Button>
            </Space>
          }
        >
          <Table rowKey="id" columns={columns} dataSource={invoiceRecords} pagination={false} scroll={{ x: 1120 }} className="admin-dashboard-table" />
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
              {[
                { label: 'Invoices issued', value: 78, color: accountantPalette.teal },
                { label: 'Payments captured', value: 66, color: accountantPalette.red },
                { label: 'Adjustment clearance', value: 42, color: accountantPalette.amber },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-white/88">{item.label}</span>
                    <span className="font-['Oswald'] text-[22px] leading-none text-white">{item.value}%</span>
                  </div>
                  <Progress percent={item.value} strokeColor={item.color} trailColor="rgba(255,255,255,0.1)" showInfo={false} />
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
            <PaymentMixChart />
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
        <RevenueBars />
      </Card>
    </AccountantShell>
  )
}
