import { CalendarOutlined, CarOutlined, RightOutlined, TeamOutlined, ToolOutlined } from '@ant-design/icons'
import { Button, Card, List, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdvisorDashboard, fetchWorkshopBookings, fetchWorkshopRepairOrders, personName, unwrapArray, vehicleName, vehiclePlate, type ApiBooking, type ApiRepairOrder } from '../../shared/api/workshop'
import { useAuth } from '../../shared/auth'
import { StatCard, advisorPalette } from '../../widgets/backoffice-shell'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

const defaultStats = [
  { icon: <CalendarOutlined />, label: 'Pending bookings', note: '+4 new requests', value: '00' },
  { icon: <CarOutlined />, label: 'Vehicles to receive', note: 'Today', value: '00' },
  { icon: <ToolOutlined />, label: 'Open work orders', note: 'Assigned to technicians', value: '00' },
  { icon: <TeamOutlined />, label: 'Customers waiting', note: 'At the front desk', value: '00' },
]

type QueueItem = { customer: string; meta: string; status: string; to: string }
type DashboardStat = (typeof defaultStats)[number]

function mapBookingQueue(booking: ApiBooking): QueueItem {
  const customer = booking.customerId || booking.customer
  const vehicle = booking.vehicleId || booking.vehicle

  return {
    customer: personName(customer, 'Customer'),
    meta: `${vehicleName(vehicle)} - ${vehiclePlate(vehicle)}`,
    status: booking.status === 'pending' ? 'Awaiting confirmation' : 'Ready for reception',
    to: booking.status === 'pending' ? '/advisor/bookings' : '/advisor/reception',
  }
}

function mapOrderQueue(order: ApiRepairOrder): QueueItem {
  const vehicle = order.vehicleId || order.vehicle

  return {
    customer: personName(order.customer || vehicle?.customerId || vehicle?.customer, 'Customer'),
    meta: `${vehicleName(vehicle)} - ${vehiclePlate(vehicle)}`,
    status: order.status === 'inProgress' ? 'In progress' : 'Assigned',
    to: '/advisor/repair-timeline',
  }
}

export function ServiceAdvisorDashboardPage() {
  const { token } = useAuth()
  const [stats, setStats] = useState<DashboardStat[]>(defaultStats)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [apiMessage, setApiMessage] = useState<string>()

  useEffect(() => {
    if (!token) return
    const authToken = token

    let cancelled = false
    async function loadDashboard() {
      try {
        const [summary, bookingResponse, repairResponse] = await Promise.allSettled([fetchAdvisorDashboard(authToken), fetchWorkshopBookings(authToken), fetchWorkshopRepairOrders(authToken)])
        const bookings = bookingResponse.status === 'fulfilled' ? unwrapArray<ApiBooking>(bookingResponse.value, ['bookings']) : []
        const orders = repairResponse.status === 'fulfilled' ? unwrapArray<ApiRepairOrder>(repairResponse.value, ['repairOrders', 'orders']) : []
        if (cancelled) return
        if (summary.status === 'fulfilled') {
          setStats([
            { ...defaultStats[0], value: String(summary.value.pendingBookings ?? bookings.filter((item) => item.status === 'pending').length).padStart(2, '0') },
            { ...defaultStats[1], value: String(summary.value.todayReceptions ?? bookings.filter((item) => item.status === 'confirmed').length).padStart(2, '0') },
            { ...defaultStats[2], value: String(summary.value.openRepairOrders ?? orders.filter((item) => item.status !== 'completed').length).padStart(2, '0') },
            { ...defaultStats[3], value: String(summary.value.waitingCustomers ?? 0).padStart(2, '0') },
          ])
        }
        const nextQueue = summary.status === 'fulfilled' && summary.value.queue?.length
          ? summary.value.queue.map((item) => ({ customer: item.customer || 'Customer', meta: item.meta || 'Not updated', status: item.status || 'Pending', to: item.to || '/advisor/bookings' }))
          : [...bookings.slice(0, 2).map(mapBookingQueue), ...orders.slice(0, 2).map(mapOrderQueue)]
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
      {apiMessage ? (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 18, color: '#991b1b', padding: '12px 16px' }}>
          {apiMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4">
        {stats.map((stat) => (
          <StatCard icon={stat.icon} key={stat.label} label={stat.label} note={stat.note} palette={advisorPalette} value={stat.value} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card
          bordered={false}
          className="rounded-[32px]"
          extra={<Link to="/advisor/bookings">View bookings</Link>}
          styles={{ body: { padding: 0 } }}
          style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }}
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
          className="rounded-[32px]"
          styles={{ body: { padding: 20 } }}
          style={{ background: advisorPalette.ink, boxShadow: advisorPalette.shadow }}
          title={<span style={{ color: 'white' }}>Quick actions</span>}
        >
          <div className="flex flex-col gap-3">
            <Link to="/advisor/reception">
              <Button block icon={<RightOutlined />} iconPosition="end" type="primary">
                Vehicle reception
              </Button>
            </Link>
            <Link to="/advisor/work-orders">
              <Button block ghost icon={<RightOutlined />} iconPosition="end" style={{ color: 'white' }}>
                Create work order
              </Button>
            </Link>
            <Link to="/advisor/bookings">
              <Button block ghost icon={<RightOutlined />} iconPosition="end" style={{ color: 'white' }}>
                Review bookings
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </ServiceAdvisorShell>
  )
}
