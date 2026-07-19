import { RightOutlined } from '@ant-design/icons'
import { Card, Empty, Segmented, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/auth'
import {
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

function OrderCard({ order, onOpen }: { order: WorkOrder; onOpen: () => void }) {
  const pct = order.stepsTotal ? Math.round((order.stepsDone / order.stepsTotal) * 100) : 0
  const isActive = order.status === 'inProgress' || order.status === 'reworkRequired'
  return (
    <button
      className="bo-card-hover"
      onClick={onOpen}
      type="button"
      style={{
        alignItems: 'center',
        background: technicianPalette.panel,
        border: `1px solid ${technicianPalette.border}`,
        borderRadius: 14,
        cursor: 'pointer',
        display: 'flex',
        gap: 16,
        padding: '16px 18px',
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
  )
}

export function TechnicianWorkOrdersPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState<TabKey | null>(null)
  const { message: apiMessage, tone: apiTone, showError, clear: clearApiMessage } = useApiMessage()

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
                visibleOrders.map((order) => <OrderCard key={order.id} onOpen={() => openOrder(order.id)} order={order} />)
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
    </TechnicianShell>
  )
}
