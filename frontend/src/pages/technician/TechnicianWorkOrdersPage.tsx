import { ClockCircleOutlined, PauseCircleOutlined, PlayCircleOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Card, Empty, Modal, Segmented, Select, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/auth'
import {
  clockOff,
  clockOn,
  fetchTimeLogs,
  fetchWorkshopRepairOrders,
  orderId,
  personName,
  unwrapArray,
  vehicleName,
  vehiclePlate,
  type ApiRepairOrder,
} from '../../shared/api/workshop'
import { InlineBanner, useApiMessage } from '../../widgets/backoffice-shell'
import { TechnicianShell, technicianPalette } from '../../widgets/technician-shell'

type WorkOrderStatus = 'pending' | 'inProgress' | 'completed' | 'reworkRequired' | 'cancelled'
type TabKey = 'active' | 'queued' | 'done'

type WorkOrder = {
  id: string
  code: string
  customer: string
  plate: string
  service: string
  status: WorkOrderStatus
  stepsDone: number
  stepsTotal: number
  vehicle: string
}

const statusLabels: Record<WorkOrderStatus, string> = {
  cancelled: 'Cancelled',
  completed: 'Completed',
  inProgress: 'In progress',
  pending: 'To start',
  reworkRequired: 'Needs rework',
}

const statusTagColors: Record<WorkOrderStatus, string> = {
  cancelled: 'default',
  completed: 'success',
  inProgress: 'red',
  pending: 'default',
  reworkRequired: 'gold',
}

type TimeLogInfo = {
  totalMinutes: number
  openLogId?: string
}

const PAUSE_REASON_OPTIONS = [
  { label: 'Chờ phụ tùng', value: 'Chờ phụ tùng' },
  { label: 'Chờ khách', value: 'Chờ khách' },
  { label: 'Hết ca', value: 'Hết ca' },
  { label: 'Tạm nghỉ', value: 'Tạm nghỉ' },
]

function formatDuration(totalMinutes: number) {
  const minutes = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours}h ${rest}m`
}

function tabOf(status: WorkOrderStatus): TabKey {
  if (status === 'inProgress' || status === 'reworkRequired') return 'active'
  if (status === 'pending') return 'queued'
  return 'done'
}

function mapRepairOrder(order: ApiRepairOrder): WorkOrder {
  const vehicle = order.vehicleId || order.vehicle
  const services = order.services || []
  const firstService = services[0]
  const serviceName = typeof firstService?.serviceId === 'object' ? firstService.serviceId.name : firstService?.name
  const status = (order.status as WorkOrderStatus) || 'pending'

  return {
    code: orderId(order),
    customer: personName(order.customer || vehicle?.customerId || vehicle?.customer, 'Customer'),
    id: order._id || order.id || '',
    plate: vehiclePlate(vehicle),
    service: serviceName ? (services.length > 1 ? `${serviceName} + ${services.length - 1} more` : serviceName) : 'Repair order',
    status,
    // A completed order counts as all steps done even for legacy orders
    // finished before per-step status tracking existed.
    stepsDone: status === 'completed' ? services.length : services.filter((item) => item.status === 'completed').length,
    stepsTotal: services.length,
    vehicle: vehicleName(vehicle),
  }
}

function OrderCard({
  order,
  onOpen,
  timeInfo,
  onClockOn,
  onClockOff,
  clockBusy,
  clockOnDisabled,
}: {
  order: WorkOrder
  onOpen: () => void
  timeInfo?: TimeLogInfo
  onClockOn: () => void
  onClockOff: () => void
  clockBusy: boolean
  clockOnDisabled: boolean
}) {
  const pct = order.stepsTotal ? Math.round((order.stepsDone / order.stepsTotal) * 100) : 0
  const isActive = order.status === 'inProgress' || order.status === 'reworkRequired'
  const hasOpenLog = Boolean(timeInfo?.openLogId)

  return (
    <div
      className="bo-card-hover"
      style={{
        background: technicianPalette.panel,
        border: `1px solid ${technicianPalette.border}`,
        borderRadius: 14,
        padding: '16px 18px',
      }}
    >
      <button
        onClick={onOpen}
        type="button"
        style={{
          alignItems: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          gap: 16,
          padding: 0,
          textAlign: 'left',
          width: '100%',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2">
            <span style={{ color: technicianPalette.ink, fontSize: 16, fontWeight: 700 }}>{order.vehicle}</span>
            <span style={{ color: technicianPalette.textMuted, fontSize: 14, fontWeight: 600 }}>· {order.plate}</span>
            <Tag color={statusTagColors[order.status]} style={{ marginInline: 4 }}>{statusLabels[order.status]}</Tag>
          </div>
          <div style={{ color: technicianPalette.textMuted, fontSize: 13, marginTop: 3 }}>
            {order.code} · {order.service}
          </div>
          {order.stepsTotal ? (
            <div className="mt-3 flex items-center gap-3" style={{ maxWidth: 340 }}>
              <div style={{ background: technicianPalette.panelAlt, borderRadius: 999, flex: 1, height: 6, overflow: 'hidden' }}>
                <div style={{ background: isActive ? technicianPalette.red : technicianPalette.ink, borderRadius: 999, height: '100%', width: `${pct}%` }} />
              </div>
              <span style={{ color: technicianPalette.textMuted, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{order.stepsDone}/{order.stepsTotal} steps</span>
            </div>
          ) : null}
        </div>
        <RightOutlined style={{ color: technicianPalette.textMuted, fontSize: 16 }} />
      </button>

      {isActive ? (
        <div
          className="mt-3 flex items-center justify-between gap-3"
          style={{ borderTop: `1px solid ${technicianPalette.border}`, paddingTop: 12 }}
        >
          <span style={{ alignItems: 'center', color: technicianPalette.textMuted, display: 'inline-flex', fontSize: 12, fontWeight: 600, gap: 6 }}>
            <ClockCircleOutlined /> {formatDuration(timeInfo?.totalMinutes ?? 0)} logged
          </span>
          <Button
            danger={hasOpenLog}
            disabled={!hasOpenLog && clockOnDisabled}
            icon={hasOpenLog ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            loading={clockBusy}
            onClick={hasOpenLog ? onClockOff : onClockOn}
            size="small"
            type="primary"
          >
            {hasOpenLog ? 'Clock off' : 'Clock on'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function TechnicianWorkOrdersPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState<TabKey | null>(null)
  const { message: apiMessage, tone: apiTone, showError, showSuccess, clear: clearApiMessage } = useApiMessage()

  const [timeLogInfo, setTimeLogInfo] = useState<Record<string, TimeLogInfo>>({})
  const [clockBusyId, setClockBusyId] = useState<string | null>(null)
  const [pauseModalOrderId, setPauseModalOrderId] = useState<string | null>(null)
  const [pauseReason, setPauseReason] = useState<string | undefined>()
  const [pauseSaving, setPauseSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    const authToken = token
    let cancelled = false

    async function loadOrders() {
      clearApiMessage()
      try {
        const query = user?._id || user?.id ? `?technicianId=${user._id || user.id}` : ''
        const response = await fetchWorkshopRepairOrders(authToken, query)
        const mapped = unwrapArray<ApiRepairOrder>(response, ['repairOrders', 'orders']).map(mapRepairOrder)
        if (!cancelled) {
          setOrders(mapped)
          setLoaded(true)
        }
      } catch (err) {
        if (!cancelled) {
          showError(err instanceof Error ? err.message : 'Unable to load assigned work orders from the API')
          setLoaded(true)
        }
      }
    }

    void loadOrders()
    return () => {
      cancelled = true
    }
  }, [token, user?._id, user?.id])

  const activeOrders = useMemo(() => orders.filter((order) => tabOf(order.status) === 'active'), [orders])
  const queuedOrders = useMemo(() => orders.filter((order) => tabOf(order.status) === 'queued'), [orders])
  const doneOrders = useMemo(() => orders.filter((order) => tabOf(order.status) === 'done'), [orders])

  const smartDefaultTab: TabKey = activeOrders.length ? 'active' : queuedOrders.length ? 'queued' : 'done'
  const effectiveTab = tab ?? smartDefaultTab
  const visibleOrders = effectiveTab === 'active' ? activeOrders : effectiveTab === 'queued' ? queuedOrders : doneOrders

  // The time clock only applies to orders currently being worked (active tab)
  // — fetch each one's log summary so the card can show accumulated time and
  // whether this technician has an open span running on it.
  const activeOrderIds = useMemo(() => activeOrders.map((order) => order.id).join(','), [activeOrders])

  async function loadTimeLogInfo(authToken: string, id: string) {
    try {
      const response = await fetchTimeLogs(authToken, id)
      const logs = response.timeLogs || []
      const openLog = logs.find((log) => !log.endedAt)
      setTimeLogInfo((current) => ({ ...current, [id]: { totalMinutes: response.totalMinutes || 0, openLogId: openLog?._id } }))
    } catch {
      // Best-effort — the clock control just falls back to "Clock on" with no elapsed time shown.
    }
  }

  useEffect(() => {
    if (!token || !activeOrderIds) return
    const authToken = token
    activeOrderIds.split(',').forEach((id) => {
      void loadTimeLogInfo(authToken, id)
    })
  }, [token, activeOrderIds])

  // A technician can only have one open time log at all — used to disable
  // "Clock on" on every other card once one is already running.
  const openLogOrderId = Object.entries(timeLogInfo).find(([, info]) => info.openLogId)?.[0]

  async function handleClockOn(id: string) {
    if (!token) return
    setClockBusyId(id)
    clearApiMessage()
    try {
      await clockOn(token, id)
      await loadTimeLogInfo(token, id)
      showSuccess('Clocked on.')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to clock on to this repair order')
    } finally {
      setClockBusyId(null)
    }
  }

  function openClockOffModal(id: string) {
    setPauseModalOrderId(id)
    setPauseReason(undefined)
  }

  async function confirmClockOff() {
    if (!token || !pauseModalOrderId) return
    const id = pauseModalOrderId
    setPauseSaving(true)
    clearApiMessage()
    try {
      await clockOff(token, id, pauseReason ? { pauseReason } : undefined)
      await loadTimeLogInfo(token, id)
      showSuccess('Clocked off.')
      setPauseModalOrderId(null)
      setPauseReason(undefined)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to clock off this repair order')
    } finally {
      setPauseSaving(false)
    }
  }

  function openOrder(id: string) {
    navigate(`/technician/repair-notes?orderId=${id}`)
  }

  return (
    <TechnicianShell eyebrow="Technician Workspace" title="My work orders">
      {apiMessage ? <InlineBanner tone={apiTone}>{apiMessage}</InlineBanner> : null}

      <Card
        bordered={false}
        className="bo-enter rounded-2xl"
        style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, border: `1px solid ${technicianPalette.border}` }}
        styles={{ body: { padding: 20 } }}
      >
        {!loaded ? (
          <Empty description="Loading your work orders..." image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : orders.length ? (
          <>
            <Segmented
              block
              onChange={(value) => setTab(value as TabKey)}
              options={[
                { label: `Active · ${activeOrders.length}`, value: 'active' },
                { label: `To start · ${queuedOrders.length}`, value: 'queued' },
                { label: `Done · ${doneOrders.length}`, value: 'done' },
              ]}
              size="large"
              value={effectiveTab}
            />
            <div className="mt-5 flex flex-col gap-3">
              {visibleOrders.length ? (
                visibleOrders.map((order) => (
                  <OrderCard
                    clockBusy={clockBusyId === order.id}
                    clockOnDisabled={Boolean(openLogOrderId && openLogOrderId !== order.id)}
                    key={order.id}
                    onClockOff={() => openClockOffModal(order.id)}
                    onClockOn={() => void handleClockOn(order.id)}
                    onOpen={() => openOrder(order.id)}
                    order={order}
                    timeInfo={timeLogInfo[order.id]}
                  />
                ))
              ) : (
                <Empty
                  description={
                    effectiveTab === 'active' ? 'Nothing in progress right now.' : effectiveTab === 'queued' ? 'No orders waiting to be started.' : 'No completed orders yet.'
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          </>
        ) : (
          <Empty description="No repair orders assigned to you yet." image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      <Modal
        cancelText="Cancel"
        confirmLoading={pauseSaving}
        okText="Clock off"
        onCancel={() => {
          setPauseModalOrderId(null)
          setPauseReason(undefined)
        }}
        onOk={confirmClockOff}
        open={Boolean(pauseModalOrderId)}
        title="Clock off"
      >
        <div style={{ color: technicianPalette.textMuted, fontSize: 13, marginBottom: 16 }}>
          Stop the timer running on this repair order.
        </div>
        <div style={{ color: technicianPalette.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6, textTransform: 'uppercase' }}>
          Pause reason
        </div>
        <Select
          allowClear
          onChange={setPauseReason}
          options={PAUSE_REASON_OPTIONS}
          placeholder="Select a reason"
          style={{ width: '100%' }}
          value={pauseReason}
        />
      </Modal>
    </TechnicianShell>
  )
}
