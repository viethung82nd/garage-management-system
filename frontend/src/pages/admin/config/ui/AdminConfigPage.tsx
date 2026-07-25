import { ClockCircleOutlined, TeamOutlined, ToolOutlined } from '@ant-design/icons'
import { Button, Card, Form, InputNumber } from 'antd'
import { useEffect, useState, type ReactNode } from 'react'
import { fetchSystemConfig, updateSystemConfig, type SystemConfig } from '../api/configApi'
import { AdminShell, adminPalette } from '../../ui/AdminShell'
import { InlineBanner } from '../../../../widgets/backoffice-shell'
import { useAuth } from '../../../../shared/auth'

function SectionCard({
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

function HourTimeline({ openHour, lastSlotHour }: { openHour?: number; lastSlotHour?: number }) {
  const hours = Array.from({ length: 24 }, (_, hour) => hour)
  const open = typeof openHour === 'number' ? openHour : -1
  const last = typeof lastSlotHour === 'number' ? lastSlotHour : -1

  return (
    <div className="flex gap-[3px]">
      {hours.map((hour) => {
        const isBookable = open >= 0 && last >= open && hour >= open && hour <= last
        return (
          <div
            key={hour}
            className="h-8 flex-1 rounded-[3px] transition-colors duration-200"
            style={{ background: isBookable ? adminPalette.red : '#eef1f5' }}
            title={`${hour}:00`}
          />
        )
      })}
    </div>
  )
}

export default function AdminConfigPage() {
  const { token } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [saved, setSaved] = useState(false)
  const [form] = Form.useForm<SystemConfig>()
  const openHour = Form.useWatch('openHour', form)
  const lastSlotHour = Form.useWatch('lastSlotHour', form)
  const slotCapacity = Form.useWatch('slotCapacity', form)
  const techShiftHours = Form.useWatch('techShiftHours', form)
  const capacityEfficiency = Form.useWatch('capacityEfficiency', form)
  const capacityReserveRatio = Form.useWatch('capacityReserveRatio', form)

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setRequestError('')
      try {
        const config = await fetchSystemConfig(token)
        if (cancelled) return
        form.setFieldsValue(config)
      } catch (error) {
        if (!cancelled) {
          setRequestError(error instanceof Error ? error.message : 'Unable to load system configuration.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [form, token])

  async function handleSubmit(values: SystemConfig) {
    if (!token) return
    setSaving(true)
    setRequestError('')
    setSaved(false)
    try {
      await updateSystemConfig(token, values)
      setSaved(true)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to save system configuration.')
    } finally {
      setSaving(false)
    }
  }

  const hasValidWindow = typeof openHour === 'number' && typeof lastSlotHour === 'number' && lastSlotHour >= openHour
  const slotCount = hasValidWindow ? lastSlotHour - openHour + 1 : 0
  const dailyCapacity = hasValidWindow && typeof slotCapacity === 'number' ? slotCount * slotCapacity : 0

  const hasLabourInputs =
    typeof techShiftHours === 'number' && typeof capacityEfficiency === 'number' && typeof capacityReserveRatio === 'number'
  const perTechnicianHours = hasLabourInputs
    ? (techShiftHours * 60 * capacityEfficiency * (1 - capacityReserveRatio)) / 60
    : 0

  return (
    <AdminShell eyebrow="Admin" title="System configuration">
      {requestError ? <InlineBanner tone="error">{requestError}</InlineBanner> : null}
      {saved ? <InlineBanner tone="success">Configuration saved.</InlineBanner> : null}

      <Form form={form} layout="vertical" onFinish={handleSubmit} onValuesChange={() => setSaved(false)}>
        <div className="grid gap-5 *:min-w-0 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex flex-col gap-5">
            <SectionCard icon={<ClockCircleOutlined />} eyebrow="Schedule" title="Booking window" enterDelay={1}>
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Form.Item
                  name="openHour"
                  label="Opening hour (24h)"
                  rules={[{ required: true, message: 'Opening hour is required' }]}
                  extra="The earliest hour customers can book a slot."
                >
                  <InputNumber min={0} max={23} style={{ width: '100%' }} disabled={isLoading} />
                </Form.Item>
                <Form.Item
                  name="lastSlotHour"
                  label="Last booking slot hour (24h)"
                  rules={[{ required: true, message: 'Last slot hour is required' }]}
                  extra="The latest hour a new booking slot opens."
                >
                  <InputNumber min={0} max={23} style={{ width: '100%' }} disabled={isLoading} />
                </Form.Item>
              </div>
            </SectionCard>

            <SectionCard icon={<TeamOutlined />} eyebrow="Capacity" title="Slot capacity" enterDelay={2}>
              <Form.Item
                name="slotCapacity"
                label="Bookings per slot"
                rules={[{ required: true, message: 'Slot capacity is required' }]}
                extra="Maximum number of vehicles accepted per hourly slot."
              >
                <InputNumber min={1} style={{ width: '100%', maxWidth: 280 }} disabled={isLoading} />
              </Form.Item>
            </SectionCard>

            <SectionCard icon={<ToolOutlined />} eyebrow="Capacity" title="Labour capacity" enterDelay={3}>
              <p className="mb-4 text-sm leading-relaxed" style={{ color: adminPalette.inkSoft }}>
                Drives the "Available hours" figure service advisors see on Booking requests — the labour-minutes
                signal, separate from the seat count above.
              </p>
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Form.Item
                  name="techShiftHours"
                  label="Technician shift length"
                  rules={[{ required: true, message: 'Shift length is required' }]}
                  extra="Paid hours a technician is rostered for in a working day."
                >
                  <InputNumber min={1} max={24} addonAfter="h" style={{ width: '100%' }} disabled={isLoading} />
                </Form.Item>
                <Form.Item
                  name="defaultJobMinutes"
                  label="Default job duration"
                  rules={[{ required: true, message: 'Default job duration is required' }]}
                  extra="Used when a booking's service has no estimated duration on file."
                >
                  <InputNumber min={1} max={1440} addonAfter="min" style={{ width: '100%' }} disabled={isLoading} />
                </Form.Item>
                <Form.Item
                  name="capacityEfficiency"
                  label="Technician efficiency"
                  rules={[{ required: true, message: 'Efficiency is required' }]}
                  extra="Share of a shift that becomes billable wrench time (breaks, admin, cleanup eat into the rest)."
                >
                  <InputNumber<number>
                    min={0}
                    max={1}
                    step={0.01}
                    style={{ width: '100%' }}
                    disabled={isLoading}
                    formatter={(value) => (value === undefined || value === null ? '' : `${Math.round(Number(value) * 100)}%`)}
                    parser={(value) => (Number((value ?? '').replace(/[^\d.]/g, '')) || 0) / 100}
                  />
                </Form.Item>
                <Form.Item
                  name="capacityReserveRatio"
                  label="Reserved buffer"
                  rules={[{ required: true, message: 'Reserved buffer is required' }]}
                  extra="Kept unbooked for walk-ins, warranty comebacks and running-late carry-over."
                >
                  <InputNumber<number>
                    min={0}
                    max={1}
                    step={0.01}
                    style={{ width: '100%' }}
                    disabled={isLoading}
                    formatter={(value) => (value === undefined || value === null ? '' : `${Math.round(Number(value) * 100)}%`)}
                    parser={(value) => (Number((value ?? '').replace(/[^\d.]/g, '')) || 0) / 100}
                  />
                </Form.Item>
              </div>
              {hasLabourInputs ? (
                <p className="mt-1 text-sm" style={{ color: adminPalette.inkSoft }}>
                  Example: <strong style={{ color: adminPalette.ink }}>1</strong> technician on a full shift contributes{' '}
                  <strong style={{ color: adminPalette.ink }}>{perTechnicianHours.toFixed(1)}h</strong> of available capacity.
                </p>
              ) : null}
            </SectionCard>

            <div>
              <Button type="primary" htmlType="submit" loading={saving} disabled={isLoading}>
                Save configuration
              </Button>
            </div>
          </div>

          <Card
            bordered={false}
            className="bo-enter bo-enter-4 h-fit rounded-2xl"
            styles={{ body: { padding: 24 } }}
            style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, border: `1px solid ${adminPalette.border}` }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: adminPalette.textMuted }}>
              Live preview
            </div>
            <div className="mt-1 text-[16px] font-semibold" style={{ color: adminPalette.ink }}>
              Daily booking window
            </div>

            <p className="mt-4 text-sm leading-relaxed" style={{ color: adminPalette.inkSoft }}>
              {hasValidWindow ? (
                <>
                  Customers can book appointments between{' '}
                  <strong style={{ color: adminPalette.ink }}>
                    {String(openHour).padStart(2, '0')}:00–{String(lastSlotHour).padStart(2, '0')}:00
                  </strong>
                  , with up to <strong style={{ color: adminPalette.ink }}>{slotCapacity ?? '—'}</strong> booking
                  {slotCapacity === 1 ? '' : 's'} accepted per hourly slot.
                </>
              ) : (
                'Set an opening hour and a last booking slot hour to see a preview of the daily schedule.'
              )}
            </p>

            <div className="mt-5">
              <HourTimeline openHour={openHour} lastSlotHour={lastSlotHour} />
              <div className="mt-2 flex justify-between text-[10px] font-medium uppercase tracking-wide" style={{ color: adminPalette.textMuted }}>
                <span>00:00</span>
                <span>12:00</span>
                <span>23:00</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3" style={{ background: adminPalette.panelAlt }}>
                <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: adminPalette.textMuted }}>
                  Bookable slots / day
                </div>
                <div className="mt-1 text-[20px] font-semibold" style={{ color: adminPalette.ink }}>
                  {slotCount || '—'}
                </div>
              </div>
              <div className="rounded-xl p-3" style={{ background: adminPalette.panelAlt }}>
                <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: adminPalette.textMuted }}>
                  Max vehicles / day
                </div>
                <div className="mt-1 text-[20px] font-semibold" style={{ color: adminPalette.ink }}>
                  {dailyCapacity || '—'}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Form>
    </AdminShell>
  )
}
