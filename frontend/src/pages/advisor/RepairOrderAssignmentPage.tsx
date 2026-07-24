import { CheckOutlined, DownOutlined, ProfileOutlined } from '@ant-design/icons'
import { Button, Card, Col, Dropdown, Empty, Input, Modal, Row, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
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
  pending: 'Chờ xử lý',
  inProgress: 'Đang sửa chữa',
  waitingParts: 'Chờ phụ tùng',
  waitingCustomer: 'Chờ khách',
  onHold: 'Tạm dừng',
  completed: 'Hoàn thành',
  reworkRequired: 'Cần làm lại',
  readyForDelivery: 'Sẵn sàng bàn giao',
  delivered: 'Đã bàn giao',
  closed: 'Đã đóng',
  cancelled: 'Đã hủy',
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
  return status && status in orderStatusLabels ? orderStatusLabels[status as OrderStatusKey] : status || 'Unknown'
}

function statusColor(status?: string) {
  return status && status in orderStatusColors ? orderStatusColors[status as OrderStatusKey] : 'default'
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
    status: technician.status === 'busy' ? 'busy' : technician.status === 'off' || technician.status === 'offline' ? 'offline' : 'available',
  }
}

const statusTag: Record<Technician['status'], { color: string; label: string }> = {
  available: { color: 'green', label: 'Available' },
  busy: { color: 'gold', label: 'Busy' },
  offline: { color: 'default', label: 'Off shift' },
}

/** Picker shown when the page arrives with no ?orderId= — only orders that already have quoted, confirmed services and no technician yet. */
function OrderPicker({ orders, onPick }: { orders: ApiRepairOrder[]; onPick: (id: string) => void }) {
  if (!orders.length) {
    return (
      <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}>
        <Empty description="No confirmed repair orders are waiting on a technician right now." />
      </Card>
    )
  }

  return (
    <Card
      bordered={false}
      className="bo-card-hover bo-enter rounded-2xl"
      style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}
      title="Select a repair order to assign"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((order) => {
          const id = order._id || order.id || ''
          const vehicle = order.vehicleId || order.vehicle
          return (
            <Card bordered key={id} size="small" hoverable onClick={() => onPick(id)} style={{ borderColor: advisorPalette.border, cursor: 'pointer' }}>
              <div className="flex items-center justify-between gap-2">
                <span style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{formatOrderId(order)}</span>
                {order.isComeback ? <Tag color={advisorPalette.amber} style={{ marginInlineEnd: 0 }}>Comeback</Tag> : null}
              </div>
              <div style={{ color: advisorPalette.ink, fontWeight: 700, marginTop: 4 }}>{personName(order.customer || vehicle?.customerId || vehicle?.customer, 'Customer')}</div>
              <div style={{ color: advisorPalette.textMuted, fontSize: 13 }}>
                {vehicleName(vehicle)} · {vehiclePlate(vehicle)}
              </div>
              <div style={{ color: advisorPalette.red, fontSize: 13, fontWeight: 600, marginTop: 6 }}>{order.services?.length || 0} confirmed service(s)</div>
            </Card>
          )
        })}
      </div>
    </Card>
  )
}

export function RepairOrderAssignmentPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderIdParam = searchParams.get('orderId') || undefined

  const [order, setOrder] = useState<ApiRepairOrder | null>(null)
  const [assignableOrders, setAssignableOrders] = useState<ApiRepairOrder[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('')
  const { message: apiMessage, tone: apiTone, showError, showSuccess, clear: clearApiMessage } = useApiMessage()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Move-to-waiting-status control — the backend requires a reason for these.
  const [statusTarget, setStatusTarget] = useState<string | null>(null)
  const [statusReason, setStatusReason] = useState('')
  const [statusReasonError, setStatusReasonError] = useState<string>()
  const [statusSaving, setStatusSaving] = useState(false)

  useEffect(() => {
    if (!token || orderIdParam) return
    const authToken = token
    let cancelled = false

    async function loadAssignable() {
      try {
        const response = await fetchWorkshopRepairOrders(authToken, '?status=pending')
        if (cancelled) return
        const orders = unwrapArray<ApiRepairOrder>(response, ['repairOrders', 'orders'])
        setAssignableOrders(orders.filter((item) => (item.services?.length || 0) > 0 && !item.technicianId))
      } catch (err) {
        if (!cancelled) showError(err instanceof Error ? err.message : 'Unable to load repair orders from the API')
      }
    }

    void loadAssignable()
    return () => {
      cancelled = true
    }
  }, [token, orderIdParam])

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
        const existingTechId = loadedOrder.technicianId?._id || (loadedOrder.technicianId as unknown as string)
        if (existingTechId) setSelectedTechnicianId(String(existingTechId))
      } catch (err) {
        if (!cancelled) showError(err instanceof Error ? err.message : 'Unable to load this repair order')
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
        if (!cancelled) showError(err instanceof Error ? err.message : 'Unable to load technicians from the API')
      }
    }

    void loadTechnicians()
    return () => {
      cancelled = true
    }
  }, [token])

  const selectedTechnician = technicians.find((tech) => tech.id === selectedTechnicianId)
  const services = order?.services || []
  const totalCost = order?.totalCost || services.reduce((sum, service) => sum + (service.priceAtTime || 0) * (service.quantity || 1), 0)

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
      setStatusReasonError('Vui lòng nhập lý do.')
      return
    }
    setStatusSaving(true)
    clearApiMessage()
    try {
      const updated = await updateRepairOrderStatus(token, orderIdParam, statusTarget, statusReason.trim())
      setOrder(updated)
      showSuccess('Đã cập nhật trạng thái đơn hàng.')
      setStatusTarget(null)
      setStatusReason('')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to update this repair order status')
    } finally {
      setStatusSaving(false)
    }
  }

  const vehicle = order?.vehicleId || order?.vehicle

  return (
    <ServiceAdvisorShell title="Work orders">
      {apiMessage ? <InlineBanner tone={apiTone}>{apiMessage}</InlineBanner> : null}

      {!orderIdParam ? (
        <OrderPicker orders={assignableOrders} onPick={(id) => navigate(`/advisor/work-orders?orderId=${id}`)} />
      ) : !order ? (
        <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}>
          <Empty description="Loading repair order..." />
        </Card>
      ) : (
        <div className="grid items-start gap-5 *:min-w-0 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-5">
            <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }} title="Customer & vehicle">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{formatOrderId(order)}</span>
                  <Tag color={statusColor(order.status)}>{statusLabel(order.status)}</Tag>
                  {order.isComeback ? <Tag color={advisorPalette.amber}>Comeback</Tag> : null}
                </div>
                <Dropdown
                  menu={{ items: WAITING_STATUS_MENU_ITEMS, onClick: ({ key }) => openStatusModal(key) }}
                  trigger={['click']}
                >
                  <Button size="small">
                    Chuyển trạng thái <DownOutlined />
                  </Button>
                </Dropdown>
              </div>
              <Row gutter={[16, 4]} style={{ marginTop: 12 }}>
                <Col span={12}>
                  <div style={{ color: advisorPalette.textMuted, fontSize: 12 }}>Customer</div>
                  <div style={{ color: advisorPalette.ink, fontWeight: 700 }}>{personName(order.customer || vehicle?.customerId || vehicle?.customer, 'Customer')}</div>
                </Col>
                <Col span={12}>
                  <div style={{ color: advisorPalette.textMuted, fontSize: 12 }}>Vehicle</div>
                  <div style={{ color: advisorPalette.ink, fontWeight: 700 }}>
                    {vehicleName(vehicle)} · {vehiclePlate(vehicle)}
                  </div>
                </Col>
              </Row>
            </Card>

            <Card
              bordered={false}
              className="bo-card-hover bo-enter rounded-2xl"
              style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}
              title="Confirmed services"
            >
              {services.length ? (
                <div className="flex flex-col gap-2">
                  {services.map((service, index) => (
                    <div key={index} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ background: advisorPalette.panelAlt }}>
                      <span style={{ color: advisorPalette.ink, fontWeight: 600 }}>
                        {service.name} {service.quantity && service.quantity > 1 ? `× ${service.quantity}` : ''}
                      </span>
                      <span style={{ color: advisorPalette.ink, fontWeight: 700 }}>{formatMoney((service.priceAtTime || 0) * (service.quantity || 1))}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 pt-2" style={{ borderTop: `1px solid ${advisorPalette.border}` }}>
                    <span style={{ color: advisorPalette.textMuted, fontSize: 13, fontWeight: 700, textTransform: 'uppercase' }}>Total</span>
                    <span style={{ color: advisorPalette.red, fontSize: 18, fontWeight: 700 }}>{formatMoney(totalCost)}</span>
                  </div>
                </div>
              ) : (
                <Empty description="No confirmed services yet — this order needs a quotation approved by the customer first." />
              )}
            </Card>

            <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }} title="Assign technician">
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
                        <div>
                          <div style={{ color: advisorPalette.ink, fontWeight: 700 }}>{tech.name}</div>
                          {tech.skill ? <div style={{ color: advisorPalette.textMuted, fontSize: 13, marginTop: 2 }}>{tech.skill}</div> : null}
                        </div>
                        <Tag color={statusTag[tech.status].color}>{statusTag[tech.status].label}</Tag>
                      </div>
                      <div className="flex items-center gap-2" style={{ color: advisorPalette.textMuted, fontSize: 12, marginTop: 10 }}>
                        <ProfileOutlined /> {tech.activeOrders} active orders
                      </div>
                    </button>
                  )
                })}
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-5" style={{ position: 'sticky', top: 96 }}>
            <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.ink, boxShadow: advisorPalette.shadow }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Work order
              </div>
              <div style={{ color: 'white', fontSize: 22, fontWeight: 700, marginTop: 8 }}>{formatOrderId(order)}</div>
              <Tag color={saved ? 'green' : 'default'} style={{ marginTop: 8 }}>
                {saved ? 'Assigned' : order.technicianId ? 'Previously assigned' : 'Awaiting assignment'}
              </Tag>
              <Row gutter={12} style={{ marginTop: 16 }}>
                <Col span={12}>
                  <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 }}>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Services</div>
                    <div style={{ color: 'white', fontSize: 22, fontWeight: 700, marginTop: 6 }}>{String(services.length).padStart(2, '0')}</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 }}>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Total</div>
                    <div style={{ color: 'white', fontSize: 16, fontWeight: 700, marginTop: 6 }}>{formatMoney(totalCost)}</div>
                  </div>
                </Col>
              </Row>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 20, paddingTop: 20 }}>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Assigning to</div>
                <div style={{ color: 'white', fontSize: 18, fontWeight: 700, marginTop: 8 }}>{selectedTechnician?.name ?? 'No technician selected'}</div>
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
            </Card>
          </div>
        </div>
      )}

      <Modal
        cancelText="Hủy"
        confirmLoading={statusSaving}
        okText="Xác nhận"
        onCancel={() => setStatusTarget(null)}
        onOk={confirmStatusChange}
        open={Boolean(statusTarget)}
        title={statusTarget ? `Chuyển trạng thái sang: ${statusLabel(statusTarget)}` : ''}
      >
        <div style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>
          Lý do *
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
        {statusReasonError ? <div style={{ color: advisorPalette.red, fontSize: 12, marginTop: 4 }}>{statusReasonError}</div> : null}
      </Modal>
    </ServiceAdvisorShell>
  )
}
