import { BankOutlined, DownloadOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../../../../shared/auth'
import { ApiClientError } from '../../../../shared/lib/api-client'
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

const { RangePicker } = DatePicker

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

function ReportSectionCard({
  icon,
  eyebrow,
  title,
  enterDelay,
  children,
}: {
  icon: ReactNode
  eyebrow: string
  title: string
  enterDelay: number
  children: ReactNode
}) {
  return (
    <Card
      bordered={false}
      className={`bo-enter bo-enter-${enterDelay} rounded-2xl`}
      styles={{ body: { padding: 24 } }}
      style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, border: `1px solid ${adminPalette.border}` }}
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
          style={{ background: adminPalette.panelAlt, color: adminPalette.red }}
        >
          {icon}
        </span>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: adminPalette.textMuted }}>
            {eyebrow}
          </div>
          <div className="text-[16px] font-semibold" style={{ color: adminPalette.ink }}>
            {title}
          </div>
        </div>
      </div>
      {children}
    </Card>
  )
}

export default function AdminReportsPage() {
  const { token } = useAuth()
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(29, 'day'), dayjs()])
  const [report, setReport] = useState<RevenueReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [requestError, setRequestError] = useState('')
  const printableRef = useRef<HTMLDivElement | null>(null)

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

  async function handleExportPdf() {
    if (!printableRef.current) return
    await exportNodeToPdf(printableRef.current, `revenue-report-${range[0].format('YYYY-MM-DD')}-to-${range[1].format('YYYY-MM-DD')}.pdf`)
  }

  const currency = report?.currency || 'VND'
  const totalServiceRevenue = useMemo(() => (report?.byService ?? []).reduce((sum, item) => sum + item.revenue, 0), [report])
  const totalPaymentAmount = useMemo(() => (report?.byPaymentMethod ?? []).reduce((sum, item) => sum + item.amount, 0), [report])

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

  return (
    <AdminShell eyebrow="Admin" title="Reports">
      <div ref={printableRef} className="flex flex-col gap-5">
        <Card
          bordered={false}
          className="bo-enter rounded-2xl"
          styles={{ body: { padding: 24 } }}
          style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, border: `1px solid ${adminPalette.border}` }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4" style={{ marginBottom: 16 }}>
            <RangePicker
              value={range}
              onChange={(value) => {
                if (!value || !value[0] || !value[1]) return
                const nextRange: [Dayjs, Dayjs] = [value[0], value[1]]
                setRange(nextRange)
                void loadReport(nextRange[0], nextRange[1])
              }}
            />
            <Button
              data-pdf-export-ignore={PDF_EXPORT_IGNORE_ATTRIBUTE}
              icon={<DownloadOutlined />}
              onClick={handleExportPdf}
              type="primary"
            >
              Export PDF
            </Button>
          </div>

          {requestError ? <InlineBanner tone="error">{requestError}</InlineBanner> : null}

          <div className="flex flex-wrap gap-4" style={{ marginBottom: 4 }}>
            <StatCard label="Total revenue" value={formatMoney(report?.totalRevenue ?? 0, currency)} palette={adminPalette} enterDelay={1} />
            <StatCard label="Completed orders" value={report?.totalOrders ?? 0} palette={adminPalette} enterDelay={2} />
            <StatCard label="Paid invoices" value={report?.totalInvoices ?? 0} palette={adminPalette} enterDelay={3} />
          </div>
        </Card>

        <ReportSectionCard icon={<ToolOutlined />} eyebrow="Breakdown" title="Revenue by service" enterDelay={2}>
          <Table
            columns={serviceColumns}
            dataSource={report?.byService ?? []}
            loading={isLoading}
            locale={{ emptyText: 'No completed orders in this date range.' }}
            pagination={false}
            rowKey="serviceId"
            className="bo-table"
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
        </ReportSectionCard>

        <ReportSectionCard icon={<BankOutlined />} eyebrow="Breakdown" title="Revenue by payment method" enterDelay={3}>
          <Table
            columns={paymentColumns}
            dataSource={report?.byPaymentMethod ?? []}
            loading={isLoading}
            locale={{ emptyText: 'No successful payments in this date range.' }}
            pagination={false}
            rowKey="method"
            className="bo-table"
          />
        </ReportSectionCard>

        <ReportSectionCard icon={<UserOutlined />} eyebrow="Breakdown" title="Technician performance" enterDelay={4}>
          <Table
            columns={technicianColumns}
            dataSource={report?.byTechnician ?? []}
            loading={isLoading}
            locale={{ emptyText: 'No completed repair orders in this date range.' }}
            pagination={false}
            rowKey="technicianId"
            className="bo-table"
          />
        </ReportSectionCard>
      </div>
    </AdminShell>
  )
}
