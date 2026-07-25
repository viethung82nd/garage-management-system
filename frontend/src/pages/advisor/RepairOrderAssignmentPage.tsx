import {
  CarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  DownOutlined,
  FileTextOutlined,
  HistoryOutlined,
  PauseCircleOutlined,
  ProfileOutlined,
  SendOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { Button, Card, Checkbox, Col, Dropdown, Empty, Input, Modal, Row, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  deliverVehicleApi,
  fetchWorkshopRepairOrderById,
  fetchWorkshopRepairOrders,
  fetchWorkshopTechnicians,
  orderId as formatOrderId,
  personName,
  unwrapArray,
  updateRepairOrderStatus,
  updateWorkshopRepairOrder,
  vehicleName,
  vehiclePlate,
  type ApiRepairOrder,
  type ApiTechnician,
} from '../../shared/api/workshop'
import { useAuth } from '../../shared/auth'
import { SignaturePad } from '../../shared/ui/SignaturePad'
import { InlineBanner, advisorPalette, useApiMessage } from '../../widgets/backoffice-shell'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(value))} ₫`
}

type OrderStatusKey =
  | 'pending'
  | 'inProgress'
  | 'waitingParts'
  | 'waitingCustomer'
  | 'onHold'
  | 'completed'
  | 'reworkRequired'
  | 'readyForDelivery'
  | 'delivered'
  | 'closed'
  | 'cancelled'

const orderStatusLabels: Record<OrderStatusKey, string> = {
  pending: 'Pending',
  inProgress: 'In progress',
  waitingParts: 'Waiting on parts',
  waitingCustomer: 'Waiting on customer',
  onHold: 'On hold',
  completed: 'Completed',
  reworkRequired: 'Rework required',
  readyForDelivery: 'Ready for delivery',
  delivered: 'Delivered',
  closed: 'Closed',
  cancelled: 'Cancelled',
}

const orderStatusColors: Record<OrderStatusKey, string> = {
  pending: 'default',
  inProgress: 'red',
  waitingParts: 'gold',
  waitingCustomer: 'gold',
  onHold: 'orange',
  completed: 'green',
  reworkRequired: 'volcano',
  readyForDelivery: 'blue',
  delivered: 'cyan',
  closed: 'default',
  cancelled: 'default',
}

function statusLabel(status?: string) {
  return status && status in orderStatusLabels
    ? orderStatusLabels[status as OrderStatusKey]
    : status || 'Unknown'
}

function statusColor(status?: string) {
  return status && status in orderStatusColors
    ? orderStatusColors[status as OrderStatusKey]
    : 'default'
}

/** Statuses the advisor can move an order into from here — each requires a reason, enforced by the backend. */
const WAITING_STATUS_MENU_ITEMS = [
  { key: 'waitingParts', label: orderStatusLabels.waitingParts },
  { key: 'waitingCustomer', label: orderStatusLabels.waitingCustomer },
  { key: 'onHold', label: orderStatusLabels.onHold },
]

type Technician = {
  id: string
  activeOrders: number
  name: string
  skill?: string
  status: 'available' | 'busy' | 'offline'
}

function mapTechnician(technician: ApiTechnician): Technician {
  return {
    activeOrders: technician.activeOrders || 0,
    id: technician._id || technician.id || crypto.randomUUID(),
    name: technician.fullName || technician.email || 'Technician',
    skill: technician.skill || undefined,
    status:
      technician.status === 'busy'
        ? 'busy'
        : technician.status === 'off' || technician.status === 'offline'
          ? 'offline'
          : 'available',
  }
}

const statusTag: Record<Technician['status'], { color: string; label: string }> = {
  available: { color: 'green', label: 'Available' },
  busy: { color: 'gold', label: 'Busy' },
  offline: { color: 'default', label: 'Off shift' },
}

// ============= PRODUCTION BOARD (merged in — this doubles as the "pick an
// order" landing view when the page arrives with no ?orderId=) =============

type BoardColumnKey = 'pending' | 'inProgress' | 'waiting' | 'ready' | 'finished'

// Terminal statuses — an order here is done, closed out, immutable per
// BR-RO-06 (reopening one needs manager-level access, out of scope for this
// board). The "Finished" column lists them read-only, newest first.
const HISTORY_STATUSES = ['completed', 'delivered', 'closed']

/** Reuses the same status→color mapping the detail view's tags use
 * (orderStatusColors above), so a column's accent always means the same
 * thing everywhere on this page — not a second, competing color system. */
const BOARD_COLUMNS: {
  key: BoardColumnKey
  title: string
  statuses: string[]
  icon: React.ReactNode
  accent: string
}[] = [
  {
    key: 'pending',
    statuses: ['pending'],
    title: 'Pending',
    icon: <ClockCircleOutlined />,
    accent: advisorPalette.textMuted,
  },
  {
    key: 'inProgress',
    statuses: ['inProgress'],
    title: 'In progress',
    icon: <ToolOutlined />,
    accent: advisorPalette.red,
  },
  {
    key: 'waiting',
    statuses: ['waitingParts', 'waitingCustomer', 'onHold'],
    title: 'Waiting',
    icon: <PauseCircleOutlined />,
    accent: advisorPalette.amber,
  },
  {
    key: 'ready',
    statuses: ['readyForDelivery'],
    title: 'Ready for delivery',
    icon: <SendOutlined />,
    accent: advisorPalette.green,
  },
  {
    key: 'finished',
    statuses: HISTORY_STATUSES,
    title: 'Finished',
    icon: <HistoryOutlined />,
    accent: advisorPalette.navy,
  },
]

type BoardCard = {
  id: string
  code: string
  plate: string
  vehicleLabel: string
  customer: string
  technician: string
  promisedAt?: string
  isComeback?: boolean
  status: string
  invoicedAt?: string
  totalCost: number
  finishedAt?: string
}

function mapBoardCard(order: ApiRepairOrder): BoardCard {
  const vehicle = order.vehicleId || order.vehicle
  return {
    code: formatOrderId(order),
    id: order._id || order.id || crypto.randomUUID(),
    isComeback: order.isComeback,
    invoicedAt: order.invoicedAt,
    plate: vehiclePlate(vehicle),
    vehicleLabel: vehicleName(vehicle),
    customer: personName(order.customer || vehicle?.customerId || vehicle?.customer, 'Customer'),
    promisedAt: order.promisedAt,
    status: order.status || '',
    technician: personName(order.technicianId || order.technician, 'Unassigned'),
    totalCost: order.totalCost || 0,
    finishedAt: order.deliveredAt || order.completedAt,
  }
}

/** Countdown/overdue label against the promised handover time — ticks every
 * minute via the `now` state in the calling component, not internally. */
function promiseState(promisedAt: string | undefined, now: number) {
  if (!promisedAt) return { label: 'No promised time', late: false }
  const target = new Date(promisedAt).getTime()
  if (Number.isNaN(target)) return { label: 'No promised time', late: false }

  const diffMs = target - now
  const late = diffMs < 0
  const absMinutes = Math.round(Math.abs(diffMs) / 60000)
  const hours = Math.floor(absMinutes / 60)
  const minutes = absMinutes % 60
  const duration = hours > 0 ? `${hours}h${String(minutes).padStart(2, '0')}` : `${minutes}p`
  return { label: late ? `${duration} late` : `${duration} remaining`, late }
}

function BoardCardItem({
  card,
  now,
  accent,
  icon,
  finished,
  onClick,
}: {
  card: BoardCard
  now: number
  accent: string
  icon: React.ReactNode
  finished?: boolean
  onClick: () => void
}) {
  const promise = promiseState(card.promisedAt, now)
  // A finished order can't be "late" any more — that countdown only means
  // something for work still in flight, so it's replaced with a plain
  // finished-date tag instead of a stale/misleading urgency signal.
  const lineColor = finished ? accent : promise.late ? advisorPalette.red : accent

  return (
    <Card
      hoverable
      onClick={onClick}
      size="small"
      style={{
        background: !finished && promise.late ? '#fff5f4' : advisorPalette.panel,
        border: `1px solid ${!finished && promise.late ? advisorPalette.red : advisorPalette.border}`,
        borderLeft: `4px solid ${lineColor}`,
        borderRadius: 12,
        cursor: 'pointer',
      }}
      styles={{ body: { padding: '12px 14px' } }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span style={{ color: lineColor, fontSize: 13 }}>{icon}</span>
          <span style={{ color: advisorPalette.ink, fontSize: 13, fontWeight: 700 }}>
            {card.code}
          </span>
        </div>
        {card.isComeback ? (
          <Tag color={advisorPalette.amber} style={{ marginInlineEnd: 0 }}>
            Comeback
          </Tag>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 10 }}>
        <span
          style={{
            background: advisorPalette.panelAlt,
            color: advisorPalette.ink,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.02em',
            padding: '2px 8px',
            borderRadius: 6,
          }}
        >
          {card.plate}
        </span>
        <span style={{ color: advisorPalette.textMuted, fontSize: 12 }}>{card.vehicleLabel}</span>
      </div>

      <div
        className="flex items-center gap-1"
        style={{ color: advisorPalette.textMuted, fontSize: 12, marginTop: 8 }}
      >
        <ProfileOutlined style={{ fontSize: 11 }} /> {card.technician}
      </div>

      {finished ? (
        <Tag color={statusColor(card.status)} style={{ marginInlineEnd: 0, marginTop: 10 }}>
          {statusLabel(card.status)}
          {card.finishedAt ? ` · ${new Date(card.finishedAt).toLocaleDateString('vi-VN')}` : ''}
        </Tag>
      ) : (
        <Tag
          color={promise.late ? 'red' : 'default'}
          icon={<ClockCircleOutlined />}
          style={{ marginInlineEnd: 0, marginTop: 10 }}
        >
          {promise.label}
        </Tag>
      )}
    </Card>
  )
}

/** Shown when the page arrives with no ?orderId= — every order, grouped by
 * status. Doubles as both the shop-floor overview and the entry point into
 * the assign/status/deliver actions below (click a card to drill in). */
function ProductionBoard({
  orders,
  now,
  onPick,
}: {
  orders: ApiRepairOrder[]
  now: number
  onPick: (id: string) => void
}) {
  const cardsByColumn = useMemo(() => {
    const cards = orders.map(mapBoardCard)
    const grouped: Record<BoardColumnKey, BoardCard[]> = {
      finished: [],
      inProgress: [],
      pending: [],
      ready: [],
      waiting: [],
    }
    BOARD_COLUMNS.forEach((column) => {
      grouped[column.key] = cards.filter((card) => column.statuses.includes(card.status))
    })
    // Passing QC doesn't mean the car can actually go out the door — the
    // customer still has to be billed first. Showing it as "ready" here
    // would be misleading, so it stays off the board entirely until invoiced.
    grouped.ready = grouped.ready.filter((card) => Boolean(card.invoicedAt))
    // Most-recently-finished first — matches how the other columns read
    // (newest thing needing attention on top).
    grouped.finished = grouped.finished
      .slice()
      .sort((a, b) => (b.finishedAt || '').localeCompare(a.finishedAt || ''))
    return grouped
  }, [orders])

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {BOARD_COLUMNS.map((column) => {
        const cards = cardsByColumn[column.key]
        return (
          <div className="flex flex-col gap-3" key={column.key}>
            <div
              className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
              style={{
                background: advisorPalette.panel,
                border: `1px solid ${advisorPalette.border}`,
                borderTop: `3px solid ${column.accent}`,
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: column.accent, fontSize: 14 }}>{column.icon}</span>
                <span style={{ color: advisorPalette.ink, fontSize: 13, fontWeight: 700 }}>
                  {column.title}
                </span>
              </div>
              <span
                style={{
                  background: column.accent,
                  borderRadius: 999,
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 700,
                  minWidth: 22,
                  padding: '1px 8px',
                  textAlign: 'center',
                }}
              >
                {cards.length}
              </span>
            </div>
            <div
              className="flex flex-col gap-2"
              style={{ maxHeight: 640, overflowY: 'auto', paddingRight: 2 }}
            >
              {cards.length ? (
                cards.map((card) => (
                  <BoardCardItem
                    accent={column.accent}
                    card={card}
                    finished={column.key === 'finished'}
                    icon={column.icon}
                    key={card.id}
                    now={now}
                    onClick={() => onPick(card.id)}
                  />
                ))
              ) : (
                <Card
                  bordered={false}
                  size="small"
                  style={{
                    background: advisorPalette.panel,
                    border: `1px dashed ${advisorPalette.border}`,
                  }}
                >
                  <Empty description="No orders" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </Card>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function RepairOrderAssignmentPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderIdParam = searchParams.get('orderId') || undefined

  const [order, setOrder] = useState<ApiRepairOrder | null>(null)
  const [boardOrders, setBoardOrders] = useState<ApiRepairOrder[]>([])
  const [boardNow, setBoardNow] = useState(() => Date.now())
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('')
  const {
    message: apiMessage,
    tone: apiTone,
    showError,
    showSuccess,
    clear: clearApiMessage,
  } = useApiMessage()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Move-to-waiting-status control — the backend requires a reason for these.
  const [statusTarget, setStatusTarget] = useState<string | null>(null)
  const [statusReason, setStatusReason] = useState('')
  const [statusReasonError, setStatusReasonError] = useState<string>()
  const [statusSaving, setStatusSaving] = useState(false)

  // Vehicle handover — signature + old-parts confirmation for orders ready for delivery.
  const [deliverOpen, setDeliverOpen] = useState(false)
  const [oldPartsReturned, setOldPartsReturned] = useState(false)
  const [deliverySignature, setDeliverySignature] = useState<string | undefined>()
  const [deliverSaving, setDeliverSaving] = useState(false)

  useEffect(() => {
    if (!token || orderIdParam) return
    const authToken = token
    let cancelled = false

    async function loadBoard() {
      try {
        const response = await fetchWorkshopRepairOrders(authToken)
        if (cancelled) return
        setBoardOrders(unwrapArray<ApiRepairOrder>(response, ['repairOrders', 'orders']))
      } catch (err) {
        if (!cancelled)
          showError(
            err instanceof Error ? err.message : 'Unable to load repair orders from the API',
          )
      }
    }

    void loadBoard()
    return () => {
      cancelled = true
    }
  }, [token, orderIdParam])

  useEffect(() => {
    if (orderIdParam) return
    const interval = window.setInterval(() => setBoardNow(Date.now()), 60000)
    return () => window.clearInterval(interval)
  }, [orderIdParam])

  useEffect(() => {
    if (!token || !orderIdParam) {
      setOrder(null)
      return
    }
    const authToken = token
    let cancelled = false

    async function loadOrder() {
      try {
        const loadedOrder = await fetchWorkshopRepairOrderById(authToken, orderIdParam!)
        if (cancelled) return
        setOrder(loadedOrder)
        const existingTechId =
          loadedOrder.technicianId?._id || (loadedOrder.technicianId as unknown as string)
        if (existingTechId) setSelectedTechnicianId(String(existingTechId))
      } catch (err) {
        if (!cancelled)
          showError(err instanceof Error ? err.message : 'Unable to load this repair order')
      }
    }

    void loadOrder()
    return () => {
      cancelled = true
    }
  }, [token, orderIdParam])

  useEffect(() => {
    if (!token) return
    const authToken = token
    let cancelled = false

    async function loadTechnicians() {
      try {
        const technicianList = await fetchWorkshopTechnicians(authToken)
        if (!cancelled) setTechnicians(technicianList.map(mapTechnician))
      } catch (err) {
        if (!cancelled)
          showError(err instanceof Error ? err.message : 'Unable to load technicians from the API')
      }
    }

    void loadTechnicians()
    return () => {
      cancelled = true
    }
  }, [token])

  const selectedTechnician = technicians.find((tech) => tech.id === selectedTechnicianId)
  const services = order?.services || []
  const totalCost =
    order?.totalCost ||
    services.reduce((sum, service) => sum + (service.priceAtTime || 0) * (service.quantity || 1), 0)

  async function assignAndContinue() {
    if (!token || !orderIdParam || !selectedTechnicianId) return

    setSaving(true)
    clearApiMessage()
    try {
      await updateWorkshopRepairOrder(token, orderIdParam, { technicianId: selectedTechnicianId })
      setSaved(true)
      // The technician takes it from here — back to the queue of orders
      // still waiting on an assignment.
      navigate('/advisor/work-orders')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to assign a technician to this order')
    } finally {
      setSaving(false)
    }
  }

  function openStatusModal(target: string) {
    setStatusTarget(target)
    setStatusReason('')
    setStatusReasonError(undefined)
  }

  async function confirmStatusChange() {
    if (!token || !orderIdParam || !statusTarget) return
    if (!statusReason.trim()) {
      setStatusReasonError('Please enter a reason.')
      return
    }
    setStatusSaving(true)
    clearApiMessage()
    try {
      const updated = await updateRepairOrderStatus(
        token,
        orderIdParam,
        statusTarget,
        statusReason.trim(),
      )
      setOrder(updated)
      showSuccess('Order status updated.')
      setStatusTarget(null)
      setStatusReason('')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to update this repair order status')
    } finally {
      setStatusSaving(false)
    }
  }

  function openDeliverModal() {
    setDeliverOpen(true)
    setOldPartsReturned(false)
    setDeliverySignature(undefined)
  }

  async function confirmDeliver() {
    if (!token || !orderIdParam) return
    setDeliverSaving(true)
    clearApiMessage()
    try {
      const updated = await deliverVehicleApi(token, orderIdParam, {
        oldPartsReturned,
        signature: deliverySignature,
      })
      setOrder(updated)
      showSuccess('Vehicle delivered to customer.')
      setDeliverOpen(false)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to deliver the vehicle')
    } finally {
      setDeliverSaving(false)
    }
  }

  const vehicle = order?.vehicleId || order?.vehicle
  // Completed/delivered/closed orders are immutable (BR-RO-06 — reopening
  // one is a manager-level action, out of scope here), so their detail view
  // drops every action that implies more work is still to be done: no
  // status changes, no technician (re)assignment.
  const isFinished = HISTORY_STATUSES.includes(order?.status || '')
  // The order's own status only flips to inProgress when the assigned
  // technician actually clocks on (see repair-order.service.js#clockOn) — so
  // "pending" reliably means no hands-on work has started yet, and (re)picking
  // a technician here is harmless. Once it's moved past pending, casually
  // reassigning from this page would step on whoever is already mid-job;
  // that has to go through a Transfer Request (technician-initiated,
  // SA-approved) instead.
  const canAssignTechnician = order?.status === 'pending'
  const orderAccent =
    BOARD_COLUMNS.find((column) => column.statuses.includes(order?.status || ''))?.accent ??
    advisorPalette.red

  return (
    <ServiceAdvisorShell title="Work orders">
      {apiMessage ? <InlineBanner tone={apiTone}>{apiMessage}</InlineBanner> : null}

      {!orderIdParam ? (
        <ProductionBoard
          orders={boardOrders}
          now={boardNow}
          onPick={(id) => navigate(`/advisor/work-orders?orderId=${id}`)}
        />
      ) : !order ? (
        <Card
          bordered={false}
          className="bo-card-hover bo-enter rounded-2xl"
          style={{
            background: advisorPalette.panel,
            boxShadow: advisorPalette.shadow,
            border: `1px solid ${advisorPalette.border}`,
          }}
        >
          <Empty description="Loading repair order..." />
        </Card>
      ) : (
        <div className="grid items-start gap-5 *:min-w-0 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-5">
            <Card
              bordered={false}
              className="bo-card-hover bo-enter rounded-2xl"
              style={{
                background: advisorPalette.panel,
                boxShadow: advisorPalette.shadow,
                border: `1px solid ${advisorPalette.border}`,
                borderTop: `3px solid ${orderAccent}`,
              }}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    style={{
                      color: advisorPalette.textMuted,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    {formatOrderId(order)}
                  </span>
                  <Tag color={statusColor(order.status)}>{statusLabel(order.status)}</Tag>
                  {order.isComeback ? <Tag color={advisorPalette.amber}>Comeback</Tag> : null}
                </div>
                {isFinished ? null : (
                  <div className="flex items-center gap-2">
                    {order.status === 'readyForDelivery' ? (
                      <Button
                        icon={<CarOutlined />}
                        onClick={openDeliverModal}
                        size="small"
                        type="primary"
                      >
                        Deliver vehicle
                      </Button>
                    ) : null}
                    <Dropdown
                      menu={{
                        items: WAITING_STATUS_MENU_ITEMS,
                        onClick: ({ key }) => openStatusModal(key),
                      }}
                      trigger={['click']}
                    >
                      <Button size="small">
                        Change status <DownOutlined />
                      </Button>
                    </Dropdown>
                  </div>
                )}
              </div>

              <Row gutter={[16, 12]} style={{ marginTop: 14 }}>
                <Col span={12}>
                  <div style={{ color: advisorPalette.textMuted, fontSize: 12 }}>Customer</div>
                  <div style={{ color: advisorPalette.ink, fontWeight: 700 }}>
                    {personName(
                      order.customer || vehicle?.customerId || vehicle?.customer,
                      'Customer',
                    )}
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ color: advisorPalette.textMuted, fontSize: 12 }}>Vehicle</div>
                  <div style={{ color: advisorPalette.ink, fontWeight: 700 }}>
                    {vehicleName(vehicle)} · {vehiclePlate(vehicle)}
                  </div>
                </Col>
              </Row>

              {/* A condensed pointer to the approved quotation instead of
                  re-listing every line here a second time — the quote page
                  (with its own line items, discount/tax breakdown, history
                  and signatures) is the source of truth for that detail. */}
              <div
                className="flex items-center justify-between gap-3 flex-wrap"
                style={{ borderTop: `1px solid ${advisorPalette.border}`, marginTop: 16, paddingTop: 16 }}
              >
                {services.length ? (
                  <>
                    <div className="flex items-center gap-3">
                      <FileTextOutlined style={{ color: advisorPalette.red, fontSize: 18 }} />
                      <div>
                        <div style={{ color: advisorPalette.ink, fontWeight: 700 }}>
                          {services.length} confirmed service{services.length > 1 ? 's' : ''}
                        </div>
                        <div style={{ color: advisorPalette.textMuted, fontSize: 12 }}>
                          Total <span style={{ color: advisorPalette.red, fontWeight: 700 }}>{formatMoney(totalCost)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="small"
                      onClick={() => navigate(`/advisor/quotations?orderId=${order._id || order.id}`)}
                    >
                      View quotation
                    </Button>
                  </>
                ) : (
                  <span style={{ color: advisorPalette.textMuted, fontSize: 13 }}>
                    No confirmed services yet — this order needs a quotation approved by the customer first.
                  </span>
                )}
              </div>
            </Card>

            {canAssignTechnician ? (
              <Card
                bordered={false}
                className="bo-card-hover bo-enter rounded-2xl"
                style={{
                  background: advisorPalette.panel,
                  boxShadow: advisorPalette.shadow,
                  border: `1px solid ${advisorPalette.border}`,
                }}
                title="Assign technician"
              >
                <div className="flex flex-col gap-3">
                  {technicians.map((tech) => {
                    const selected = tech.id === selectedTechnicianId
                    const disabled = tech.status === 'offline'
                    return (
                      <button
                        disabled={disabled}
                        key={tech.id}
                        onClick={() => setSelectedTechnicianId(tech.id)}
                        style={{
                          background: selected ? '#fffafa' : advisorPalette.panelAlt,
                          border: `1px solid ${selected ? advisorPalette.red : advisorPalette.border}`,
                          borderRadius: 12,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.5 : 1,
                          padding: 16,
                          textAlign: 'left',
                        }}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span
                              style={{
                                alignItems: 'center',
                                background: selected ? advisorPalette.red : advisorPalette.panel,
                                border: `1px solid ${advisorPalette.border}`,
                                borderRadius: '50%',
                                color: selected ? '#ffffff' : advisorPalette.ink,
                                display: 'flex',
                                fontSize: 13,
                                fontWeight: 700,
                                height: 34,
                                justifyContent: 'center',
                                width: 34,
                              }}
                            >
                              {tech.name.slice(0, 1).toUpperCase()}
                            </span>
                            <div>
                              <div style={{ color: advisorPalette.ink, fontWeight: 700 }}>
                                {tech.name}
                              </div>
                              {tech.skill ? (
                                <div
                                  style={{
                                    color: advisorPalette.textMuted,
                                    fontSize: 13,
                                    marginTop: 2,
                                  }}
                                >
                                  {tech.skill}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <Tag color={statusTag[tech.status].color}>
                            {statusTag[tech.status].label}
                          </Tag>
                        </div>
                        <div
                          className="flex items-center gap-2"
                          style={{ color: advisorPalette.textMuted, fontSize: 12, marginTop: 10 }}
                        >
                          <ProfileOutlined /> {tech.activeOrders} active orders
                        </div>
                      </button>
                    )
                  })}
                </div>
              </Card>
            ) : null}
          </div>

          <div className="flex flex-col gap-5" style={{ position: 'sticky', top: 96 }}>
            <Card
              bordered={false}
              className="bo-card-hover bo-enter rounded-2xl"
              style={{ background: advisorPalette.ink, boxShadow: advisorPalette.shadow }}
            >
              <div
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Work order
              </div>
              <div style={{ color: 'white', fontSize: 22, fontWeight: 700, marginTop: 8 }}>
                {formatOrderId(order)}
              </div>
              <Tag color={isFinished ? statusColor(order.status) : saved ? 'green' : 'default'} style={{ marginTop: 8 }}>
                {isFinished
                  ? statusLabel(order.status)
                  : saved
                    ? 'Assigned'
                    : order.technicianId
                      ? 'Previously assigned'
                      : 'Awaiting assignment'}
              </Tag>
              <Row gutter={12} style={{ marginTop: 16 }}>
                <Col span={12}>
                  <div
                    style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 }}
                  >
                    <div
                      style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      Services
                    </div>
                    <div style={{ color: 'white', fontSize: 22, fontWeight: 700, marginTop: 6 }}>
                      {String(services.length).padStart(2, '0')}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 }}
                  >
                    <div
                      style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      Total
                    </div>
                    <div style={{ color: 'white', fontSize: 16, fontWeight: 700, marginTop: 6 }}>
                      {formatMoney(totalCost)}
                    </div>
                  </div>
                </Col>
              </Row>
              {canAssignTechnician ? (
                <>
                  <div
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.1)',
                      marginTop: 20,
                      paddingTop: 20,
                    }}
                  >
                    <div
                      style={{
                        color: 'rgba(255,255,255,0.55)',
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      Assigning to
                    </div>
                    <div style={{ color: 'white', fontSize: 18, fontWeight: 700, marginTop: 8 }}>
                      {selectedTechnician?.name ?? 'No technician selected'}
                    </div>
                  </div>
                  <Button
                    block
                    disabled={!services.length || !selectedTechnicianId}
                    icon={<CheckOutlined />}
                    loading={saving}
                    onClick={assignAndContinue}
                    size="large"
                    style={{ marginTop: 16 }}
                    type="primary"
                  >
                    {saving ? 'Assigning...' : 'Assign & send to technician'}
                  </Button>
                </>
              ) : (
                // Once past pending, this is read-only — reassigning here
                // would step on whoever is already mid-job; that has to go
                // through a Transfer Request instead (see canAssignTechnician).
                <div
                  style={{
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    marginTop: 20,
                    paddingTop: 20,
                  }}
                >
                  <div
                    style={{
                      color: 'rgba(255,255,255,0.55)',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    Technician
                  </div>
                  <div style={{ color: 'white', fontSize: 18, fontWeight: 700, marginTop: 8 }}>
                    {personName(order.technicianId || order.technician, 'Unassigned')}
                  </div>
                  {isFinished && (order.completedAt || order.deliveredAt) ? (
                    <>
                      <div
                        style={{
                          color: 'rgba(255,255,255,0.55)',
                          fontSize: 11,
                          fontWeight: 700,
                          marginTop: 16,
                          textTransform: 'uppercase',
                        }}
                      >
                        Finished
                      </div>
                      <div style={{ color: 'white', fontSize: 16, fontWeight: 700, marginTop: 6 }}>
                        {new Date(order.deliveredAt || order.completedAt!).toLocaleDateString('vi-VN')}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      <Modal
        cancelText="Cancel"
        confirmLoading={statusSaving}
        okText="Confirm"
        onCancel={() => setStatusTarget(null)}
        onOk={confirmStatusChange}
        open={Boolean(statusTarget)}
        title={statusTarget ? `Change status to: ${statusLabel(statusTarget)}` : ''}
      >
        <div
          style={{
            color: advisorPalette.textMuted,
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 6,
            textTransform: 'uppercase',
          }}
        >
          Reason *
        </div>
        <Input.TextArea
          autoSize={{ minRows: 2, maxRows: 4 }}
          onChange={(event) => {
            setStatusReason(event.target.value)
            if (statusReasonError) setStatusReasonError(undefined)
          }}
          status={statusReasonError ? 'error' : undefined}
          value={statusReason}
        />
        {statusReasonError ? (
          <div style={{ color: advisorPalette.red, fontSize: 12, marginTop: 4 }}>
            {statusReasonError}
          </div>
        ) : null}
      </Modal>

      <Modal
        cancelText="Cancel"
        confirmLoading={deliverSaving}
        okText="Confirm delivery"
        onCancel={() => setDeliverOpen(false)}
        onOk={confirmDeliver}
        open={deliverOpen}
        title="Deliver vehicle"
      >
        <Checkbox
          checked={oldPartsReturned}
          onChange={(event) => setOldPartsReturned(event.target.checked)}
        >
          Old parts returned to customer
        </Checkbox>
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              color: advisorPalette.textMuted,
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 6,
              textTransform: 'uppercase',
            }}
          >
            Customer signature
          </div>
          <SignaturePad onChange={setDeliverySignature} value={deliverySignature} width={320} />
        </div>
      </Modal>
    </ServiceAdvisorShell>
  )
}
