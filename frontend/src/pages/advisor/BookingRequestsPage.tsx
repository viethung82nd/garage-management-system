import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../../shared/ui/base'

type BookingStatus = 'pending' | 'confirmed' | 'rejected'

type BookingRequest = {
  id: number
  customer: string
  phone: string
  initials: string
  vehicle: string
  plate: string
  vin: string
  service: string
  time: string
  date: string
  advisor: string
  status: BookingStatus
}

type NavItem = {
  icon: IconName
  label: string
  to: string
  active?: boolean
}

const navItems: NavItem[] = [
  { icon: 'grid', label: 'Tổng quan', to: '/admin/dashboard' },
  { icon: 'calendar', label: 'Đặt lịch', to: '/advisor/bookings', active: true },
  { icon: 'clipboard', label: 'Tiếp nhận xe', to: '/advisor/reception' },
  { icon: 'car', label: 'Phương tiện', to: '/advisor/vehicles' },
  { icon: 'wrench', label: 'Dịch vụ', to: '/admin/services' },
  { icon: 'users', label: 'Nhân sự', to: '/admin/users' },
]

const initialBookings: BookingRequest[] = [
  {
    id: 1,
    advisor: 'Minh Anh',
    customer: 'Alex Nguyễn',
    date: 'Ngày mai',
    initials: 'AN',
    phone: '090 123 4567',
    plate: '51K-882.88',
    service: 'Chẩn đoán động cơ & cân chỉnh hiệu suất',
    status: 'pending',
    time: '10:30',
    vehicle: 'BMW M4 Competition',
    vin: 'WBS33AZ08PCM44882',
  },
  {
    id: 2,
    advisor: 'Quang Huy',
    customer: 'Sarah Trần',
    date: '24/10/2026',
    initials: 'ST',
    phone: '091 888 9999',
    plate: '30F-686.01',
    service: 'Kiểm tra và phục hồi hệ thống phanh',
    status: 'pending',
    time: '14:00',
    vehicle: 'Audi RS6 Avant',
    vin: 'WUAZZZF24MN904401',
  },
  {
    id: 3,
    advisor: 'Lan Chi',
    customer: 'David Lê',
    date: 'Hôm nay',
    initials: 'DL',
    phone: '098 765 4321',
    plate: '29A-404.95',
    service: 'Thay dầu, lọc và kiểm tra dung dịch',
    status: 'pending',
    time: '16:30',
    vehicle: 'Toyota GR Supra',
    vin: 'JTSCZ4FE8M5004495',
  },
  {
    id: 4,
    advisor: 'Minh Anh',
    customer: 'Phạm Hoàng',
    date: '25/10/2026',
    initials: 'PH',
    phone: '097 111 2222',
    plate: '51H-888.20',
    service: 'Bảo dưỡng tổng quát và vệ sinh khoang máy',
    status: 'pending',
    time: '09:15',
    vehicle: 'VinFast Lux A2.0',
    vin: 'RLVCE2SA5NV088820',
  },
]

const statusLabels: Record<BookingStatus, string> = {
  confirmed: 'Đã xác nhận',
  pending: 'Chờ duyệt',
  rejected: 'Đã từ chối',
}

function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-[#efeded] bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:flex-col">
      <div className="flex h-20 items-center gap-3 border-b border-[#efeded] px-7">
        <div className="flex h-11 w-11 items-center justify-center bg-[#ba0013] text-white">
          <Icon name="car" />
        </div>
        <div>
          <p className="text-lg font-black leading-none text-[#171717]">Kapa</p>
          <p className="mt-1 text-xs font-bold uppercase text-[#8a8686]">Garage System</p>
        </div>
      </div>

      <div className="border-b border-[#efeded] px-7 py-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a8686]">Trung tâm dịch vụ</p>
        <p className="mt-2 text-sm font-black text-[#1b1c1c]">Kapa Auto Quận 7</p>
        <p className="mt-1 text-xs text-[#6a6767]">Cố vấn dịch vụ đang trực</p>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6">
        {navItems.map((item) => (
          <Link
            className={
              item.active
                ? 'flex min-h-12 items-center gap-3 bg-[#ba0013] px-4 text-sm font-black text-white'
                : 'flex min-h-12 items-center gap-3 px-4 text-sm font-bold text-[#555151] transition hover:bg-[#fbf9f8] hover:text-[#ba0013]'
            }
            key={item.label}
            to={item.to}
          >
            <Icon name={item.icon} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="space-y-4 border-t border-[#efeded] p-5">
        <Link
          className="flex min-h-12 items-center justify-center gap-2 bg-[#1b1c1c] px-4 text-sm font-black text-white transition hover:bg-[#343030]"
          to="/advisor/reception"
        >
          <Icon name="plus" />
          Tạo phiếu tiếp nhận
        </Link>
        <button
          className="flex w-full min-h-11 items-center justify-center gap-2 border border-[#d8d5d5] px-4 text-sm font-bold text-[#555151] transition hover:border-[#ba0013] hover:text-[#ba0013]"
          type="button"
        >
          <Icon name="logout" />
          Đăng xuất
        </button>
      </div>
    </aside>
  )
}

function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-[#efeded] bg-white/95 backdrop-blur">
      <div className="flex min-h-20 items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#171717] sm:text-3xl">Danh sách đặt lịch</h1>
            <span className="border border-[#ba0013] px-2 py-1 text-xs font-black uppercase text-[#ba0013]">Live</span>
          </div>
          <p className="mt-1 text-sm text-[#6a6767]">Xác nhận hoặc từ chối các yêu cầu đặt lịch đang chờ xử lý.</p>
        </div>

        <div className="hidden items-center gap-4 sm:flex">
          <button
            aria-label="Thông báo"
            className="relative flex h-11 w-11 items-center justify-center border border-[#dedada] text-[#1b1c1c] transition hover:border-[#ba0013] hover:text-[#ba0013]"
            type="button"
          >
            <Icon name="bell" />
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center bg-[#ba0013] px-1 text-[10px] font-black text-white">
              3
            </span>
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center bg-[#1b1c1c] text-sm font-black text-white">MA</div>
            <div>
              <p className="text-sm font-black text-[#1b1c1c]">Minh Anh</p>
              <p className="text-xs text-[#6a6767]">Service Advisor</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

function StatCard({
  icon,
  label,
  value,
  note,
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
  query,
  service,
  onQueryChange,
  onServiceChange,
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
          placeholder="Tìm khách hàng, biển số hoặc VIN..."
          type="search"
          value={query}
        />
      </label>

      <select
        className="h-12 border border-[#d8d5d5] bg-[#fbf9f8] px-4 text-sm font-bold text-[#1b1c1c] outline-none transition focus:border-[#ba0013] focus:bg-white"
        onChange={(event) => onServiceChange(event.target.value)}
        value={service}
      >
        <option value="all">Tất cả dịch vụ</option>
        <option value="diagnostic">Chẩn đoán động cơ</option>
        <option value="brake">Dịch vụ phanh</option>
        <option value="maintenance">Bảo dưỡng tổng quát</option>
      </select>

      <button
        className="flex h-12 items-center justify-center gap-2 border border-[#d8d5d5] px-5 text-sm font-black text-[#1b1c1c] transition hover:border-[#ba0013] hover:text-[#ba0013]"
        type="button"
      >
        <Icon name="sliders" />
        Bộ lọc nâng cao
      </button>

      <button
        className="flex h-12 items-center justify-center gap-2 bg-[#ba0013] px-5 text-sm font-black text-white transition hover:bg-[#94000f]"
        type="button"
      >
        <Icon name="download" />
        Xuất danh sách
      </button>
    </section>
  )
}

function BookingTable({
  bookings,
  onStatusChange,
}: {
  bookings: BookingRequest[]
  onStatusChange: (id: number, status: BookingStatus) => void
}) {
  return (
    <section className="overflow-hidden border border-[#efeded] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#efeded] bg-[#fbf9f8] text-xs font-black uppercase tracking-[0.14em] text-[#6a6767]">
              <th className="px-6 py-4">Thông tin khách hàng</th>
              <th className="px-6 py-4">Xe & biển số</th>
              <th className="px-6 py-4">Dịch vụ yêu cầu</th>
              <th className="px-6 py-4">Khung giờ</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
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
                  <p className="mt-1 text-xs font-semibold text-[#8a8686]">Cố vấn: {booking.advisor}</p>
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
                      aria-label={`Xác nhận lịch của ${booking.customer}`}
                      className="flex h-10 w-10 items-center justify-center bg-[#ba0013] text-white transition hover:bg-[#94000f] disabled:cursor-not-allowed disabled:bg-[#d8d5d5]"
                      disabled={booking.status !== 'pending'}
                      onClick={() => onStatusChange(booking.id, 'confirmed')}
                      title="Xác nhận"
                      type="button"
                    >
                      <Icon name="check" />
                    </button>
                    <button
                      aria-label={`Từ chối lịch của ${booking.customer}`}
                      className="flex h-10 min-w-24 items-center justify-center border border-[#d8d5d5] px-4 text-sm font-black text-[#1b1c1c] transition hover:border-[#ba0013] hover:text-[#ba0013] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={booking.status !== 'pending'}
                      onClick={() => onStatusChange(booking.id, 'rejected')}
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

      <div className="flex flex-col gap-4 border-t border-[#efeded] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-[#6a6767]">Hiển thị {bookings.length} trong tổng số 12 yêu cầu chờ duyệt</p>
        <div className="flex items-center gap-2">
          <button
            aria-label="Trang trước"
            className="flex h-10 w-10 items-center justify-center border border-[#d8d5d5] text-[#8a8686]"
            disabled
            type="button"
          >
            <Icon name="chevron-left" />
          </button>
          {[1, 2, 3].map((page) => (
            <button
              className={
                page === 1
                  ? 'h-10 w-10 bg-[#ba0013] text-sm font-black text-white'
                  : 'h-10 w-10 border border-[#d8d5d5] text-sm font-black text-[#1b1c1c] transition hover:border-[#ba0013] hover:text-[#ba0013]'
              }
              key={page}
              type="button"
            >
              {page}
            </button>
          ))}
          <button
            aria-label="Trang sau"
            className="flex h-10 w-10 items-center justify-center border border-[#d8d5d5] text-[#1b1c1c] transition hover:border-[#ba0013] hover:text-[#ba0013]"
            type="button"
          >
            <Icon name="chevron-right" />
          </button>
        </div>
      </div>
    </section>
  )
}

function PageFooter() {
  return (
    <footer className="grid gap-6 bg-[#1b1c1c] p-8 text-white lg:grid-cols-[1fr_auto_auto] lg:items-center">
      <div>
        <p className="text-lg font-black">Kapa Service Desk</p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">
          Theo dõi lịch đặt, phân bổ cố vấn và chuyển nhanh sang quy trình tiếp nhận xe.
        </p>
      </div>
      <div className="text-sm text-white/65">
        <p className="font-black text-white">Ca trực hiện tại</p>
        <p>08:00 - 17:30</p>
      </div>
      <Link className="inline-flex h-12 items-center justify-center bg-white px-5 text-sm font-black text-[#1b1c1c]" to="/advisor/reception">
        Mở biểu mẫu nhận xe
      </Link>
    </footer>
  )
}

export function BookingRequestsPage() {
  const [bookings, setBookings] = useState(initialBookings)
  const [query, setQuery] = useState('')
  const [service, setService] = useState('all')

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
        diagnostic: ['chẩn đoán', 'động cơ'],
        maintenance: ['bảo dưỡng', 'thay dầu'],
      }
      const serviceTerms = serviceMap[service] ?? []
      const matchesService = serviceTerms.length === 0 || serviceTerms.some((term) => booking.service.toLowerCase().includes(term))

      return matchesQuery && matchesService
    })
  }, [bookings, query, service])

  function updateStatus(id: number, status: BookingStatus) {
    setBookings((current) => current.map((booking) => (booking.id === id ? { ...booking, status } : booking)))
  }

  const pendingCount = bookings.filter((booking) => booking.status === 'pending').length

  return (
    <div className="min-h-screen bg-[#fbf9f8] text-[#1b1c1c]">
      <Sidebar />
      <main className="lg:pl-64">
        <TopBar />
        <div className="space-y-7 px-5 py-7 sm:px-8 lg:px-10">
          <section className="grid gap-4 md:grid-cols-3">
            <StatCard icon="calendar" label="Đặt lịch chờ duyệt" note="+4 yêu cầu mới hôm nay" value={String(pendingCount).padStart(2, '0')} />
            <StatCard icon="clipboard" label="Lịch hẹn hôm nay" note="6 xe chưa tiếp nhận" value="28" />
            <StatCard icon="users" label="Khách hàng mới" note="Trong 7 ngày gần nhất" value="05" />
          </section>

          <FilterBar
            onQueryChange={setQuery}
            onServiceChange={setService}
            query={query}
            service={service}
          />

          <BookingTable bookings={filteredBookings} onStatusChange={updateStatus} />
          <PageFooter />
        </div>
      </main>

      <Link
        aria-label="Tạo phiếu tiếp nhận"
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center bg-[#ba0013] text-white shadow-[0_18px_40px_rgba(186,0,19,0.35)] transition hover:bg-[#94000f]"
        to="/advisor/reception"
      >
        <Icon name="plus" />
      </Link>
    </div>
  )
}
