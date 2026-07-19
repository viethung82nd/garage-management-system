import { Card, Empty, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth'
import { InlineBanner } from '../../../../widgets/backoffice-shell'
import { fetchAuditLogs, type AuditLogEntry } from '../../api/accountantApi'
import { AccountantShell, accountantPalette } from '../../ui/AccountantShell'

function formatDateTime(value?: string | null) {
  if (!value) return 'Updating'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

function actionLabel(action: AuditLogEntry['action']) {
  switch (action) {
    case 'invoiceGenerated':
      return 'Invoice generated'
    case 'invoiceSent':
      return 'Invoice sent'
    case 'paymentRecorded':
      return 'Payment recorded'
    default:
      return action
  }
}

function actionTone(action: AuditLogEntry['action']) {
  switch (action) {
    case 'invoiceGenerated':
      return { bg: '#dbeafe', color: '#1e3a5f' }
    case 'invoiceSent':
      return { bg: '#fef3c7', color: '#92400e' }
    case 'paymentRecorded':
      return { bg: '#d1fae5', color: '#047857' }
    default:
      return { bg: '#f3f4f6', color: '#6b7280' }
  }
}

export default function AuditTrailPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [requestError, setRequestError] = useState('')

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setRequestError('')
      try {
        const response = await fetchAuditLogs(token)
        if (!cancelled) setEntries(response.entries)
      } catch (error) {
        if (!cancelled) setRequestError(error instanceof Error ? error.message : 'Unable to load the audit trail.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [token])

  const columns: ColumnsType<AuditLogEntry> = [
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 200,
      render: (value: string) => <span style={{ color: accountantPalette.inkSoft }}>{formatDateTime(value)}</span>,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (value: AuditLogEntry['action']) => {
        const tone = actionTone(value)
        return (
          <Tag bordered={false} className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold !uppercase !tracking-[0.16em]" style={{ background: tone.bg, color: tone.color }}>
            {actionLabel(value)}
          </Tag>
        )
      },
    },
    {
      title: 'Actor',
      dataIndex: 'actorName',
      key: 'actorName',
      render: (value: string) => <span className="font-medium" style={{ color: accountantPalette.inkSoft }}>{value}</span>,
    },
    {
      title: 'Invoice',
      dataIndex: 'invoiceDisplayId',
      key: 'invoiceDisplayId',
      render: (value: string | null) => <span className="font-semibold" style={{ color: accountantPalette.ink }}>{value || '—'}</span>,
    },
    {
      title: 'Details',
      dataIndex: 'details',
      key: 'details',
      render: (value: string) => <span style={{ color: accountantPalette.textMuted }}>{value}</span>,
    },
    {
      title: '',
      key: 'action',
      render: (_, record) =>
        record.invoiceId ? (
          <Link to={`/accountant/invoices/confirm?kind=invoice&id=${record.invoiceId}`} onClick={(event) => event.stopPropagation()}>
            <span className="font-semibold" style={{ color: accountantPalette.red }}>View invoice</span>
          </Link>
        ) : null,
    },
  ]

  return (
    <AccountantShell eyebrow="Accountant dashboard" title="Audit trail">
      {requestError ? <InlineBanner tone="error">{requestError}</InlineBanner> : null}

      <Card
        bordered={false}
        className="bo-card-hover bo-enter rounded-2xl"
        styles={{ body: { padding: '4px 20px 20px' } }}
        style={{ background: accountantPalette.panel, boxShadow: accountantPalette.shadow, border: `1px solid ${accountantPalette.border}` }}
        title={
          <div className="py-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accountantPalette.textMuted }}>
              Billing activity
            </div>
            <div className="mt-1.5 text-[19px] leading-none font-semibold" style={{ color: accountantPalette.ink }}>
              Invoice &amp; payment actions
            </div>
          </div>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={entries}
          pagination={{ pageSize: 12, size: 'small' }}
          loading={isLoading}
          scroll={{ x: 900 }}
          className="bo-table"
          onRow={(record) =>
            record.invoiceId
              ? { style: { cursor: 'pointer' }, onClick: () => navigate(`/accountant/invoices/confirm?kind=invoice&id=${record.invoiceId}`) }
              : {}
          }
          locale={{ emptyText: <Empty description="No billing activity logged yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>
    </AccountantShell>
  )
}
