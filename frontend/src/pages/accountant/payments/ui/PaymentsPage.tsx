import { ClockCircleOutlined, CreditCardOutlined, WalletOutlined } from '@ant-design/icons'
import { Card, Empty, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth'
import { InlineBanner, StatCard } from '../../../../widgets/backoffice-shell'
import { fetchPayments, type PaymentApiRecord } from '../../api/accountantApi'
import { AccountantShell, accountantPalette } from '../../ui/AccountantShell'

function formatMoney(value: number, currency = 'VND') {
  if (currency === 'VND') {
    return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Updating'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

function invoiceDisplayId(id?: string | null) {
  if (!id) return 'Invoice pending'
  return `INV-${id.slice(-6).toUpperCase()}`
}

function paymentMethodLabel(method: string) {
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
      return method
  }
}

function statusTone(status: string) {
  switch (status) {
    case 'succeeded':
      return { bg: '#d1fae5', color: '#047857' }
    case 'pending':
      return { bg: '#fef3c7', color: '#92400e' }
    case 'failed':
      return { bg: '#fee2e2', color: '#dc2626' }
    case 'refunded':
      return { bg: '#f3f4f6', color: '#6b7280' }
    default:
      return { bg: '#f3f4f6', color: '#6b7280' }
  }
}

export default function PaymentsPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [payments, setPayments] = useState<PaymentApiRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [requestError, setRequestError] = useState('')

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setRequestError('')
      try {
        const response = await fetchPayments(token)
        if (!cancelled) setPayments(response.payments)
      } catch (error) {
        if (!cancelled) setRequestError(error instanceof Error ? error.message : 'Unable to load payments.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [token])

  const overviewCards = useMemo(() => {
    const succeeded = payments.filter((item) => item.status === 'succeeded')
    const pending = payments.filter((item) => item.status === 'pending')
    const totalCollected = succeeded.reduce((sum, item) => sum + item.amount, 0)

    return [
      { label: 'Total collected', value: succeeded.length, note: formatMoney(totalCollected), tone: 'emerald' as const, icon: <WalletOutlined /> },
      { label: 'Pending transactions', value: pending.length, note: 'Awaiting gateway result', tone: 'amber' as const, icon: <ClockCircleOutlined /> },
      { label: 'Payment records', value: payments.length, note: 'All-time attempts', tone: 'blue' as const, icon: <CreditCardOutlined /> },
    ]
  }, [payments])

  const columns = useMemo<ColumnsType<PaymentApiRecord>>(
    () => [
      {
        title: 'Date',
        dataIndex: 'paidAt',
        key: 'paidAt',
        render: (value: string | null) => <span style={{ color: accountantPalette.inkSoft }}>{formatDateTime(value)}</span>,
      },
      {
        title: 'Invoice',
        key: 'invoice',
        render: (_, record) => (
          <span className="font-semibold" style={{ color: accountantPalette.ink }}>{invoiceDisplayId(record.invoiceId?._id)}</span>
        ),
      },
      {
        title: 'Customer',
        key: 'customer',
        render: (_, record) => (
          <div className="space-y-1">
            <div className="font-medium" style={{ color: accountantPalette.inkSoft }}>{record.customerId?.fullName || 'Customer updating'}</div>
            {record.customerId?.phone ? <div className="text-xs" style={{ color: accountantPalette.textMuted }}>{record.customerId.phone}</div> : null}
          </div>
        ),
      },
      {
        title: 'Method',
        key: 'method',
        render: (_, record) => (
          <div className="space-y-1">
            <div>{paymentMethodLabel(record.method)}</div>
            {record.reference ? <div className="text-xs" style={{ color: accountantPalette.textMuted }}>Ref: {record.reference}</div> : null}
          </div>
        ),
      },
      {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
        render: (value: number) => <span className="font-semibold" style={{ color: accountantPalette.ink }}>{formatMoney(value)}</span>,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (value: string) => {
          const tone = statusTone(value)
          return (
            <Tag bordered={false} className="!rounded-full !px-3 !py-1 !text-[11px] !font-bold !uppercase !tracking-[0.16em]" style={{ background: tone.bg, color: tone.color }}>
              {value}
            </Tag>
          )
        },
      },
      {
        title: '',
        key: 'action',
        render: (_, record) =>
          record.invoiceId?._id ? (
            <Link to={`/accountant/invoices/confirm?kind=invoice&id=${record.invoiceId._id}`} onClick={(event) => event.stopPropagation()}>
              <span className="font-semibold" style={{ color: accountantPalette.red }}>View invoice</span>
            </Link>
          ) : null,
      },
    ],
    [],
  )

  return (
    <AccountantShell eyebrow="Accountant dashboard" title="Payments">
      <div className="gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {overviewCards.map((item, index) => (
          <StatCard key={item.label} label={item.label} value={item.value} note={item.note} icon={item.icon} palette={accountantPalette} tone={item.tone} enterDelay={index + 1} />
        ))}
      </div>

      {requestError ? <InlineBanner tone="error">{requestError}</InlineBanner> : null}

      <Card
        bordered={false}
        className="bo-card-hover bo-enter rounded-2xl"
        styles={{ body: { padding: '4px 20px 20px' } }}
        style={{ background: accountantPalette.panel, boxShadow: accountantPalette.shadow, border: `1px solid ${accountantPalette.border}` }}
        title={
          <div className="py-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accountantPalette.textMuted }}>
              Payments ledger
            </div>
            <div className="mt-1.5 text-[19px] leading-none font-semibold" style={{ color: accountantPalette.ink }}>
              Every recorded payment attempt
            </div>
          </div>
        }
      >
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={payments}
          pagination={{ pageSize: 10, size: 'small' }}
          loading={isLoading}
          scroll={{ x: 900 }}
          className="bo-table"
          onRow={(record) =>
            record.invoiceId?._id
              ? { style: { cursor: 'pointer' }, onClick: () => navigate(`/accountant/invoices/confirm?kind=invoice&id=${record.invoiceId!._id}`) }
              : {}
          }
          locale={{ emptyText: <Empty description="No payments recorded yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>
    </AccountantShell>
  )
}
