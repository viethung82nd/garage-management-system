import { CheckCircleOutlined, PrinterOutlined, SendOutlined } from '@ant-design/icons'
import { Button, Card, Divider, Space, Tag, Typography } from 'antd'
import { useLocation } from 'react-router-dom'
import { AccountantShell, accountantPalette } from '../../ui/AccountantShell'
import { invoiceConfirmation } from '../../model/mock'

const { Text } = Typography

export default function InvoiceConfirmPage() {
  const location = useLocation()
  const invoiceId = (location.state as { invoiceId?: string } | null)?.invoiceId ?? invoiceConfirmation.invoiceId

  return (
    <AccountantShell eyebrow="Accountant dashboard" title="Confirm invoice">
      <div
        className="gap-5"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.3fr) minmax(320px, 0.7fr)',
        }}
      >
        <Card bordered={false} className="rounded-[32px]" styles={{ body: { padding: 24 } }} style={{ background: accountantPalette.panel, boxShadow: accountantPalette.shadow }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: accountantPalette.textMuted }}>
                Ready for settlement
              </div>
              <div className="mt-2 font-['Oswald'] text-[32px] leading-none" style={{ color: accountantPalette.ink }}>
                {invoiceId}
              </div>
              <div className="mt-2 text-sm" style={{ color: accountantPalette.textMuted }}>
                Repair order {invoiceConfirmation.repairOrder} • issued {invoiceConfirmation.issuedAt}
              </div>
            </div>

            <Tag bordered={false} className="!rounded-full !px-4 !py-2 !text-[11px] !font-bold !uppercase !tracking-[0.18em]" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
              Awaiting final confirmation
            </Tag>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              { label: 'Customer', value: invoiceConfirmation.customer },
              { label: 'Contact', value: invoiceConfirmation.contact },
              { label: 'Vehicle', value: invoiceConfirmation.vehicle },
              { label: 'Payment method', value: invoiceConfirmation.paymentMethod },
              { label: 'Service advisor', value: invoiceConfirmation.serviceAdvisor },
              { label: 'Technician', value: invoiceConfirmation.technician },
            ].map((item) => (
              <div key={item.label} className="rounded-[22px] border px-4 py-4" style={{ borderColor: accountantPalette.border, background: 'rgba(255,255,255,0.7)' }}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accountantPalette.textMuted }}>
                  {item.label}
                </div>
                <div className="mt-2 text-sm font-semibold" style={{ color: accountantPalette.inkSoft }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <Divider />

          <div className="space-y-4">
            {invoiceConfirmation.items.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4 rounded-[20px] border px-4 py-4" style={{ borderColor: accountantPalette.border, background: 'rgba(255,255,255,0.72)' }}>
                <div>
                  <div className="font-semibold" style={{ color: accountantPalette.inkSoft }}>
                    {item.label}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.14em]" style={{ color: accountantPalette.textMuted }}>
                    Qty {item.qty}
                  </div>
                </div>
                <div className="font-['Oswald'] text-[26px] leading-none" style={{ color: accountantPalette.ink }}>
                  ${item.price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-5">
          <Card bordered={false} className="rounded-[32px]" styles={{ body: { padding: 24 } }} style={{ background: `linear-gradient(180deg, #1a1919 0%, #173a39 100%)`, boxShadow: '0 26px 65px rgba(15, 14, 14, 0.18)' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-white/60">Approval</div>
                <div className="mt-2 font-['Oswald'] text-[28px] leading-none text-white">Confirm before payment capture</div>
              </div>
              <CheckCircleOutlined className="text-xl text-[#ffb347]" />
            </div>

            <div className="mt-5 space-y-4">
              {[
                'Repair order scope was approved by customer.',
                'Service prices match the finalized repair order.',
                'Technician completion and advisor handoff were recorded.',
                'Payment method is available for settlement.',
              ].map((item) => (
                <div key={item} className="rounded-[18px] bg-white/6 px-4 py-3 text-sm font-medium text-white/84">
                  {item}
                </div>
              ))}
            </div>
          </Card>

          <Card bordered={false} className="rounded-[32px]" styles={{ body: { padding: 24 } }} style={{ background: accountantPalette.panel, boxShadow: accountantPalette.shadow }}>
            <div className="flex items-center justify-between">
              <Text className="!text-[12px] !font-semibold !uppercase !tracking-[0.18em]" style={{ color: accountantPalette.textMuted }}>
                Totals
              </Text>
              <span className="font-['Oswald'] text-[20px]" style={{ color: accountantPalette.ink }}>
                Summary
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {[
                ['Subtotal', invoiceConfirmation.subtotal],
                ['Tax', invoiceConfirmation.tax],
                ['Discount', invoiceConfirmation.discount],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span style={{ color: accountantPalette.textMuted }}>{label}</span>
                  <span className="font-semibold" style={{ color: accountantPalette.inkSoft }}>${Number(value).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <Divider />

            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold uppercase tracking-[0.18em]" style={{ color: accountantPalette.inkSoft }}>
                Grand total
              </span>
              <span className="font-['Oswald'] text-[34px] leading-none" style={{ color: accountantPalette.red }}>
                ${invoiceConfirmation.total.toFixed(2)}
              </span>
            </div>

            <Space direction="vertical" size="middle" className="mt-6 !flex">
              <Button type="primary" icon={<CheckCircleOutlined />} size="large" style={{ background: accountantPalette.red, borderColor: accountantPalette.red }}>
                Confirm & mark ready
              </Button>
              <Button icon={<SendOutlined />} size="large">
                Send invoice to customer
              </Button>
              <Button icon={<PrinterOutlined />} size="large">
                Print invoice copy
              </Button>
            </Space>
          </Card>
        </div>
      </div>
    </AccountantShell>
  )
}
