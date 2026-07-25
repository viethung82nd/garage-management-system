import { Card, Empty, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchWorkshopRepairOrders,
  orderId as formatOrderId,
  personName,
  unwrapArray,
  vehiclePlate,
  type ApiRepairOrder,
} from '../../shared/api/workshop'
import { useAuth } from '../../shared/auth'
import { InlineBanner, advisorPalette, useApiMessage } from '../../widgets/backoffice-shell'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

type ColumnKey = 'pending' | 'inProgress' | 'waiting' | 'ready'

const COLUMNS: { key: ColumnKey; title: string; statuses: string[] }[] = [
  { key: 'pending', statuses: ['pending'], title: 'Pending' },
  { key: 'inProgress', statuses: ['inProgress'], title: 'In progress' },
  { key: 'waiting', statuses: ['waitingParts', 'waitingCustomer', 'onHold'], title: 'Waiting' },
  { key: 'ready', statuses: ['readyForDelivery'], title: 'Ready for delivery' },
]

type BoardCard = {
  id: string
  code: string
  plate: string
  technician: string
  promisedAt?: string
  isComeback?: boolean
  status: string
  invoicedAt?: string
}

function mapCard(order: ApiRepairOrder): BoardCard {
  const vehicle = order.vehicleId || order.vehicle
  return {
    code: formatOrderId(order),
    id: order._id || order.id || crypto.randomUUID(),
    isComeback: order.isComeback,
    invoicedAt: order.invoicedAt,
    plate: vehiclePlate(vehicle),
    promisedAt: order.promisedAt,
    status: order.status || '',
    technician: personName(order.technicianId || order.technician, 'Unassigned'),
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
  return { label: late ? `Trễ hẹn · ${duration}` : `Còn ${duration}`, late }
}

function BoardCardItem({ card, now, onClick }: { card: BoardCard; now: number; onClick: () => void }) {
  const promise = promiseState(card.promisedAt, now)

  return (
    <Card
      bordered
      hoverable
      onClick={onClick}
      size="small"
      style={{
        background: promise.late ? '#fff1f0' : advisorPalette.panel,
        borderColor: promise.late ? advisorPalette.red : advisorPalette.border,
        cursor: 'pointer',
      }}
      styles={{ body: { padding: 12 } }}
    >
      <div className="flex items-center justify-between gap-2">
        <span style={{ color: advisorPalette.ink, fontSize: 13, fontWeight: 700 }}>{card.code}</span>
        {card.isComeback ? (
          <Tag color={advisorPalette.amber} style={{ marginInlineEnd: 0 }}>
            Comeback
          </Tag>
        ) : null}
      </div>
      <div style={{ color: advisorPalette.textMuted, fontSize: 12, marginTop: 4 }}>{card.plate}</div>
      <div style={{ color: advisorPalette.textMuted, fontSize: 12, marginTop: 2 }}>{card.technician}</div>
      <Tag color={promise.late ? 'red' : 'default'} style={{ marginInlineEnd: 0, marginTop: 8 }}>
        {promise.label}
      </Tag>
    </Card>
  )
}

export function ProductionBoardPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<ApiRepairOrder[]>([])
  const [now, setNow] = useState(() => Date.now())
  const { message: apiMessage, tone: apiTone, showError, clear: clearApiMessage } = useApiMessage()

  useEffect(() => {
    if (!token) return
    const authToken = token
    let cancelled = false

    async function load() {
      clearApiMessage()
      try {
        const response = await fetchWorkshopRepairOrders(authToken)
        if (cancelled) return
        setOrders(unwrapArray<ApiRepairOrder>(response, ['repairOrders', 'orders']))
      } catch (err) {
        if (!cancelled) showError(err instanceof Error ? err.message : 'Unable to load repair orders from the API')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60000)
    return () => window.clearInterval(interval)
  }, [])

  const cardsByColumn = useMemo(() => {
    const cards = orders.map(mapCard)
    const grouped: Record<ColumnKey, BoardCard[]> = { inProgress: [], pending: [], ready: [], waiting: [] }
    COLUMNS.forEach((column) => {
      grouped[column.key] = cards.filter((card) => column.statuses.includes(card.status))
    })
    // Passing QC doesn't mean the car can actually go out the door — the
    // customer still has to be billed first. Showing it as "ready" here
    // would be misleading, so it stays off the board entirely until invoiced.
    grouped.ready = grouped.ready.filter((card) => Boolean(card.invoicedAt))
    return grouped
  }, [orders])

  return (
    <ServiceAdvisorShell title="Production board">
      {apiMessage ? <InlineBanner tone={apiTone}>{apiMessage}</InlineBanner> : null}

      <div className="grid gap-4 lg:grid-cols-4">
        {COLUMNS.map((column) => {
          const cards = cardsByColumn[column.key]
          return (
            <div className="flex flex-col gap-3" key={column.key}>
              <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2" style={{ background: advisorPalette.panelAlt }}>
                <span style={{ color: advisorPalette.ink, fontSize: 13, fontWeight: 700 }}>{column.title}</span>
                <Tag style={{ marginInlineEnd: 0 }}>{cards.length}</Tag>
              </div>
              <div className="flex flex-col gap-2" style={{ maxHeight: 640, overflowY: 'auto', paddingRight: 2 }}>
                {cards.length ? (
                  cards.map((card) => (
                    <BoardCardItem card={card} key={card.id} now={now} onClick={() => navigate(`/advisor/work-orders?orderId=${card.id}`)} />
                  ))
                ) : (
                  <Card bordered={false} size="small" style={{ background: advisorPalette.panel, border: `1px dashed ${advisorPalette.border}` }}>
                    <Empty description="No orders" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  </Card>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </ServiceAdvisorShell>
  )
}
