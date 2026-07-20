import { CalendarOutlined, CarOutlined, TeamOutlined, ToolOutlined } from '@ant-design/icons'
import { Card, Empty, List, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdvisorDashboard, fetchWorkshopBookings, fetchWorkshopRepairOrders, personName, unwrapArray, vehicleName, vehiclePlate, type ApiBooking, type ApiRepairOrder } from '../../shared/api/workshop'
import { useAuth } from '../../shared/auth'
import { InlineBanner, StatCard, advisorPalette } from '../../widgets/backoffice-shell'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

const defaultStats = [
  { icon: <CalendarOutlined />, label: 'Pending bookings', note: '+4 new requests', tone: 'amber' as const, value: '00' },
  { icon: <CarOutlined />, label: 'Vehicles to receive', note: 'Today', tone: 'blue' as const, value: '00' },
  { icon: <ToolOutlined />, label: 'Open work orders', note: 'Assigned to technicians', tone: 'red' as const, value: '00' },
  { icon: <TeamOutlined />, label: 'Customers waiting', note: 'At the front desk', tone: 'emerald' as const, value: '00' },
]

type QueueItem = { customer: string; meta: string; status: string; to: string }
type DashboardStat = (typeof defaultStats)[number]

const orderStatusMeta: Record<string, { label: string; color: string }> = {
  cancelled: { color: '#9ca3af', label: 'Cancelled' },
  completed: { color: '#16a34a', label: 'Completed' },
  inProgress: { color: advisorPalette.red, label: 'In progress' },
  pending: { color: '#f59e0b', label: 'Assigned / pending' },
  reworkRequired: { color: '#dc2626', label: 'Rework required' },
}

function mapBookingQueue(booking: ApiBooking): QueueItem {
  const customer = booking.customerId || booking.customer
  const vehicle = booking.vehicleId || booking.vehicle
  const id = booking._id || booking.id || ''

  return {
    customer: personName(customer, 'Customer'),
    meta: `${vehicleName(vehicle)} - ${vehiclePlate(vehicle)}`,
    status: booking.status === 'pending' ? 'Awaiting confirmation' : 'Ready for reception',
    // Pending bookings still need review from the full queue; confirmed
    // ones already have a specific vehicle to receive, so jump straight in.
    to: booking.status === 'pending' ? '/advisor/bookings' : `/advisor/reception?bookingId=${id}`,
  }
}

function mapOrderQueue(order: ApiRepairOrder): QueueItem {
  const vehicle = order.vehicleId || order.vehicle
  const id = order._id || order.id || ''

  return {
    customer: personName(order.customer || vehicle?.customerId || vehicle?.customer, 'Customer'),
    meta: `${vehicleName(vehicle)} - ${vehiclePlate(vehicle)}`,
    status: order.status === 'inProgress' ? 'In progress' : order.technicianId ? 'Assigned' : 'Awaiting technician',
    to: `/advisor/quality-check?orderId=${id}`,
  }
}

function StatusBreakdown({ orders }: { orders: ApiRepairOrder[] }) {
  const counts = useMemo(() => {
    const tally = new Map<string, number>()
    orders.forEach((order) => {
      const key = order.status || 'pending'
      tally.set(key, (tally.get(key) || 0) + 1)
    })
    return Array.from(tally.entries())
      .map(([status, value]) => ({ ...(orderStatusMeta[status] || { color: '#9ca3af', label: status }), value }))
      .sort((a, b) => b.value - a.value)
  }, [orders])

  const max = Math.max(1, ...counts.map((item) => item.value))

  if (!counts.length) {
    return <Empty description="No repair orders yet." image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    <div className="flex flex-col gap-3">
      {counts.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 4 }}>
            <span>{item.label}</span>
            <span style={{ fontWeight: 700 }}>{item.value}</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
            <div style={{ background: item.color, borderRadius: 999, height: '100%', transition: 'width 0.5s ease', width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ServiceAdvisorDashboardPage() {
  const { token } = useAuth()
  const [stats, setStats] = useState<DashboardStat[]>(defaultStats)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [orders, setOrders] = useState<ApiRepairOrder[]>([])
  const [apiMessage, setApiMessage] = useState<string>()

  useEffect(() => {
    if (!token) return
    const authToken = token

    let cancelled = false
    async function loadDashboard() {
      try {
        const [summary, bookingResponse, repairResponse] = await Promise.allSettled([fetchAdvisorDashboard(authToken), fetchWorkshopBookings(authToken), fetchWorkshopRepairOrders(authToken)])
        const bookings = bookingResponse.status === 'fulfilled' ? unwrapArray<ApiBooking>(bookingResponse.value, ['bookings']) : []
        const repairOrders = repairResponse.status === 'fulfilled' ? unwrapArray<ApiRepairOrder>(repairResponse.value, ['repairOrders', 'orders']) : []
        if (cancelled) return
        setOrders(repairOrders)
        if (summary.status === 'fulfilled') {
          setStats([
            { ...defaultStats[0], value: String(summary.value.pendingBookings ?? bookings.filter((item) => item.status === 'pending').length).padStart(2, '0') },
            { ...defaultStats[1], value: String(summary.value.todayReceptions ?? bookings.filter((item) => item.status === 'confirmed').length).padStart(2, '0') },
            { ...defaultStats[2], value: String(summary.value.openRepairOrders ?? repairOrders.filter((item) => item.status !== 'completed').length).padStart(2, '0') },
            { ...defaultStats[3], value: String(summary.value.waitingCustomers ?? 0).padStart(2, '0') },
          ])
        }
        const nextQueue = summary.status === 'fulfilled' && summary.value.queue?.length
          ? summary.value.queue.map((item) => ({ customer: item.customer || 'Customer', meta: item.meta || 'Not updated', status: item.status || 'Pending', to: item.to || '/advisor/bookings' }))
          : [...bookings.filter((item) => item.status === 'pending' || item.status === 'confirmed').slice(0, 3).map(mapBookingQueue), ...repairOrders.filter((item) => item.status === 'pending' || item.status === 'inProgress').slice(0, 3).map(mapOrderQueue)]
        setQueue(nextQueue)
      } catch (err) {
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Unable to load the dashboard from the API')
      }
    }
    void loadDashboard()
    return () => { cancelled = true }
  }, [token])

  return (
    <ServiceAdvisorShell title="Overview">
      {apiMessage ? <InlineBanner tone="error">{apiMessage}</InlineBanner> : null}

      <div className="flex flex-wrap gap-4">
        {stats.map((stat, index) => (
          <StatCard
            icon={stat.icon}
            key={stat.label}
            label={stat.label}
            note={stat.note}
            palette={advisorPalette}
            tone={stat.tone}
            enterDelay={index + 1}
            value={stat.value}
          />
        ))}
      </div>

      <div className="grid gap-5 *:min-w-0 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card
          bordered={false}
          className="bo-card-hover bo-enter rounded-2xl"
          extra={<Link to="/advisor/bookings">View bookings</Link>}
          styles={{ body: { padding: 0 } }}
          style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}
          title="Queue to process"
        >
          <List
            dataSource={queue}
            locale={{ emptyText: 'Nothing to process from the API yet.' }}
            renderItem={(item) => (
              <List.Item style={{ padding: '16px 24px' }}>
                <Link className="flex w-full items-center justify-between gap-4" to={item.to}>
                  <span>
                    <span style={{ color: advisorPalette.ink, display: 'block', fontWeight: 700 }}>{item.customer}</span>
                    <span style={{ color: advisorPalette.textMuted, display: 'block', fontSize: 13, marginTop: 2 }}>{item.meta}</span>
                  </span>
                  <Tag color="red">{item.status}</Tag>
                </Link>
              </List.Item>
            )}
          />
        </Card>

        <Card
          bordered={false}
          className="bo-card-hover bo-enter rounded-2xl"
          styles={{ body: { padding: 20 } }}
          style={{ background: advisorPalette.ink, boxShadow: advisorPalette.shadow }}
          title={<span style={{ color: 'white' }}>Repair orders by status</span>}
        >
          <StatusBreakdown orders={orders} />
        </Card>
      </div>
    </ServiceAdvisorShell>
  )
}
