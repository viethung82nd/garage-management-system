import { CheckOutlined, SwapOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Button, Card, Empty, Input, Select, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth'
import {
  createTransferRequestApi,
  fetchWorkshopRepairOrders,
  fetchWorkshopTechnicians,
  orderId,
  personName,
  updateWorkshopRepairProgress,
  unwrapArray,
  vehicleName,
  vehiclePlate,
  type ApiRepairOrder,
  type ApiTechnician,
} from '../../shared/api/workshop'
import { TechnicianShell, technicianPalette } from '../../widgets/technician-shell'

type WorkOrderStatus = 'assigned' | 'in-progress' | 'paused' | 'completed'
type Priority = 'high' | 'medium' | 'low'

type WorkOrder = {
  id: string
  bay: string
  customer: string
  duration: number
  note: string
  plate: string
  priority: Priority
  service: string
  start: string
  status: WorkOrderStatus
  vehicle: string
}

const timeBlocks = ['08:00', '09:00', '10:45', '13:30', '15:00', '16:30']

const statusLabels: Record<WorkOrderStatus, string> = {
  assigned: 'Assigned',
  completed: 'Completed',
  'in-progress': 'In progress',
  paused: 'Paused',
}

const statusColors: Record<WorkOrderStatus, string> = {
  assigned: 'default',
  completed: 'green',
  'in-progress': 'red',
  paused: 'gold',
}

const priorityLabels: Record<Priority, string> = {
  high: 'Urgent',
  low: 'Normal',
  medium: 'Recommended',
}

const priorityColors: Record<Priority, string> = {
  high: 'red',
  low: 'default',
  medium: 'gold',
}

function mapOrderStatus(status?: string): WorkOrderStatus {
  if (status === 'completed') return 'completed'
  if (status === 'inProgress' || status === 'in-progress' || status === 'reworkRequired') return 'in-progress'
  if (status === 'paused' || status === 'cancelled') return 'paused'
  return 'assigned'
}

function mapRepairOrder(order: ApiRepairOrder, index: number): WorkOrder {
  const vehicle = order.vehicleId || order.vehicle
  const services = order.services || []
  const firstService = services[0]
  const serviceName = typeof firstService?.serviceId === 'object' ? firstService.serviceId.name : firstService?.name

  return {
    bay: `Bay ${String((index % 4) + 1).padStart(2, '0')}`,
    customer: personName(order.customer || vehicle?.customerId || vehicle?.customer, 'Customer'),
    duration: services.reduce((sum, item) => sum + ((typeof item.serviceId === 'object' ? item.serviceId.estimatedDuration : 0) || 45) * (item.quantity || 1), 0) || 45,
    id: orderId(order),
    note: order.stepNotes?.at(-1)?.content || 'No technical note yet.',
    plate: vehiclePlate(vehicle),
    priority: index === 0 ? 'high' : 'medium',
    service: serviceName || 'Repair order',
    start: order.startedAt ? new Date(order.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : timeBlocks[index % timeBlocks.length],
    status: mapOrderStatus(order.status),
    vehicle: vehicleName(vehicle),
  }
}

function mapUiStatus(status: WorkOrderStatus) {
  if (status === 'in-progress') return 'inProgress'
  if (status === 'completed') return 'completed'
  return 'pending'
}

function WorkOrderCard({ active, onSelect, order }: { active: boolean; onSelect: () => void; order: WorkOrder }) {
  return (
    <button
      className="w-full rounded-[22px] p-5 text-left transition"
      onClick={onSelect}
      style={{
        background: active ? technicianPalette.panelAlt : technicianPalette.panel,
        border: active ? `2px solid ${technicianPalette.red}` : `1px solid ${technicianPalette.border}`,
        boxShadow: technicianPalette.shadow,
      }}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Tag color={priorityColors[order.priority]}>{priorityLabels[order.priority]}</Tag>
            <Tag color={statusColors[order.status]}>{statusLabels[order.status]}</Tag>
          </div>
          <h3 style={{ color: technicianPalette.ink, fontSize: 16, fontWeight: 700, marginTop: 10 }}>{order.vehicle}</h3>
          <p style={{ color: technicianPalette.red, fontSize: 12, fontWeight: 700, marginTop: 4 }}>{order.id} - {order.plate}</p>
        </div>
        <div className="text-right">
          <p style={{ color: technicianPalette.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Start</p>
          <p style={{ color: technicianPalette.ink, fontSize: 16, fontWeight: 700, marginTop: 6 }}>{order.start}</p>
        </div>
      </div>
      <p style={{ color: technicianPalette.ink, fontSize: 13, fontWeight: 600, marginTop: 12 }}>{order.service}</p>
      <p style={{ color: technicianPalette.textMuted, fontSize: 13, marginTop: 6 }}>{order.note}</p>
      <div className="mt-3 flex flex-wrap gap-2" style={{ color: technicianPalette.textMuted, fontSize: 12, fontWeight: 600 }}>
        <span style={{ background: technicianPalette.panelAlt, borderRadius: 10, padding: '4px 10px' }}>Customer: {order.customer}</span>
        <span style={{ background: technicianPalette.panelAlt, borderRadius: 10, padding: '4px 10px' }}>{order.duration} min</span>
        <span style={{ background: technicianPalette.panelAlt, borderRadius: 10, padding: '4px 10px' }}>{order.bay}</span>
      </div>
    </button>
  )
}

export function TechnicianWorkOrdersPage() {
  const { token, user } = useAuth()
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [apiOrders, setApiOrders] = useState<ApiRepairOrder[]>([])
  const [technicians, setTechnicians] = useState<ApiTechnician[]>([])
  const [transferTechnicianId, setTransferTechnicianId] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [apiMessage, setApiMessage] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [requestingTransfer, setRequestingTransfer] = useState(false)

  useEffect(() => {
    if (!token) return
    const authToken = token
    let cancelled = false

    async function loadOrders() {
      setApiMessage(undefined)
      try {
        const query = user?._id || user?.id ? `?technicianId=${user._id || user.id}` : ''
        const [response, technicianList] = await Promise.all([fetchWorkshopRepairOrders(authToken, query), fetchWorkshopTechnicians(authToken)])
        const liveOrders = unwrapArray<ApiRepairOrder>(response, ['repairOrders', 'orders'])
        const mappedOrders = liveOrders.map(mapRepairOrder)
        if (!cancelled) {
          setApiOrders(liveOrders)
          setOrders(mappedOrders)
          setSelectedOrderId((current) => current || mappedOrders[0]?.id || '')
          setTechnicians(technicianList.filter((technician) => (technician._id || technician.id) !== (user?._id || user?.id)))
        }
      } catch (err) {
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Unable to load assigned work orders from the API')
      }
    }

    void loadOrders()

    return () => {
      cancelled = true
    }
  }, [token, user?._id, user?.id])

  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) ??
    orders[0] ??
    { bay: '', customer: '', duration: 0, id: '', note: '', plate: '', priority: 'low' as Priority, service: '', start: '--:--', status: 'assigned' as WorkOrderStatus, vehicle: '' }
  const totalMinutes = orders.reduce((sum, order) => sum + order.duration, 0)
  const completedCount = orders.filter((order) => order.status === 'completed').length
  const inProgressCount = orders.filter((order) => order.status === 'in-progress').length

  function findSelectedApiOrder() {
    return apiOrders.find((order) => orderId(order) === selectedOrder.id)
  }

  async function updateSelectedStatus(status: WorkOrderStatus) {
    if (!orders.length || !token) return

    setSaving(true)
    setApiMessage(undefined)
    try {
      const apiOrder = findSelectedApiOrder()
      const requestId = apiOrder?._id || apiOrder?.id || selectedOrder.id
      await updateWorkshopRepairProgress(token, requestId, { status: mapUiStatus(status) })
      setOrders((current) => current.map((order) => (order.id === selectedOrder.id ? { ...order, status } : order)))
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Unable to update the order status')
    } finally {
      setSaving(false)
    }
  }

  async function submitTransferRequest() {
    if (!token || !transferTechnicianId) return

    const apiOrder = findSelectedApiOrder()
    const repairOrderId = apiOrder?._id || apiOrder?.id
    if (!repairOrderId) {
      setApiMessage('Select an assigned order before requesting a transfer.')
      return
    }

    setRequestingTransfer(true)
    setApiMessage(undefined)
    try {
      await createTransferRequestApi(token, { reason: transferReason || undefined, repairOrderId, toTechnicianId: transferTechnicianId })
      setApiMessage('Transfer request sent to the service advisor.')
      setTransferTechnicianId('')
      setTransferReason('')
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Unable to submit the transfer request')
    } finally {
      setRequestingTransfer(false)
    }
  }

  return (
    <TechnicianShell eyebrow="Technician Workspace" title="My work orders">
      {apiMessage ? (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 18, color: '#991b1b', padding: '12px 16px' }}>
          {apiMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4">
        <Card bordered={false} className="rounded-[24px]" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, width: 220 }}>
          <p style={{ color: technicianPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Assigned</p>
          <p style={{ color: technicianPalette.ink, fontSize: 26, fontWeight: 700, marginTop: 8 }}>{String(orders.length).padStart(2, '0')}</p>
        </Card>
        <Card bordered={false} className="rounded-[24px]" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, width: 220 }}>
          <p style={{ color: technicianPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>In progress</p>
          <p style={{ color: technicianPalette.ink, fontSize: 26, fontWeight: 700, marginTop: 8 }}>{String(inProgressCount).padStart(2, '0')}</p>
        </Card>
        <Card bordered={false} className="rounded-[24px]" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, width: 220 }}>
          <p style={{ color: technicianPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Completed</p>
          <p style={{ color: technicianPalette.ink, fontSize: 26, fontWeight: 700, marginTop: 8 }}>{String(completedCount).padStart(2, '0')}</p>
        </Card>
        <Card bordered={false} className="rounded-[24px]" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, width: 220 }}>
          <p style={{ color: technicianPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Total duration</p>
          <p style={{ color: technicianPalette.ink, fontSize: 26, fontWeight: 700, marginTop: 8 }}>{`${Math.round(totalMinutes / 60)}h${totalMinutes % 60 ? ` ${totalMinutes % 60}m` : ''}`}</p>
        </Card>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          <Card bordered={false} className="rounded-[28px]" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow }} title="Today's schedule">
            <div className="flex flex-col">
              {timeBlocks.map((slot) => {
                const order = orders.find((item) => item.start === slot)
                return (
                  <div className="grid gap-4 py-3" key={slot} style={{ borderBottom: `1px solid ${technicianPalette.border}`, gridTemplateColumns: '90px 1fr' }}>
                    <div style={{ color: technicianPalette.red, fontSize: 13, fontWeight: 700 }}>{slot}</div>
                    {order ? (
                      <div style={{ background: order.status === 'in-progress' ? '#fff1f2' : technicianPalette.panelAlt, borderRadius: 14, padding: 12 }}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p style={{ color: technicianPalette.ink, fontWeight: 700 }}>{order.service}</p>
                            <p style={{ color: technicianPalette.textMuted, fontSize: 13, marginTop: 2 }}>{order.vehicle} - {order.plate}</p>
                          </div>
                          <Tag color={statusColors[order.status]}>{statusLabels[order.status]}</Tag>
                        </div>
                      </div>
                    ) : (
                      <div style={{ alignItems: 'center', border: `1px dashed ${technicianPalette.border}`, borderRadius: 14, color: technicianPalette.textMuted, display: 'flex', fontSize: 12, fontWeight: 700, padding: 12 }}>
                        Free / awaiting dispatch
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          <Card bordered={false} className="rounded-[28px]" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow }} title="Assigned orders">
            <div className="flex flex-col gap-4">
              {orders.length ? (
                orders.map((order) => <WorkOrderCard active={order.id === selectedOrder.id} key={order.id} onSelect={() => setSelectedOrderId(order.id)} order={order} />)
              ) : (
                <Empty description="No orders assigned from the API yet." />
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-5" style={{ position: 'sticky', top: 96 }}>
          <Card bordered={false} className="rounded-[28px]" style={{ background: technicianPalette.ink, boxShadow: technicianPalette.shadow }}>
            <p style={{ color: '#ffb4ab', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Selected order</p>
            <h3 style={{ color: 'white', fontSize: 20, fontWeight: 700, marginTop: 10 }}>{selectedOrder.id || 'No order selected'}</h3>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 8 }}>{selectedOrder.vehicle} - {selectedOrder.plate}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14 }}>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Start</p>
                <p style={{ color: 'white', fontSize: 18, fontWeight: 700, marginTop: 6 }}>{selectedOrder.start}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14 }}>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Duration</p>
                <p style={{ color: 'white', fontSize: 18, fontWeight: 700, marginTop: 6 }}>{selectedOrder.duration}m</p>
              </div>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 16 }}>{selectedOrder.note}</p>
          </Card>

          <Card bordered={false} className="rounded-[28px]" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow }} title="Update status">
            <div className="flex flex-col gap-3">
              <Button block disabled={saving} icon={<ThunderboltOutlined />} onClick={() => updateSelectedStatus('in-progress')} type="primary">
                Start / resume
              </Button>
              <Button block disabled={saving} onClick={() => updateSelectedStatus('paused')}>
                Pause
              </Button>
              <Button block disabled={saving} icon={<CheckOutlined />} onClick={() => updateSelectedStatus('completed')}>
                Mark as complete
              </Button>
            </div>
          </Card>

          <Card bordered={false} className="rounded-[28px]" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow }} title="Request transfer">
            <div className="flex flex-col gap-3">
              <Select
                onChange={setTransferTechnicianId}
                options={technicians.map((technician) => ({ label: technician.fullName || technician.email, value: technician._id || technician.id }))}
                placeholder="Transfer to technician..."
                value={transferTechnicianId || undefined}
              />
              <Input onChange={(event) => setTransferReason(event.target.value)} placeholder="Reason (optional)" value={transferReason} />
              <Button block disabled={!transferTechnicianId || !selectedOrder.id} icon={<SwapOutlined />} loading={requestingTransfer} onClick={submitTransferRequest}>
                Request transfer
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </TechnicianShell>
  )
}
