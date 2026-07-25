import { Card, Empty, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { useAuth } from '../../../../shared/auth'
import { InlineBanner } from '../../../../widgets/backoffice-shell'
import { adminPalette } from '../../ui/AdminShell'
import {
  fetchGrossProfitReport,
  fetchReceivablesReport,
  fetchWorkshopKpis,
  type GrossProfitReport,
  type ReceivablesCustomerRow,
  type ReceivablesReport,
  type WorkshopKpis,
} from '../api/reportsApi'

function money(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(value))} ₫`
}

/** A small KPI / profit / receivables panel that reuses the reports page's own
 * date range. Kept as its own component so the (already large) reports page
 * only gains one import and one line. Styling follows the admin palette so it
 * reads as part of the same screen. */
export function ProfitAndReceivablesPanel({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { token } = useAuth()
  const [profit, setProfit] = useState<GrossProfitReport | null>(null)
  const [receivables, setReceivables] = useState<ReceivablesReport | null>(null)
  const [kpis, setKpis] = useState<WorkshopKpis | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    let cancelled = false
    const load = async () => {
      setError('')
      try {
        const [p, r, k] = await Promise.all([
          fetchGrossProfitReport(token, startDate, endDate),
          fetchReceivablesReport(token),
          fetchWorkshopKpis(token, startDate, endDate),
        ])
        if (cancelled) return
        setProfit(p.report)
        setReceivables(r.report)
        setKpis(k.report)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load profit / receivables.')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [token, startDate, endDate])

  const receivableColumns: ColumnsType<ReceivablesCustomerRow> = [
    { title: 'Customer', dataIndex: 'customerName', key: 'customerName', render: (v: string | null) => v || '—' },
    { title: 'Current', dataIndex: 'current', key: 'current', align: 'right', render: money },
    { title: '1–30d', dataIndex: 'd1_30', key: 'd1_30', align: 'right', render: money },
    { title: '31–60d', dataIndex: 'd31_60', key: 'd31_60', align: 'right', render: money },
    { title: '61–90d', dataIndex: 'd61_90', key: 'd61_90', align: 'right', render: money },
    {
      title: '90d+',
      dataIndex: 'd90_plus',
      key: 'd90_plus',
      align: 'right',
      render: (v: number) => <span style={{ color: v > 0 ? adminPalette.red : undefined }}>{money(v)}</span>,
    },
    {
      title: 'Outstanding',
      dataIndex: 'outstanding',
      key: 'outstanding',
      align: 'right',
      render: (v: number) => <strong>{money(v)}</strong>,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {error ? <InlineBanner tone="error">{error}</InlineBanner> : null}

      {/* KPI tiles */}
      <div className="flex flex-wrap gap-3">
        <KpiTile label="Average repair order" value={kpis ? money(kpis.aro) : '—'} />
        <KpiTile label="Effective labour rate" value={kpis ? `${money(kpis.effectiveLaborRate)}/h` : '—'} />
        <KpiTile label="Labour hours sold" value={kpis ? `${kpis.laborHoursSold} h` : '—'} />
        <KpiTile label="Carry-over rate" value={kpis ? `${kpis.carryOverRate}%` : '—'} hint="Toyota target < 5%" />
        <KpiTile label="Rework rate" value={kpis ? `${kpis.reworkRate}%` : '—'} />
        <KpiTile label="Retention rate" value={kpis ? `${kpis.retentionRate}%` : '—'} hint="Repeat customers in the period" />
      </div>

      {/* Gross profit split */}
      <Card
        bordered={false}
        title="Gross profit — labour vs parts"
        styles={{ body: { padding: 20 } }}
        style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, border: `1px solid ${adminPalette.border}` }}
      >
        {profit ? (
          <div className="flex flex-wrap gap-6">
            <ProfitColumn title="Labour" stream={profit.labor} />
            <ProfitColumn title="Parts" stream={profit.parts} />
            <ProfitColumn title="Total" stream={profit.total} emphasise />
          </div>
        ) : (
          <Empty description="No paid invoices in this date range" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      {/* Receivables ageing */}
      <Card
        bordered={false}
        title="Accounts receivable — ageing"
        extra={
          receivables ? (
            <span style={{ color: adminPalette.textMuted, fontSize: 13 }}>
              Total outstanding: <strong style={{ color: adminPalette.ink }}>{money(receivables.totals.outstanding)}</strong>
            </span>
          ) : null
        }
        styles={{ body: { padding: 0 } }}
        style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, border: `1px solid ${adminPalette.border}` }}
      >
        <Table
          rowKey="customerId"
          columns={receivableColumns}
          dataSource={receivables?.byCustomer ?? []}
          pagination={{ pageSize: 6, hideOnSinglePage: true }}
          locale={{ emptyText: 'No outstanding invoices — every customer is settled up.' }}
          size="middle"
          scroll={{ x: 720 }}
        />
      </Card>
    </div>
  )
}

function KpiTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div
      className="flex min-w-[150px] flex-1 flex-col gap-1 rounded-2xl px-4 py-3"
      style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, border: `1px solid ${adminPalette.border}` }}
    >
      <span style={{ color: adminPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ color: adminPalette.ink, fontSize: 20, fontWeight: 700 }}>{value}</span>
      {hint ? <span style={{ color: adminPalette.textMuted, fontSize: 11 }}>{hint}</span> : null}
    </div>
  )
}

function ProfitColumn({
  title,
  stream,
  emphasise,
}: {
  title: string
  stream: { revenue: number; cost: number; profit: number; marginPercent: number }
  emphasise?: boolean
}) {
  return (
    <div className="flex min-w-[180px] flex-col gap-1">
      <span style={{ color: adminPalette.textMuted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{title}</span>
      <div className="flex items-baseline justify-between">
        <span style={{ color: adminPalette.textMuted, fontSize: 13 }}>Revenue</span>
        <span style={{ fontSize: 13 }}>{money(stream.revenue)}</span>
      </div>
      <div className="flex items-baseline justify-between">
        <span style={{ color: adminPalette.textMuted, fontSize: 13 }}>Cost</span>
        <span style={{ fontSize: 13 }}>{money(stream.cost)}</span>
      </div>
      <div className="flex items-baseline justify-between" style={{ borderTop: `1px solid ${adminPalette.border}`, paddingTop: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Profit</span>
        <span style={{ fontSize: emphasise ? 18 : 15, fontWeight: 700, color: stream.profit >= 0 ? adminPalette.teal : adminPalette.red }}>
          {money(stream.profit)}
        </span>
      </div>
      <span style={{ color: adminPalette.textMuted, fontSize: 12, textAlign: 'right' }}>{stream.marginPercent}% margin</span>
    </div>
  )
}
