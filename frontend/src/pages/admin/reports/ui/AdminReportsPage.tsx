import { DownloadOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useRef, useState } from 'react'
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

const { RangePicker } = DatePicker

function formatMoney(value: number, currency: string) {
  if (currency === 'VND') {
    return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card
      bordered={false}
      className="rounded-[28px]"
      styles={{ body: { padding: 20 } }}
      style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow }}
    >
      <div style={{ color: adminPalette.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ color: adminPalette.ink, fontSize: 30, fontWeight: 700, marginTop: 8 }}>{value}</div>
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

  const serviceColumns: ColumnsType<RevenueByService> = [
    { title: 'Service', dataIndex: 'serviceName', key: 'serviceName', render: (value?: string) => value || 'Unnamed service' },
    { title: 'Orders', dataIndex: 'orderCount', key: 'orderCount' },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (value: number) => formatMoney(value, report?.currency || 'VND'),
    },
  ]

  const paymentColumns: ColumnsType<RevenueByPaymentMethod> = [
    { title: 'Method', dataIndex: 'method', key: 'method' },
    { title: 'Count', dataIndex: 'count', key: 'count' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number) => formatMoney(value, report?.currency || 'VND'),
    },
  ]

  const technicianColumns: ColumnsType<TechnicianPerformance> = [
    { title: 'Technician', dataIndex: 'technicianName', key: 'technicianName', render: (value?: string | null) => value || 'Unknown' },
    { title: 'Completed orders', dataIndex: 'orderCount', key: 'orderCount' },
    {
      title: 'Completion rate',
      dataIndex: 'completionRate',
      key: 'completionRate',
      render: (value: number) => `${Math.round(value * 100)}%`,
    },
    {
      title: 'Avg. time (hrs)',
      dataIndex: 'avgTime',
      key: 'avgTime',
    },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (value: number) => formatMoney(value, report?.currency || 'VND'),
    },
  ]

  return (
    <AdminShell eyebrow="Admin" title="Reports">
      <div ref={printableRef}>
        <Card
          bordered={false}
          className="rounded-[32px]"
          styles={{ body: { padding: 24 } }}
          style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, marginBottom: 20 }}
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

          {requestError ? (
            <div
              style={{ background: '#fff1f2', borderColor: '#fecaca', borderRadius: 18, borderWidth: 1, borderStyle: 'solid', color: '#991b1b', marginBottom: 16, padding: '12px 16px' }}
            >
              {requestError}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-4" style={{ marginBottom: 4 }}>
            <SummaryCard label="Total revenue" value={formatMoney(report?.totalRevenue ?? 0, report?.currency || 'VND')} />
            <SummaryCard label="Completed orders" value={String(report?.totalOrders ?? 0)} />
            <SummaryCard label="Paid invoices" value={String(report?.totalInvoices ?? 0)} />
          </div>
        </Card>

        <Card
          bordered={false}
          className="rounded-[32px]"
          styles={{ body: { padding: 24 } }}
          style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, marginBottom: 20 }}
        >
          <div style={{ color: adminPalette.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', marginBottom: 16, textTransform: 'uppercase' }}>
            Revenue by service
          </div>
          <Table
            columns={serviceColumns}
            dataSource={report?.byService ?? []}
            loading={isLoading}
            locale={{ emptyText: 'No completed orders in this date range.' }}
            pagination={false}
            rowKey="serviceId"
          />
        </Card>

        <Card
          bordered={false}
          className="rounded-[32px]"
          styles={{ body: { padding: 24 } }}
          style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, marginBottom: 20 }}
        >
          <div style={{ color: adminPalette.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', marginBottom: 16, textTransform: 'uppercase' }}>
            Revenue by payment method
          </div>
          <Table
            columns={paymentColumns}
            dataSource={report?.byPaymentMethod ?? []}
            loading={isLoading}
            locale={{ emptyText: 'No successful payments in this date range.' }}
            pagination={false}
            rowKey="method"
          />
        </Card>

        <Card
          bordered={false}
          className="rounded-[32px]"
          styles={{ body: { padding: 24 } }}
          style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow }}
        >
          <div style={{ color: adminPalette.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', marginBottom: 16, textTransform: 'uppercase' }}>
            Technician performance
          </div>
          <Table
            columns={technicianColumns}
            dataSource={report?.byTechnician ?? []}
            loading={isLoading}
            locale={{ emptyText: 'No completed repair orders in this date range.' }}
            pagination={false}
            rowKey="technicianId"
          />
        </Card>
      </div>
    </AdminShell>
  )
}
