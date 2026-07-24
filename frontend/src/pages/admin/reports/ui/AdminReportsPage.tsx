import {
  BankOutlined,
  DollarOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  ReloadOutlined,
  RiseOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Button, Card, DatePicker, Empty, Table, Tabs } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../../../../shared/auth'
import { ApiClientError } from '../../../../shared/lib/api-client'
import { downloadCsv } from '../../../../shared/lib/csv-export'
import { PDF_EXPORT_IGNORE_ATTRIBUTE, exportNodeToPdf } from '../../../../shared/lib/pdf-export'
import {
  fetchRevenueReport,
  type RevenueByPaymentMethod,
  type RevenueByService,
  type RevenueReport,
  type TechnicianPerformance,
} from '../api/reportsApi'
import { AdminShell, adminPalette } from '../../ui/AdminShell'
import { InlineBanner, StatCard } from '../../../../widgets/backoffice-shell'
import { ProfitAndReceivablesPanel } from './ProfitAndReceivablesPanel'

const { RangePicker } = DatePicker

const CHART_COLORS = [adminPalette.navy, adminPalette.teal, adminPalette.amber, adminPalette.red, '#7c3aed', '#0891b2']

function formatMoney(value: number, currency: string) {
  if (currency === 'VND') {
    return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
}

function ShareBar({ fraction, color }: { fraction: number; color: string }) {
  const percent = Math.max(0, Math.min(1, fraction)) * 100
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full" style={{ background: '#eef1f5' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums" style={{ color: adminPalette.textMuted }}>
        {percent.toFixed(0)}%
      </span>
    </div>
  )
}

/** Compact horizontal-bar leaderboard — top N rows, biggest value first. Used
 * above the full data table on the service/technician tabs so the report
 * reads visually before it reads as a spreadsheet. */
function RevenueLeaderboard({
  items,
  currency,
}: {
  items: Array<{ label: string; value: number }>
  currency: string
}) {
  if (items.length === 0) {
    return <Empty description="No data in this date range" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  const max = Math.max(...items.map((item) => item.value), 1)

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-center justify-between gap-4">
            <span className="truncate text-sm font-medium" style={{ color: adminPalette.inkSoft }} title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 text-[15px] leading-none font-semibold tabular-nums" style={{ color: adminPalette.ink }}>
              {formatMoney(item.value, currency)}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full" style={{ background: '#eef1f5' }}>
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${(item.value / max) * 100}%`, background: CHART_COLORS[index % CHART_COLORS.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Dependency-free SVG donut — avoids pulling in a chart library for one
 * chart, and SVG rasterizes reliably in the PDF export (unlike CSS
 * conic-gradient, which some html2canvas versions render blank). */
function DonutChart({ items, currency }: { items: Array<{ label: string; value: number; color: string }>; currency: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  if (total <= 0) {
    return <Empty description="No settled payments yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  const size = 168
  const thickness = 24
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  let cumulative = 0

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef1f5" strokeWidth={thickness} />
          {items.map((item) => {
            const fraction = item.value / total
            const dash = fraction * circumference
            const el = (
              <circle
                key={item.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-cumulative}
                strokeLinecap={items.length > 1 ? 'butt' : 'round'}
              />
            )
            cumulative += dash
            return el
          })}
        </g>
        <text x="50%" y="46%" textAnchor="middle" fontSize={22} fontWeight={700} fill={adminPalette.ink}>
          {items.length}
        </text>
        <text x="50%" y="63%" textAnchor="middle" fontSize={11} fill={adminPalette.textMuted}>
          method{items.length === 1 ? '' : 's'} used
        </text>
      </svg>

      <div className="flex w-full flex-col gap-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
              <span className="truncate text-sm font-medium" style={{ color: adminPalette.inkSoft }}>
                {item.label}
              </span>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums" style={{ color: adminPalette.ink }}>
              {formatMoney(item.value, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card
      bordered={false}
      className="rounded-2xl"
      styles={{ body: { padding: 20 } }}
      style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, border: `1px solid ${adminPalette.border}` }}
    >
      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: adminPalette.textMuted }}>
        {title}
      </div>
      {children}
    </Card>
  )
}

function TableCard({ title, extra, children }: { title: string; extra: ReactNode; children: ReactNode }) {
  return (
    <Card
      bordered={false}
      className="rounded-2xl"
      styles={{ body: { padding: '4px 20px 20px' } }}
      style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, border: `1px solid ${adminPalette.border}` }}
      title={
        <div className="flex flex-wrap items-center justify-between gap-3 py-1">
          <div className="text-[15px] font-semibold" style={{ color: adminPalette.ink }}>
            {title}
          </div>
          <div data-pdf-export-ignore={PDF_EXPORT_IGNORE_ATTRIBUTE} className="flex items-center gap-2">
            {extra}
          </div>
        </div>
      }
    >
      {children}
    </Card>
  )
}

type TabKey = 'service' | 'payment' | 'technician' | 'profit'

export default function AdminReportsPage() {
  const { token } = useAuth()
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(29, 'day'), dayjs()])
  const [report, setReport] = useState<RevenueReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('service')
  const [exporting, setExporting] = useState(false)

  const serviceRef = useRef<HTMLDivElement | null>(null)
  const paymentRef = useRef<HTMLDivElement | null>(null)
  const technicianRef = useRef<HTMLDivElement | null>(null)
  // The profit tab has its own self-contained cards and no CSV/PDF export, so
  // it keeps an (unused) ref only to satisfy the Record<TabKey> shape.
  const profitRef = useRef<HTMLDivElement | null>(null)
  const tabRefs: Record<TabKey, typeof serviceRef> = {
    service: serviceRef,
    payment: paymentRef,
    technician: technicianRef,
    profit: profitRef,
  }
  const tabLabels: Record<TabKey, string> = {
    service: 'revenue-by-service',
    payment: 'revenue-by-payment-method',
    technician: 'technician-performance',
    profit: 'profit-and-receivables',
  }

  async function loadReport(start: Dayjs, end: Dayjs) {
    if (!token) return
    setIsLoading(true)
    setRequestError('')
    try {
      const response = await fetchRevenueReport(token, start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'))
      setReport(response.report)
    } catch (error) {
      setRequestError(error instanceof ApiClientError ? error.message : 'Unable to load the report.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadReport(range[0], range[1])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const currency = report?.currency || 'VND'
  const totalServiceRevenue = useMemo(() => (report?.byService ?? []).reduce((sum, item) => sum + item.revenue, 0), [report])
  const totalPaymentAmount = useMemo(() => (report?.byPaymentMethod ?? []).reduce((sum, item) => sum + item.amount, 0), [report])
  const avgPerOrder = report?.totalOrders ? (report.totalRevenue ?? 0) / report.totalOrders : 0

  const rangeLabel = `${range[0].format('YYYY-MM-DD')}_to_${range[1].format('YYYY-MM-DD')}`

  async function handleExportPdf() {
    const node = tabRefs[activeTab].current
    if (!node) return
    setExporting(true)
    try {
      await exportNodeToPdf(node, `${tabLabels[activeTab]}-${rangeLabel}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  function handleExportCsv() {
    if (!report) return
    if (activeTab === 'service') {
      downloadCsv(
        `${tabLabels.service}-${rangeLabel}`,
        ['Service', 'Orders', `Revenue (${currency})`, 'Share'],
        report.byService.map((row) => [
          row.serviceName || 'Unnamed service',
          row.orderCount,
          row.revenue,
          totalServiceRevenue ? `${((row.revenue / totalServiceRevenue) * 100).toFixed(1)}%` : '0%',
        ]),
      )
    } else if (activeTab === 'payment') {
      downloadCsv(
        `${tabLabels.payment}-${rangeLabel}`,
        ['Method', 'Count', `Amount (${currency})`, 'Share'],
        report.byPaymentMethod.map((row) => [
          row.method,
          row.count,
          row.amount,
          totalPaymentAmount ? `${((row.amount / totalPaymentAmount) * 100).toFixed(1)}%` : '0%',
        ]),
      )
    } else {
      downloadCsv(
        `${tabLabels.technician}-${rangeLabel}`,
        ['Technician', 'Completed orders', 'Completion rate', 'Avg. time (hrs)', `Revenue (${currency})`],
        report.byTechnician.map((row) => [
          row.technicianName || 'Unknown',
          row.orderCount,
          `${(row.completionRate * 100).toFixed(0)}%`,
          row.avgTime,
          row.revenue,
        ]),
      )
    }
  }

  const serviceColumns: ColumnsType<RevenueByService> = [
    { title: 'Service', dataIndex: 'serviceName', key: 'serviceName', render: (value?: string) => value || 'Unnamed service' },
    { title: 'Orders', dataIndex: 'orderCount', key: 'orderCount', sorter: (a, b) => a.orderCount - b.orderCount, width: 100 },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      sorter: (a, b) => a.revenue - b.revenue,
      defaultSortOrder: 'descend',
      render: (value: number) => formatMoney(value, currency),
    },
    {
      title: 'Share',
      key: 'share',
      width: 140,
      render: (_, record) => <ShareBar fraction={totalServiceRevenue ? record.revenue / totalServiceRevenue : 0} color={adminPalette.red} />,
    },
  ]

  const paymentColumns: ColumnsType<RevenueByPaymentMethod> = [
    { title: 'Method', dataIndex: 'method', key: 'method' },
    { title: 'Count', dataIndex: 'count', key: 'count', width: 100 },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      sorter: (a, b) => a.amount - b.amount,
      defaultSortOrder: 'descend',
      render: (value: number) => formatMoney(value, currency),
    },
    {
      title: 'Share',
      key: 'share',
      width: 140,
      render: (_, record) => <ShareBar fraction={totalPaymentAmount ? record.amount / totalPaymentAmount : 0} color={adminPalette.navy} />,
    },
  ]

  const technicianColumns: ColumnsType<TechnicianPerformance> = [
    { title: 'Technician', dataIndex: 'technicianName', key: 'technicianName', render: (value?: string | null) => value || 'Unknown' },
    { title: 'Completed orders', dataIndex: 'orderCount', key: 'orderCount', sorter: (a, b) => a.orderCount - b.orderCount },
    {
      title: 'Completion rate',
      dataIndex: 'completionRate',
      key: 'completionRate',
      sorter: (a, b) => a.completionRate - b.completionRate,
      render: (value: number) => <ShareBar fraction={value} color={adminPalette.green} />,
    },
    {
      title: 'Avg. time (hrs)',
      dataIndex: 'avgTime',
      key: 'avgTime',
      sorter: (a, b) => a.avgTime - b.avgTime,
    },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      sorter: (a, b) => a.revenue - b.revenue,
      defaultSortOrder: 'descend',
      render: (value: number) => formatMoney(value, currency),
    },
  ]

  const exportToolbar = (
    <>
      <Button size="small" icon={<FileExcelOutlined />} onClick={handleExportCsv}>
        CSV
      </Button>
      <Button size="small" icon={<DownloadOutlined />} onClick={handleExportPdf} loading={exporting}>
        PDF
      </Button>
    </>
  )

  const donutItems = (report?.byPaymentMethod ?? []).map((row, index) => ({
    label: row.method,
    value: row.amount,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }))

  return (
    <AdminShell eyebrow="Admin" title="Reports">
      <div className="flex flex-col gap-5">
        <Card
          bordered={false}
          className="bo-enter rounded-2xl"
          styles={{ body: { padding: 24 } }}
          style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, border: `1px solid ${adminPalette.border}` }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4" style={{ marginBottom: 20 }}>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: adminPalette.textMuted }}>
                Revenue report
              </div>
              <div className="mt-1.5 text-[19px] leading-none font-semibold" style={{ color: adminPalette.ink }}>
                {range[0].format('DD MMM YYYY')} – {range[1].format('DD MMM YYYY')}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RangePicker
                value={range}
                onChange={(value) => {
                  if (!value || !value[0] || !value[1]) return
                  const nextRange: [Dayjs, Dayjs] = [value[0], value[1]]
                  setRange(nextRange)
                  void loadReport(nextRange[0], nextRange[1])
                }}
              />
              <Button icon={<ReloadOutlined />} onClick={() => void loadReport(range[0], range[1])} loading={isLoading}>
                Refresh
              </Button>
            </div>
          </div>

          {requestError ? <InlineBanner tone="error">{requestError}</InlineBanner> : null}

          <div className="gap-4 *:min-w-0" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <StatCard
              label="Total revenue"
              value={formatMoney(report?.totalRevenue ?? 0, currency)}
              note="Cash collected in range"
              icon={<DollarOutlined />}
              palette={adminPalette}
              tone="red"
              enterDelay={1}
            />
            <StatCard
              label="Completed orders"
              value={report?.totalOrders ?? 0}
              note="Repair orders finished"
              icon={<ToolOutlined />}
              palette={adminPalette}
              tone="blue"
              enterDelay={2}
            />
            <StatCard
              label="Paid invoices"
              value={report?.totalInvoices ?? 0}
              note="Fully settled in range"
              icon={<FileTextOutlined />}
              palette={adminPalette}
              tone="emerald"
              enterDelay={3}
            />
            <StatCard
              label="Avg. revenue / order"
              value={formatMoney(Math.round(avgPerOrder), currency)}
              note="Total revenue ÷ completed orders"
              icon={<RiseOutlined />}
              palette={adminPalette}
              tone="amber"
              enterDelay={4}
            />
          </div>
        </Card>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
          type="card"
          className="bo-enter bo-enter-2"
          items={[
            {
              key: 'service',
              label: (
                <span className="flex items-center gap-2 px-1">
                  <ToolOutlined /> Revenue by service
                </span>
              ),
              children: (
                <div ref={serviceRef} className="flex flex-col gap-5">
                  <ChartCard title="Top services by revenue">
                    <RevenueLeaderboard
                      items={[...(report?.byService ?? [])]
                        .sort((a, b) => b.revenue - a.revenue)
                        .slice(0, 6)
                        .map((row) => ({ label: row.serviceName || 'Unnamed service', value: row.revenue }))}
                      currency={currency}
                    />
                  </ChartCard>

                  <TableCard title="All services in range" extra={exportToolbar}>
                    <Table
                      columns={serviceColumns}
                      dataSource={report?.byService ?? []}
                      loading={isLoading}
                      locale={{ emptyText: 'No completed orders in this date range.' }}
                      pagination={false}
                      rowKey="serviceId"
                      className="bo-table"
                      scroll={{ x: 640 }}
                      summary={(rows) => {
                        const orders = rows.reduce((sum, row) => sum + row.orderCount, 0)
                        const revenue = rows.reduce((sum, row) => sum + row.revenue, 0)
                        return rows.length ? (
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0}>
                              <span className="font-semibold" style={{ color: adminPalette.ink }}>
                                Total
                              </span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1}>
                              <span className="font-semibold">{orders}</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2}>
                              <span className="font-semibold">{formatMoney(revenue, currency)}</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} />
                          </Table.Summary.Row>
                        ) : null
                      }}
                    />
                  </TableCard>
                </div>
              ),
            },
            {
              key: 'payment',
              label: (
                <span className="flex items-center gap-2 px-1">
                  <BankOutlined /> Payment methods
                </span>
              ),
              children: (
                <div ref={paymentRef} className="flex flex-col gap-5">
                  <ChartCard title="Collected amount by method">
                    <DonutChart items={donutItems} currency={currency} />
                  </ChartCard>

                  <TableCard title="All payment methods in range" extra={exportToolbar}>
                    <Table
                      columns={paymentColumns}
                      dataSource={report?.byPaymentMethod ?? []}
                      loading={isLoading}
                      locale={{ emptyText: 'No successful payments in this date range.' }}
                      pagination={false}
                      rowKey="method"
                      className="bo-table"
                      scroll={{ x: 480 }}
                    />
                  </TableCard>
                </div>
              ),
            },
            {
              key: 'technician',
              label: (
                <span className="flex items-center gap-2 px-1">
                  <UserOutlined /> Technician performance
                </span>
              ),
              children: (
                <div ref={technicianRef} className="flex flex-col gap-5">
                  <ChartCard title="Top technicians by collected revenue">
                    <RevenueLeaderboard
                      items={[...(report?.byTechnician ?? [])]
                        .sort((a, b) => b.revenue - a.revenue)
                        .slice(0, 6)
                        .map((row) => ({ label: row.technicianName || 'Unknown', value: row.revenue }))}
                      currency={currency}
                    />
                  </ChartCard>

                  <TableCard title="All technicians in range" extra={exportToolbar}>
                    <Table
                      columns={technicianColumns}
                      dataSource={report?.byTechnician ?? []}
                      loading={isLoading}
                      locale={{ emptyText: 'No completed repair orders in this date range.' }}
                      pagination={false}
                      rowKey="technicianId"
                      className="bo-table"
                      scroll={{ x: 640 }}
                    />
                  </TableCard>
                </div>
              ),
            },
            {
              key: 'profit',
              label: (
                <span className="flex items-center gap-2 px-1">
                  <RiseOutlined /> Profit &amp; receivables
                </span>
              ),
              children: (
                <div ref={profitRef}>
                  <ProfitAndReceivablesPanel
                    startDate={range[0].format('YYYY-MM-DD')}
                    endDate={range[1].format('YYYY-MM-DD')}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </AdminShell>
  )
}
