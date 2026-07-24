import { BellOutlined, CarOutlined, SearchOutlined, UserDeleteOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Input, Select, Table, Tabs, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchNoShowBookings,
  fetchWorkshopBookings,
  formatApiDate,
  markBookingNoShow,
  personName,
  rejectWorkshopBooking,
  sendAppointmentReminders,
  unwrapArray,
  vehicleName,
  vehiclePlate,
  type ApiBooking,
} from '../../shared/api/workshop'
import { getUserInitials, useAuth } from '../../shared/auth'
import { InlineBanner, advisorPalette, useApiMessage } from '../../widgets/backoffice-shell'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'noShow'

type BookingRequest = {
  id: string
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
  if (status === 'noShow') return 'noShow'
  if (status === 'rejected' || status === 'cancelled' || status === 'canceled') return 'rejected'
  return 'pending'
}

function mapBooking(booking: ApiBooking): BookingRequest {
  const customer = booking.customerId || booking.customer
  const vehicle = booking.vehicleId || booking.vehicle
  const service = booking.serviceId || booking.service

  return {
    customer: personName(customer, 'Customer'),
    date: booking.bookingDate || booking.date ? formatApiDate(booking.bookingDate || booking.date) : 'Not updated',
    id: booking._id || booking.id || crypto.randomUUID(),
    initials: getUserInitials(customer),
    phone: customer?.phone || 'No phone on file',
    plate: vehiclePlate(vehicle),
    service: service?.name || booking.serviceCategory || 'No service selected',
    status: normalizeBookingStatus(booking.status),
    time: booking.timeSlot || booking.time || '--:--',
    vehicle: vehicleName(vehicle),
    vin: vehicle?.vin || vehicle?.chassisNumber || 'Not updated',
  }
}

const statusLabels: Record<BookingStatus, string> = {
  confirmed: 'Confirmed',
  noShow: 'No-show',
  pending: 'Pending',
  rejected: 'Rejected',
}

const statusColors: Record<BookingStatus, string> = {
  confirmed: 'green',
  noShow: advisorPalette.amber,
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
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const { message: apiMessage, tone: apiTone, showError, showSuccess, clear: clearApiMessage } = useApiMessage()
  const [rejectingId, setRejectingId] = useState<string>()
  const [noShowBusyId, setNoShowBusyId] = useState<string>()
  const [reminderSending, setReminderSending] = useState(false)
  const [noShowList, setNoShowList] = useState<BookingRequest[]>([])
  const [noShowLoading, setNoShowLoading] = useState(false)
  const [noShowLoaded, setNoShowLoaded] = useState(false)
  const [query, setQuery] = useState('')
  const [service, setService] = useState('all')
  const [activeTab, setActiveTab] = useState<'pending' | 'processed' | 'noshow'>('pending')

  useEffect(() => {
    if (!token) return
    const authToken = token

    let cancelled = false

    async function loadBookings() {
      setLoading(true)
      clearApiMessage()
      try {
        const response = await fetchWorkshopBookings(authToken)
        const nextBookings = unwrapArray<ApiBooking>(response, ['bookings']).map(mapBooking)
        if (!cancelled) setBookings(nextBookings)
      } catch (err) {
        if (!cancelled) showError(err instanceof Error ? err.message : 'Unable to load bookings from the API')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadBookings()

    return () => {
      cancelled = true
    }
  }, [token])

  // Callback list is fetched lazily on first visit to its tab, and refetched
  // whenever a booking is newly marked no-show so the list stays current.
  useEffect(() => {
    if (!token || activeTab !== 'noshow' || noShowLoaded) return
    const authToken = token
    let cancelled = false

    async function loadNoShows() {
      setNoShowLoading(true)
      try {
        const response = await fetchNoShowBookings(authToken)
        const list = unwrapArray<ApiBooking>(response, ['bookings']).map(mapBooking)
        if (!cancelled) {
          setNoShowList(list)
          setNoShowLoaded(true)
        }
      } catch (err) {
        if (!cancelled) showError(err instanceof Error ? err.message : 'Unable to load the no-show list')
      } finally {
        if (!cancelled) setNoShowLoading(false)
      }
    }

    void loadNoShows()

    return () => {
      cancelled = true
    }
  }, [token, activeTab, noShowLoaded])

  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return bookings.filter((booking) => {
      const matchesTab = activeTab === 'pending' ? booking.status === 'pending' : booking.status !== 'pending'

      const matchesQuery =
        !normalizedQuery ||
        `${booking.customer} ${booking.phone} ${booking.vehicle} ${booking.plate} ${booking.vin} ${booking.service}`
          .toLowerCase()
          .includes(normalizedQuery)

      const serviceTerms = serviceMatchTerms[service] ?? []
      const matchesService = serviceTerms.length === 0 || serviceTerms.some((term) => booking.service.toLowerCase().includes(term))

      return matchesTab && matchesQuery && matchesService
    })
  }, [bookings, query, service, activeTab])

  // Confirming and receiving the vehicle are the same real-world moment, so
  // "Confirm" hands off to Vehicle Reception instead of just flipping a
  // status in place — reception is what actually opens the repair order this
  // booking continues into (see reception.controller.js#createReception).
  function receiveBooking(id: string) {
    navigate(`/advisor/reception?bookingId=${id}`)
  }

  async function rejectBookingRequest(id: string) {
    // Guards against a double-click firing the same reject twice — the second
    // call would hit the booking after its status already changed and the
    // backend throws a 409 ("Cannot cancel a X booking") for it.
    if (!token || rejectingId) return

    setRejectingId(id)
    clearApiMessage()
    try {
      const response = await rejectWorkshopBooking(token, id)
      const booking = ('booking' in response && response.booking ? response.booking : response) as ApiBooking
      setBookings((current) => current.map((item) => (item.id === id ? mapBooking(booking) : item)))
      showSuccess('Booking request rejected.')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to update the booking status')
    } finally {
      setRejectingId(undefined)
    }
  }

  async function markNoShowRequest(id: string) {
    if (!token || rejectingId || noShowBusyId) return

    setNoShowBusyId(id)
    clearApiMessage()
    try {
      const response = await markBookingNoShow(token, id)
      if (response.booking) {
        const booking = response.booking
        setBookings((current) => current.map((item) => (item.id === id ? mapBooking(booking) : item)))
      }
      setNoShowLoaded(false)
      showSuccess('Booking marked as a no-show.')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to mark this booking as a no-show')
    } finally {
      setNoShowBusyId(undefined)
    }
  }

  async function sendReminders() {
    if (!token || reminderSending) return

    setReminderSending(true)
    clearApiMessage()
    try {
      const response = await sendAppointmentReminders(token)
      showSuccess(`Sent ${response.count ?? 0} appointment reminder(s).`)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to send appointment reminders')
    } finally {
      setReminderSending(false)
    }
  }

  const pendingCount = bookings.filter((booking) => booking.status === 'pending').length
  const processedCount = bookings.length - pendingCount

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
      render: (_, booking) => <div style={{ color: advisorPalette.ink, fontWeight: 600, maxWidth: 240 }}>{booking.service}</div>,
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
      width: 300,
      render: (_, booking) => {
        if (booking.status !== 'pending' && booking.status !== 'confirmed') return null
        const busy = Boolean(rejectingId) || Boolean(noShowBusyId)
        return (
          <div className="flex flex-wrap gap-2">
            {booking.status === 'pending' ? (
              <>
                <Button disabled={busy} icon={<CarOutlined />} onClick={() => receiveBooking(booking.id)} type="primary">
                  Receive
                </Button>
                <Button disabled={busy && rejectingId !== booking.id} loading={rejectingId === booking.id} onClick={() => rejectBookingRequest(booking.id)}>
                  Reject
                </Button>
              </>
            ) : null}
            <Button
              disabled={busy && noShowBusyId !== booking.id}
              loading={noShowBusyId === booking.id}
              icon={<UserDeleteOutlined />}
              onClick={() => markNoShowRequest(booking.id)}
            >
              Đánh dấu vắng mặt
            </Button>
          </div>
        )
      },
    },
  ]

  const noShowColumns: ColumnsType<BookingRequest> = [
    {
      title: 'Customer',
      key: 'customer',
      render: (_, booking) => (
        <div>
          <div style={{ color: advisorPalette.ink, fontWeight: 700 }}>{booking.customer}</div>
          <div style={{ color: advisorPalette.textMuted, fontSize: 13 }}>{booking.phone}</div>
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
        </div>
      ),
    },
    {
      title: 'Requested service',
      key: 'service',
      render: (_, booking) => <div style={{ color: advisorPalette.ink, fontWeight: 600, maxWidth: 240 }}>{booking.service}</div>,
    },
    {
      title: 'Missed slot',
      key: 'time',
      render: (_, booking) => (
        <div>
          <div style={{ color: advisorPalette.ink, fontSize: 16, fontWeight: 700 }}>{booking.time}</div>
          <div style={{ color: advisorPalette.textMuted, fontSize: 13 }}>{booking.date}</div>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_, booking) => (
        <Button size="small" icon={<CarOutlined />} onClick={() => receiveBooking(booking.id)}>
          Rebook
        </Button>
      ),
    },
  ]

  return (
    <ServiceAdvisorShell title="Booking requests">
      {apiMessage ? <InlineBanner tone={apiTone}>{apiMessage}</InlineBanner> : null}

      <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'pending' | 'processed' | 'noshow')}
          tabBarExtraContent={
            <Button icon={<BellOutlined />} loading={reminderSending} onClick={sendReminders}>
              Gửi nhắc lịch 24h
            </Button>
          }
          items={[
            { key: 'pending', label: `Needs review (${pendingCount})` },
            { key: 'processed', label: `Reviewed (${processedCount})` },
            { key: 'noshow', label: `No-shows (${noShowList.length})` },
          ]}
        />

        {activeTab === 'noshow' ? (
          <Table
            columns={noShowColumns}
            dataSource={noShowList}
            loading={noShowLoading}
            pagination={{ pageSize: 8, showTotal: (total) => `${total} no-shows` }}
            rowKey="id"
            scroll={{ x: 720 }}
            className="bo-table"
          />
        ) : (
          <>
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

            <Table
              columns={columns}
              dataSource={filteredBookings}
              loading={loading}
              pagination={{ pageSize: 8, showTotal: (total) => `${total} bookings` }}
              rowKey="id"
              scroll={{ x: 960 }}
              className="bo-table"
            />
          </>
        )}
      </Card>
    </ServiceAdvisorShell>
  )
}
