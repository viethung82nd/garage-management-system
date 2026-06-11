import { useMemo, useState } from 'react'
import { Button, Icon, type IconName } from '../../components/base'
import { DashboardLayout } from '../../layouts/DashboardLayout'

type BookingStatus = 'pending' | 'approved' | 'rejected'

type BookingRequest = {
  id: number
  customer: string
  phone: string
  initials: string
  vehicle: string
  plate: string
  service: string
  time: string
  date: string
  tone: 'emerald' | 'blue' | 'neutral'
  status: BookingStatus
}

const initialBookings: BookingRequest[] = [
  {
    id: 1,
    customer: 'Nguyễn Văn Hùng',
    phone: '090 123 4567',
    initials: 'NH',
    vehicle: 'Toyota Camry',
    plate: '30A-123.45',
    service: 'Thay dầu & bảo dưỡng',
    time: '14:30',
    date: '25/10/2026',
    tone: 'emerald',
    status: 'pending',
  },
  {
    id: 2,
    customer: 'Trần Thị Mai',
    phone: '091 888 9999',
    initials: 'TM',
    vehicle: 'Honda CR-V',
    plate: '51G-987.65',
    service: 'Sửa chữa động cơ',
    time: '09:00',
    date: '26/10/2026',
    tone: 'blue',
    status: 'pending',
  },
  {
    id: 3,
    customer: 'Lê Tuấn Anh',
    phone: '098 765 4321',
    initials: 'LA',
    vehicle: 'Mazda 3',
    plate: '29C-555.55',
    service: 'Kiểm tra phanh',
    time: '16:00',
    date: '25/10/2026',
    tone: 'neutral',
    status: 'pending',
  },
  {
    id: 4,
    customer: 'Phạm Minh Hoàng',
    phone: '097 111 2222',
    initials: 'PH',
    vehicle: 'VinFast Lux A2.0',
    plate: '30H-888.88',
    service: 'Vệ sinh khoang máy',
    time: '10:30',
    date: '27/10/2026',
    tone: 'emerald',
    status: 'pending',
  },
]

const avatarToneClasses = {
  blue: 'bg-[#3c4661]/35 text-[#d9e2ff]',
  emerald: 'bg-[#00ffa3]/18 text-[#00ffa3]',
  neutral: 'bg-white/10 text-white',
} satisfies Record<BookingRequest['tone'], string>

const statusLabels = {
  approved: 'Đã duyệt',
  pending: 'Chờ duyệt',
  rejected: 'Đã từ chối',
} satisfies Record<BookingStatus, string>

function SummaryCard({
  icon,
  label,
  meta,
  value,
}: {
  icon: IconName
  label: string
  meta: string
  value: string
}) {
  return (
    <section className="group relative min-h-40 overflow-hidden rounded-[3rem] border border-white/10 bg-[rgba(29,32,34,0.6)] p-7 backdrop-blur-2xl">
      <div className="relative z-10">
        <p className="text-sm font-bold text-[var(--color-on-surface-variant)]">{label}</p>
        <p className="mt-2 text-4xl font-black text-white">{value}</p>
        <p className="mt-4 flex items-center gap-2 text-sm font-bold text-[#00ffa3]">{meta}</p>
      </div>
      <Icon
        className="absolute -bottom-5 -right-5 h-24 w-24 text-[#00ffa3]/16 transition group-hover:scale-110"
        name={icon}
      />
    </section>
  )
}

function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const classes =
    status === 'approved'
      ? 'border-[#00ffa3]/25 bg-[#00ffa3]/10 text-[#00ffa3]'
      : status === 'rejected'
        ? 'border-[#ffb4ab]/35 bg-[#93000a]/25 text-[#ffb4ab]'
        : 'border-[#00ffa3]/20 bg-[#00ffa3]/10 text-[#00ffa3]'

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${classes}`}>
      {statusLabels[status]}
    </span>
  )
}

export function BookingRequestsPage() {
  const [bookings, setBookings] = useState(initialBookings)
  const [query, setQuery] = useState('')

  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return bookings
    }

    return bookings.filter((booking) =>
      `${booking.customer} ${booking.phone} ${booking.vehicle} ${booking.plate} ${booking.service}`
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [bookings, query])

  function updateStatus(id: number, status: BookingStatus) {
    setBookings((current) => current.map((booking) => (booking.id === id ? { ...booking, status } : booking)))
  }

  const pendingCount = bookings.filter((booking) => booking.status === 'pending').length

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1200px] space-y-8">
        <header className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">Danh sách đặt lịch chờ duyệt</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-on-surface-variant)]">
              Quản lý và xác nhận các yêu cầu dịch vụ từ khách hàng.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#00ffa3]/18 text-sm font-black text-[#00ffa3] ring-2 ring-[var(--color-surface)]">
                KT
              </span>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#3c4661]/40 text-sm font-black text-[#d9e2ff] ring-2 ring-[var(--color-surface)]">
                CV
              </span>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-container-high)] text-xs font-black text-[#00ffa3] ring-2 ring-[var(--color-surface)]">
                +4
              </span>
            </div>
            <span className="text-sm font-bold text-[var(--color-on-surface-variant)]">Đội ngũ đang trực</span>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <SummaryCard icon="clipboard" label="Tổng chờ duyệt" meta="+4 hôm nay" value={String(pendingCount).padStart(2, '0')} />
          <SummaryCard icon="calendar" label="Lịch hẹn hôm nay" meta="Sắp diễn ra" value="08" />
          <SummaryCard icon="users" label="Khách hàng mới" meta="Trong tuần này" value="05" />
        </section>

        <section className="flex flex-col gap-4 lg:flex-row">
          <label className="relative flex-1">
            <Icon
              className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
              name="search"
            />
            <input
              className="h-14 w-full rounded-full border border-transparent bg-[var(--color-surface-container-high)] pl-14 pr-5 text-base text-white placeholder:text-[#87909d] focus:border-[#00ffa3] focus:outline-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên khách hoặc biển số xe..."
              type="search"
              value={query}
            />
          </label>
          <div className="flex gap-3">
            <Button className="min-w-32 bg-[var(--color-surface-container-high)] text-white hover:bg-[var(--color-surface-container-highest)]" type="button" variant="ghost">
              <Icon name="sliders" />
              Bộ lọc
            </Button>
            <Button className="min-w-32 bg-[var(--color-surface-container-high)] text-white hover:bg-[var(--color-surface-container-highest)]" type="button" variant="ghost">
              <Icon name="download" />
              Xuất file
            </Button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[3rem] border border-white/10 bg-[rgba(29,32,34,0.6)] backdrop-blur-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.05] text-sm font-black uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  <th className="px-8 py-5">Khách hàng</th>
                  <th className="px-8 py-5">Xe & biển số</th>
                  <th className="px-8 py-5">Dịch vụ yêu cầu</th>
                  <th className="px-8 py-5">Thời gian</th>
                  <th className="px-8 py-5">Trạng thái</th>
                  <th className="px-8 py-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredBookings.map((booking) => (
                  <tr className="align-middle transition hover:bg-white/[0.025]" key={booking.id}>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <span
                          className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-sm font-black ${avatarToneClasses[booking.tone]}`}
                        >
                          {booking.initials}
                        </span>
                        <span>
                          <span className="block text-lg font-black text-white">{booking.customer}</span>
                          <span className="text-sm text-[var(--color-on-surface-variant)]">{booking.phone}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-lg font-bold text-white">{booking.vehicle}</p>
                      <p className="mt-1 font-mono text-sm text-[var(--color-on-surface-variant)]">{booking.plate}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex max-w-48 rounded-full border border-white/10 bg-[var(--color-surface-container-highest)] px-4 py-2 text-sm font-medium text-[var(--color-on-surface)]">
                        {booking.service}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-lg font-black text-white">{booking.time}</p>
                      <p className="text-sm text-[var(--color-on-surface-variant)]">{booking.date}</p>
                    </td>
                    <td className="px-8 py-6">
                      <BookingStatusBadge status={booking.status} />
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-end gap-3">
                        <button
                          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#00ffa3] px-6 text-sm font-black text-[#003920] transition hover:bg-[#52ffac] disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={booking.status !== 'pending'}
                          onClick={() => updateStatus(booking.id, 'approved')}
                          type="button"
                        >
                          Duyệt
                        </button>
                        <button
                          className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#ffb4ab]/45 px-5 text-sm font-black text-[#ffb4ab] transition hover:bg-[#93000a]/20 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={booking.status !== 'pending'}
                          onClick={() => updateStatus(booking.id, 'rejected')}
                          type="button"
                        >
                          Từ chối
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-white/[0.06] px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              Hiển thị <span className="text-white">1 - {filteredBookings.length}</span> của 12 đơn đặt lịch
            </p>
            <div className="flex gap-3">
              <button
                aria-label="Trang trước"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.04] text-[var(--color-on-surface-variant)] opacity-50"
                disabled
                type="button"
              >
                <Icon name="chevron-left" />
              </button>
              {[1, 2, 3].map((page) => (
                <button
                  className={
                    page === 1
                      ? 'inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#00ffa3] font-black text-[#003920]'
                      : 'inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] font-bold text-white transition hover:bg-white/[0.1]'
                  }
                  key={page}
                  type="button"
                >
                  {page}
                </button>
              ))}
              <button
                aria-label="Trang sau"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-white transition hover:bg-white/[0.1]"
                type="button"
              >
                <Icon name="chevron-right" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
