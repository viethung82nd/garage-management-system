import { CheckOutlined, SearchOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Input, Select, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { confirmWorkshopBooking, fetchWorkshopBookings, personName, rejectWorkshopBooking, unwrapArray, vehicleName, vehiclePlate, type ApiBooking } from '../../shared/api/workshop'
import { getUserInitials, useAuth } from '../../shared/auth'
import { StatCard, advisorPalette } from '../../widgets/backoffice-shell'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

type BookingStatus = 'pending' | 'confirmed' | 'rejected'

type BookingRequest = {
  id: string
  advisor: string
  customer: string
  date: string
  initials: string
  phone: string
  plate: string
  service: string
  status: BookingStatus
  time: string
  vehicle: string
  vin: string
}

function normalizeBookingStatus(status?: string): BookingStatus {
  if (status === 'confirmed') return 'confirmed'
  if (status === 'rejected' || status === 'cancelled' || status === 'canceled') return 'rejected'
  return 'pending'
}

function mapBooking(booking: ApiBooking): BookingRequest {
  const customer = booking.customerId || booking.customer
  const vehicle = booking.vehicleId || booking.vehicle
  const service = booking.serviceId || booking.service
  const advisor = booking.advisorId || booking.advisor

  return {
    advisor: personName(advisor, 'Unassigned'),
    customer: personName(customer, 'Customer'),
    date: booking.bookingDate || booking.date || 'Not updated',
    id: booking._id || booking.id || crypto.randomUUID(),
    initials: getUserInitials(customer),
    phone: customer?.phone || 'No phone on file',
    plate: vehiclePlate(vehicle),
    service: service?.name || 'No service selected',
    status: normalizeBookingStatus(booking.status),
    time: booking.timeSlot || booking.time || '--:--',
    vehicle: vehicleName(vehicle),
    vin: vehicle?.vin || vehicle?.chassisNumber || 'Not updated',
  }
}

const statusLabels: Record<BookingStatus, string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  rejected: 'Rejected',
}

const statusColors: Record<BookingStatus, string> = {
  confirmed: 'green',
  pending: 'default',
  rejected: 'red',
}

const serviceFilterOptions = [
  { label: 'All services', value: 'all' },
  { label: 'Engine diagnostics', value: 'diagnostic' },
  { label: 'Brake service', value: 'brake' },
  { label: 'General maintenance', value: 'maintenance' },
]

const serviceMatchTerms: Record<string, string[]> = {
  all: [],
  brake: ['brake'],
  diagnostic: ['diagnostic', 'engine'],
  maintenance: ['maintenance', 'oil'],
}

export function BookingRequestsPage() {
  const { token } = useAuth()
  const [bookings, setBookings] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [apiMessage, setApiMessage] = useState<string>()
  const [query, setQuery] = useState('')
  const [service, setService] = useState('all')

  useEffect(() => {
    if (!token) return
    const authToken = token

    let cancelled = false

    async function loadBookings() {
      setLoading(true)
      setApiMessage(undefined)
      try {
        const response = await fetchWorkshopBookings(authToken)
        const nextBookings = unwrapArray<ApiBooking>(response, ['bookings']).map(mapBooking)
        if (!cancelled) setBookings(nextBookings)
      } catch (err) {
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Unable to load bookings from the API')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadBookings()

    return () => {
      cancelled = true
    }
  }, [token])

  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return bookings.filter((booking) => {
      const matchesQuery =
        !normalizedQuery ||
        `${booking.customer} ${booking.phone} ${booking.vehicle} ${booking.plate} ${booking.vin} ${booking.service}`
          .toLowerCase()
          .includes(normalizedQuery)

      const serviceTerms = serviceMatchTerms[service] ?? []
      const matchesService = serviceTerms.length === 0 || serviceTerms.some((term) => booking.service.toLowerCase().includes(term))

      return matchesQuery && matchesService
    })
  }, [bookings, query, service])

  async function updateStatus(id: string, status: BookingStatus) {
    if (!token) return

    setApiMessage(undefined)
    try {
      const response = status === 'confirmed' ? await confirmWorkshopBooking(token, id) : await rejectWorkshopBooking(token, id)
      const booking = 'booking' in response && response.booking ? response.booking : response
      setBookings((current) => current.map((item) => (item.id === id ? mapBooking(booking as ApiBooking) : item)))
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Unable to update the booking status')
    }
  }

  const pendingCount = bookings.filter((booking) => booking.status === 'pending').length

  const columns: ColumnsType<BookingRequest> = [
    {
      title: 'Customer',
      key: 'customer',
      render: (_, booking) => (
        <div className="flex items-center gap-3">
          <Avatar style={{ background: advisorPalette.ink }}>{booking.initials}</Avatar>
          <div>
            <div style={{ color: advisorPalette.ink, fontWeight: 700 }}>{booking.customer}</div>
            <div style={{ color: advisorPalette.textMuted, fontSize: 13 }}>{booking.phone}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Vehicle & plate',
      key: 'vehicle',
      render: (_, booking) => (
        <div>
          <div style={{ color: advisorPalette.ink, fontWeight: 700 }}>{booking.vehicle}</div>
          <div style={{ color: advisorPalette.red, fontSize: 13, fontWeight: 600 }}>{booking.plate}</div>
          <div style={{ color: advisorPalette.textMuted, fontSize: 12 }}>{booking.vin}</div>
        </div>
      ),
    },
    {
      title: 'Requested service',
      key: 'service',
      render: (_, booking) => (
        <div>
          <div style={{ color: advisorPalette.ink, fontWeight: 600, maxWidth: 240 }}>{booking.service}</div>
          <div style={{ color: advisorPalette.textMuted, fontSize: 12, marginTop: 2 }}>Advisor: {booking.advisor}</div>
        </div>
      ),
    },
    {
      title: 'Time slot',
      key: 'time',
      render: (_, booking) => (
        <div>
          <div style={{ color: advisorPalette.ink, fontSize: 16, fontWeight: 700 }}>{booking.time}</div>
          <div style={{ color: advisorPalette.textMuted, fontSize: 13 }}>{booking.date}</div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: BookingStatus) => <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, booking) => (
        <div className="flex justify-end gap-2">
          <Button
            disabled={booking.status !== 'pending'}
            icon={<CheckOutlined />}
            onClick={() => updateStatus(booking.id, 'confirmed')}
            title="Confirm"
            type="primary"
          />
          <Button disabled={booking.status !== 'pending'} onClick={() => updateStatus(booking.id, 'rejected')}>
            Reject
          </Button>
        </div>
      ),
    },
  ]

  return (
    <ServiceAdvisorShell title="Booking requests">
      <StatCard label="Pending bookings" note="Awaiting confirmation" palette={advisorPalette} value={String(pendingCount).padStart(2, '0')} />

      {apiMessage ? (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 18, color: '#991b1b', padding: '12px 16px' }}>
          {apiMessage}
        </div>
      ) : null}

      <Card bordered={false} className="rounded-[32px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }}>
        <div className="flex flex-wrap items-center gap-3" style={{ marginBottom: 20 }}>
          <Input
            allowClear
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search customer, plate, or VIN..."
            prefix={<SearchOutlined />}
            style={{ maxWidth: 320 }}
            value={query}
          />
          <Select onChange={setService} options={serviceFilterOptions} style={{ width: 220 }} value={service} />
        </div>

        <Table columns={columns} dataSource={filteredBookings} loading={loading} pagination={false} rowKey="id" scroll={{ x: 960 }} />
      </Card>
    </ServiceAdvisorShell>
  )
}
