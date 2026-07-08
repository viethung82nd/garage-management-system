import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { confirmWorkshopBooking, fetchWorkshopBookings, personName, rejectWorkshopBooking, unwrapArray, vehicleName, vehiclePlate, type ApiBooking } from '../../shared/api/workshop'
import { getUserInitials } from '../../shared/auth'
import { Icon, type IconName } from '../../shared/ui/base'
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
    advisor: personName(advisor, 'Chưa phân công'),
    customer: personName(customer, 'Khách hàng'),
    date: booking.bookingDate || booking.date || 'Chưa cập nhật',
    id: booking._id || booking.id || crypto.randomUUID(),
    initials: getUserInitials(customer),
    phone: customer?.phone || 'Chưa có SĐT',
    plate: vehiclePlate(vehicle),
    service: service?.name || 'Chưa chọn dịch vụ',
    status: normalizeBookingStatus(booking.status),
    time: booking.timeSlot || booking.time || '--:--',
    vehicle: vehicleName(vehicle),
    vin: vehicle?.vin || vehicle?.chassisNumber || 'Chưa cập nhật',
  }
}

const statusLabels: Record<BookingStatus, string> = {
  confirmed: 'ÄÃ£ xÃ¡c nháº­n',
  pending: 'Chá» duyá»‡t',
  rejected: 'ÄÃ£ tá»« chá»‘i',
}

function StatCard({
  icon,
  label,
  note,
  value,
}: {
  icon: IconName
  label: string
  note: string
  value: string
}) {
  return (
    <section className="border border-[#efeded] bg-white p-6 shadow-[0_18px_40px_rgba(27,28,28,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a8686]">{label}</p>
          <p className="mt-3 text-4xl font-black text-[#171717]">{value}</p>
          <p className="mt-2 text-sm font-semibold text-[#ba0013]">{note}</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center bg-[#fff1f1] text-[#ba0013]">
          <Icon name={icon} />
        </span>
      </div>
    </section>
  )
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const classes =
    status === 'confirmed'
      ? 'border-[#0f8a50] bg-[#ecfff4] text-[#0f6f43]'
      : status === 'rejected'
        ? 'border-[#ba0013] bg-[#fff1f1] text-[#ba0013]'
        : 'border-[#d8d5d5] bg-[#fbf9f8] text-[#5f5e5e]'

  return (
    <span className={`inline-flex border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${classes}`}>
      {statusLabels[status]}
    </span>
  )
}

function FilterBar({
  onQueryChange,
  onServiceChange,
  query,
  service,
}: {
  onQueryChange: (value: string) => void
  onServiceChange: (value: string) => void
  query: string
  service: string
}) {
  return (
    <section className="grid gap-3 border border-[#efeded] bg-white p-4 lg:grid-cols-[1fr_240px_auto_auto]">
      <label className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8a8686]" name="search" />
        <input
          className="h-12 w-full border border-[#d8d5d5] bg-[#fbf9f8] pl-12 pr-4 text-sm font-semibold text-[#1b1c1c] outline-none transition placeholder:text-[#8a8686] focus:border-[#ba0013] focus:bg-white"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="TÃ¬m khÃ¡ch hÃ ng, biá»ƒn sá»‘ hoáº·c VIN..."
          type="search"
          value={query}
        />
      </label>

      <select
        className="h-12 border border-[#d8d5d5] bg-[#fbf9f8] px-4 text-sm font-bold text-[#1b1c1c] outline-none transition focus:border-[#ba0013] focus:bg-white"
        onChange={(event) => onServiceChange(event.target.value)}
        value={service}
      >
        <option value="all">Táº¥t cáº£ dá»‹ch vá»¥</option>
        <option value="diagnostic">Cháº©n Ä‘oÃ¡n Ä‘á»™ng cÆ¡</option>
        <option value="brake">Dá»‹ch vá»¥ phanh</option>
        <option value="maintenance">Báº£o dÆ°á»¡ng tá»•ng quÃ¡t</option>
      </select>

      <button className="flex h-12 items-center justify-center gap-2 border border-[#d8d5d5] px-5 text-sm font-black text-[#1b1c1c] transition hover:border-[#ba0013] hover:text-[#ba0013]" type="button">
        <Icon name="sliders" />
        Bá»™ lá»c nÃ¢ng cao
      </button>

      <button className="flex h-12 items-center justify-center gap-2 bg-[#ba0013] px-5 text-sm font-black text-white transition hover:bg-[#94000f]" type="button">
        <Icon name="download" />
        Xuáº¥t danh sÃ¡ch
      </button>
    </section>
  )
}

function BookingTable({
  bookings,
  onStatusChange,
}: {
  bookings: BookingRequest[]
  onStatusChange: (id: string, status: BookingStatus) => void
}) {
  return (
    <section className="overflow-hidden border border-[#efeded] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#efeded] bg-[#fbf9f8] text-xs font-black uppercase tracking-[0.14em] text-[#6a6767]">
              <th className="px-6 py-4">ThÃ´ng tin khÃ¡ch hÃ ng</th>
              <th className="px-6 py-4">Xe & biá»ƒn sá»‘</th>
              <th className="px-6 py-4">Dá»‹ch vá»¥ yÃªu cáº§u</th>
              <th className="px-6 py-4">Khung giá»</th>
              <th className="px-6 py-4">Tráº¡ng thÃ¡i</th>
              <th className="px-6 py-4 text-right">Thao tÃ¡c</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#efeded]">
            {bookings.map((booking) => (
              <tr className="align-middle transition hover:bg-[#fffafa]" key={booking.id}>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center bg-[#1b1c1c] text-sm font-black text-white">
                      {booking.initials}
                    </span>
                    <span>
                      <span className="block text-base font-black text-[#171717]">{booking.customer}</span>
                      <span className="text-sm font-semibold text-[#6a6767]">{booking.phone}</span>
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <p className="font-black text-[#171717]">{booking.vehicle}</p>
                  <p className="mt-1 font-mono text-sm font-bold text-[#ba0013]">{booking.plate}</p>
                  <p className="mt-1 font-mono text-xs text-[#8a8686]">{booking.vin}</p>
                </td>
                <td className="px-6 py-5">
                  <p className="max-w-[260px] text-sm font-bold leading-6 text-[#1b1c1c]">{booking.service}</p>
                  <p className="mt-1 text-xs font-semibold text-[#8a8686]">Cá»‘ váº¥n: {booking.advisor}</p>
                </td>
                <td className="px-6 py-5">
                  <p className="text-lg font-black text-[#171717]">{booking.time}</p>
                  <p className="text-sm font-semibold text-[#6a6767]">{booking.date}</p>
                </td>
                <td className="px-6 py-5">
                  <StatusBadge status={booking.status} />
                </td>
                <td className="px-6 py-5">
                  <div className="flex justify-end gap-2">
                    <button
                      aria-label={`XÃ¡c nháº­n lá»‹ch cá»§a ${booking.customer}`}
                      className="flex h-10 w-10 items-center justify-center bg-[#ba0013] text-white transition hover:bg-[#94000f] disabled:cursor-not-allowed disabled:bg-[#d8d5d5]"
                      disabled={booking.status !== 'pending'}
                      onClick={() => onStatusChange(booking.id, 'confirmed')}
                      title="XÃ¡c nháº­n"
                      type="button"
                    >
                      <Icon name="check" />
                    </button>
                    <button
                      aria-label={`Tá»« chá»‘i lá»‹ch cá»§a ${booking.customer}`}
                      className="flex h-10 min-w-24 items-center justify-center border border-[#d8d5d5] px-4 text-sm font-black text-[#1b1c1c] transition hover:border-[#ba0013] hover:text-[#ba0013] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={booking.status !== 'pending'}
                      onClick={() => onStatusChange(booking.id, 'rejected')}
                      type="button"
                    >
                      Tá»« chá»‘i
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function BookingRequestsPage() {
  const [bookings, setBookings] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [apiMessage, setApiMessage] = useState<string>()
  const [query, setQuery] = useState('')
  const [service, setService] = useState('all')

  useEffect(() => {
    let cancelled = false

    async function loadBookings() {
      setLoading(true)
      setApiMessage(undefined)
      try {
        const response = await fetchWorkshopBookings()
        const nextBookings = unwrapArray<ApiBooking>(response, ['bookings']).map(mapBooking)
        if (!cancelled) setBookings(nextBookings)
      } catch (err) {
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Không tải được danh sách booking từ API')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadBookings()

    return () => {
      cancelled = true
    }
  }, [])
  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return bookings.filter((booking) => {
      const matchesQuery =
        !normalizedQuery ||
        `${booking.customer} ${booking.phone} ${booking.vehicle} ${booking.plate} ${booking.vin} ${booking.service}`
          .toLowerCase()
          .includes(normalizedQuery)

      const serviceMap: Record<string, string[]> = {
        all: [],
        brake: ['phanh'],
        diagnostic: ['cháº©n Ä‘oÃ¡n', 'Ä‘á»™ng cÆ¡'],
        maintenance: ['báº£o dÆ°á»¡ng', 'thay dáº§u'],
      }
      const serviceTerms = serviceMap[service] ?? []
      const matchesService = serviceTerms.length === 0 || serviceTerms.some((term) => booking.service.toLowerCase().includes(term))

      return matchesQuery && matchesService
    })
  }, [bookings, query, service])

  async function updateStatus(id: string, status: BookingStatus) {
    setApiMessage(undefined)
    try {
      const response = status === 'confirmed' ? await confirmWorkshopBooking(id) : await rejectWorkshopBooking(id)
      const booking = 'booking' in response && response.booking ? response.booking : response
      setBookings((current) => current.map((item) => (item.id === id ? mapBooking(booking as ApiBooking) : item)))
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Không cập nhật được trạng thái booking')
    }
  }

  const pendingCount = bookings.filter((booking) => booking.status === 'pending').length

  return (
    <ServiceAdvisorShell active="bookings" title="Danh sÃ¡ch Ä‘áº·t lá»‹ch">
      <div className="space-y-7">
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard icon="calendar" label="Äáº·t lá»‹ch chá» duyá»‡t" note="+4 yÃªu cáº§u má»›i hÃ´m nay" value={String(pendingCount).padStart(2, '0')} />
          <StatCard icon="clipboard" label="Lá»‹ch háº¹n hÃ´m nay" note="6 xe chÆ°a tiáº¿p nháº­n" value="28" />
          <StatCard icon="users" label="KhÃ¡ch hÃ ng má»›i" note="Trong 7 ngÃ y gáº§n nháº¥t" value="05" />
        </section>

        {apiMessage ? <div className="border border-[#e7bdb8] bg-[#fffafa] px-5 py-4 text-sm font-bold text-[#ba0013]">{apiMessage}</div> : null}
        <FilterBar onQueryChange={setQuery} onServiceChange={setService} query={query} service={service} />
        {loading ? <div className="border border-[#efeded] bg-white p-8 text-sm font-bold text-[#6a6767]">Đang tải booking từ API...</div> : <BookingTable bookings={filteredBookings} onStatusChange={updateStatus} />}

        <footer className="grid gap-6 bg-[#1b1c1c] p-8 text-white lg:grid-cols-[1fr_auto_auto] lg:items-center">
          <div>
            <p className="text-lg font-black">Kapa Service Desk</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">
              Theo dÃµi lá»‹ch Ä‘áº·t, phÃ¢n bá»• cá»‘ váº¥n vÃ  chuyá»ƒn nhanh sang quy trÃ¬nh tiáº¿p nháº­n xe.
            </p>
          </div>
          <div className="text-sm text-white/65">
            <p className="font-black text-white">Ca trá»±c hiá»‡n táº¡i</p>
            <p>08:00 - 17:30</p>
          </div>
          <Link className="inline-flex h-12 items-center justify-center bg-white px-5 text-sm font-black text-[#1b1c1c]" to="/advisor/reception">
            Má»Ÿ biá»ƒu máº«u nháº­n xe
          </Link>
        </footer>
      </div>
    </ServiceAdvisorShell>
  )
}
