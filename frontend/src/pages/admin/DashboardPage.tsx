import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../../shared/ui/base'

const RED = '#ba0013'

const navItems = [
  { label: 'Tổng quan', icon: 'grid', path: '/admin/dashboard', active: true },
  { label: 'Lệnh sửa chữa', icon: 'wrench', path: '/advisor/work-orders' },
  { label: 'Phương tiện', icon: 'car', path: '/advisor/vehicles' },
  { label: 'Kho phụ tùng', icon: 'sliders', path: '/admin/parts' },
  { label: 'Nhân sự', icon: 'team', path: '/technician/tasks' },
] satisfies Array<{ label: string; icon: IconName; path: string; active?: boolean }>

const stats = [
  { label: 'Xe đang sửa', value: '24', delta: '+12%', icon: 'wrench', tone: 'green' },
  { label: 'Doanh thu hôm nay', value: '14.250.000đ', delta: '+5.4tr', icon: 'cash', tone: 'green' },
  { label: 'Lịch đặt mới', value: '08', delta: 'Bình thường', icon: 'calendar', tone: 'neutral' },
  { label: 'Kỹ thuật viên trực', value: '12/12', delta: 'Đủ ca', icon: 'team', tone: 'red' },
] satisfies Array<{ label: string; value: string; delta: string; icon: IconName; tone: 'green' | 'neutral' | 'red' }>

const appointments = [
  {
    vehicle: 'Porsche 911 GT3',
    plate: '911-SR-2023',
    customer: 'Marcus Sterling',
    service: 'Cân chỉnh hiệu suất Stage 2',
    status: 'Đang sửa',
    tone: 'amber',
  },
  {
    vehicle: 'BMW M4 Competition',
    plate: 'M4-FAST-01',
    customer: 'Elena Rodriguez',
    service: 'Nâng cấp hệ thống phanh',
    status: 'Sẵn sàng',
    tone: 'green',
  },
  {
    vehicle: 'Audi RS6 Avant',
    plate: 'V10-POWER',
    customer: 'John Wickham',
    service: 'Xả và thay dầu hộp số',
    status: 'Khẩn cấp',
    tone: 'red',
  },
  {
    vehicle: 'Nissan GT-R Nismo',
    plate: 'GODZILLA-99',
    customer: 'Kenji Tanaka',
    service: 'Kiểm tra hiệu suất định kỳ',
    status: 'Đã lên lịch',
    tone: 'gray',
  },
] satisfies Array<{
  vehicle: string
  plate: string
  customer: string
  service: string
  status: string
  tone: 'amber' | 'green' | 'red' | 'gray'
}>

const activity = [
  { label: 'Hóa đơn #4928 đã tạo', meta: 'KTV: Sarah Miller - 15 phút trước', color: '#ba0013' },
  { label: 'Đặt phụ tùng: đĩa phanh carbon', meta: 'Nhà cung cấp: Brembo USA - 1 giờ trước', color: '#f59e0b' },
  { label: 'Hoàn tất chẩn đoán RS6', meta: 'KTV: Dave Wilson - 3 giờ trước', color: '#22c55e' },
]

const inventory = [
  { label: 'Dầu hiệu suất cao (lít)', value: 82, color: '#22c55e' },
  { label: 'Má phanh Racing Series', value: 12, color: RED, low: true },
  { label: 'Bugi Iridium', value: 45, color: '#f59e0b' },
]

function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e4e2e2] bg-white/90 backdrop-blur-xl">
      <div className="flex h-20 w-full items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link className="text-2xl font-black tracking-tight text-[#ba0013]" to="/admin/dashboard">
            Garage Master
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {[
              ['Dashboard', '/admin/dashboard'],
              ['Schedule', '/advisor/bookings'],
              ['Reports', '/admin/reports'],
              ['Settings', '/admin/settings'],
            ].map(([label, path], index) => (
              <Link
                className={
                  index === 0
                    ? 'border-b-2 border-[#ba0013] pb-1 font-bold text-[#ba0013]'
                    : 'font-semibold text-[#5f5e5e] transition hover:text-[#ba0013]'
                }
                key={path}
                to={path}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-5">
          <Link
            className="hidden bg-[#ba0013] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#93000d] sm:inline-flex"
            to="/advisor/reception"
          >
            Tạo lệnh
          </Link>
          <button aria-label="Thông báo" className="text-[#5f5e5e] transition hover:text-[#ba0013]" type="button">
            <Icon name="bell" />
          </button>
          <button aria-label="Tài khoản" className="text-[#5f5e5e] transition hover:text-[#ba0013]" type="button">
            <Icon name="person" />
          </button>
        </div>
      </div>
    </header>
  )
}

function SideNav() {
  return (
    <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] w-64 shrink-0 border-r border-[#e4e2e2] bg-white py-6 lg:flex lg:flex-col">
      <div className="mb-6 px-4">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#5f5e5e]">Điều hướng</p>
        <h2 className="mt-2 text-sm font-black text-[#ba0013]">Trung tâm dịch vụ</h2>
        <p className="text-xs text-[#5f5e5e]">Chi nhánh chính</p>
      </div>
      <nav className="flex-1">
        {navItems.map((item) => (
          <Link
            className={
              item.active
                ? 'flex items-center gap-3 border-l-4 border-[#ba0013] bg-[#efeded] px-4 py-3 font-bold text-[#ba0013]'
                : 'flex items-center gap-3 px-4 py-3 font-semibold text-[#5f5e5e] transition hover:bg-[#f5f3f3] hover:text-[#ba0013]'
            }
            key={item.path}
            to={item.path}
          >
            <Icon name={item.icon} />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="space-y-3 px-4">
        <Link
          className="flex min-h-11 items-center justify-center gap-2 bg-[#ba0013] text-sm font-bold text-white transition hover:bg-[#93000d]"
          to="/advisor/reception"
        >
          <Icon name="plus" />
          Chẩn đoán mới
        </Link>
        <button className="flex items-center gap-3 py-2 text-sm font-semibold text-[#5f5e5e] hover:text-[#ba0013]" type="button">
          <Icon name="help" />
          Trợ giúp
        </button>
        <button className="flex items-center gap-3 py-2 text-sm font-semibold text-[#5f5e5e] hover:text-[#ba0013]" type="button">
          <Icon name="logout" />
          Đăng xuất
        </button>
      </div>
    </aside>
  )
}

function Hero() {
  return (
    <section className="relative mb-8 overflow-hidden border-l-8 border-[#ba0013] bg-[linear-gradient(135deg,rgba(186,0,19,0.06),#fbf9f8)] p-8">
      <div className="relative z-10 max-w-2xl">
        <p className="mb-2 font-mono text-sm font-bold uppercase tracking-[0.12em] text-[#ba0013]">Bảng hiệu suất</p>
        <h1 className="text-4xl font-black leading-tight tracking-tight text-[#1b1c1c] md:text-5xl">
          Chào mừng trở lại.
        </h1>
        <p className="mt-5 text-lg leading-8 text-[#5f5e5e]">
          Gara đang vận hành ở mức 94% hiệu suất hôm nay. 8 xe đang trên cầu nâng và 3 lịch cân chỉnh hiệu suất đã được lên lịch trong buổi chiều.
        </p>
      </div>
      <div className="absolute right-0 top-0 hidden h-full w-1/3 translate-x-10 opacity-25 md:block">
        <div className="h-full w-full bg-[radial-gradient(circle_at_30%_30%,#303031,transparent_26%),linear-gradient(135deg,#c8c6c5,#ffffff)] grayscale" />
      </div>
    </section>
  )
}

function StatCard({ stat }: { stat: (typeof stats)[number] }) {
  const deltaClass =
    stat.tone === 'green'
      ? 'bg-green-50 text-green-700'
      : stat.tone === 'red'
        ? 'bg-red-50 text-[#ba0013]'
        : 'bg-[#efeded] text-[#1b1c1c]'

  return (
    <article className="border-t-4 border-[#ba0013] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
      <div className="mb-5 flex items-start justify-between">
        <span className="bg-[#ffdad6] p-3 text-[#ba0013]">
          <Icon name={stat.icon} />
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${deltaClass}`}>{stat.delta}</span>
      </div>
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#5f5e5e]">{stat.label}</p>
      <p className="mt-2 text-3xl font-black text-[#1b1c1c]">{stat.value}</p>
    </article>
  )
}

function StatusChip({ tone, children }: { tone: (typeof appointments)[number]['tone']; children: string }) {
  const className = {
    amber: 'bg-amber-100 text-amber-800',
    gray: 'bg-[#e4e2e2] text-[#5f5e5e]',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-[#ba0013]',
  }[tone]

  return <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${className}`}>{children}</span>
}

function AppointmentsTable() {
  return (
    <section className="xl:col-span-2">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#1b1c1c]">Lịch hẹn sắp tới</h2>
          <p className="mt-1 text-[#5f5e5e]">Dịch vụ đã lên lịch trong 48 giờ tới</p>
        </div>
        <Link className="flex items-center gap-1 text-sm font-black text-[#ba0013] hover:underline" to="/advisor/bookings">
          Xem tất cả <Icon className="h-4 w-4" name="chevron-right" />
        </Link>
      </div>
      <div className="overflow-x-auto bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-[#e2dfde]/60">
            <tr>
              {['Xe', 'Khách hàng', 'Loại dịch vụ', 'Trạng thái', 'Thao tác'].map((heading) => (
                <th className="px-4 py-4 font-mono text-[11px] font-black uppercase tracking-[0.12em] text-[#5f5e5e]" key={heading}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {appointments.map((item, index) => (
              <tr className={index % 2 === 0 ? 'bg-white hover:bg-[#efeded]' : 'bg-[#f5f3f3] hover:bg-[#efeded]'} key={item.plate}>
                <td className="px-4 py-4">
                  <p className="font-black text-[#1b1c1c]">{item.vehicle}</p>
                  <p className="font-mono text-xs font-bold text-[#5f5e5e]">{item.plate}</p>
                </td>
                <td className="px-4 py-4 text-sm text-[#1b1c1c]">{item.customer}</td>
                <td className="px-4 py-4 text-sm text-[#1b1c1c]">{item.service}</td>
                <td className="px-4 py-4">
                  <StatusChip tone={item.tone}>{item.status}</StatusChip>
                </td>
                <td className="px-4 py-4">
                  <button aria-label="Mở thao tác" className="text-[#5f5e5e] transition hover:text-[#ba0013]" type="button">
                    <Icon name="more" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function RecentActivity() {
  return (
    <section className="border-l-4 border-[#5f5e5e] bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-sm font-black uppercase tracking-[0.16em] text-[#1b1c1c]">Hoạt động gần đây</h3>
      <div className="space-y-6">
        {activity.map((item) => (
          <div className="flex items-start gap-4" key={item.label}>
            <span className="mt-2 h-2 w-2 rounded-full" style={{ background: item.color }} />
            <div>
              <p className="text-sm font-black text-[#1b1c1c]">{item.label}</p>
              <p className="text-xs text-[#5f5e5e]">{item.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function InventoryTracking() {
  return (
    <section className="bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[#1b1c1c]">Theo dõi kho</h3>
        <Icon className="text-[#ba0013]" name="invoice" />
      </div>
      <div className="space-y-5">
        {inventory.map((item) => (
          <div key={item.label}>
            <div className={`mb-1 flex justify-between text-xs font-black ${item.low ? 'text-[#ba0013]' : 'text-[#1b1c1c]'}`}>
              <span>{item.label}</span>
              <span>{item.value}%{item.low ? ' thấp' : ''}</span>
            </div>
            <div className="h-2 w-full bg-[#efeded]">
              <div className="h-full" style={{ width: `${item.value}%`, background: item.color }} />
            </div>
          </div>
        ))}
      </div>
      <Link
        className="mt-7 flex min-h-11 items-center justify-center border-2 border-[#ba0013] text-xs font-black uppercase tracking-[0.18em] text-[#ba0013] transition hover:bg-[#ba0013] hover:text-white"
        to="/admin/parts"
      >
        Quản lý kho
      </Link>
    </section>
  )
}

export function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-[#fbf9f8] font-sans text-[#1b1c1c]">
      <TopNav />
      <div className="flex w-full gap-6 px-6 py-2">
        <SideNav />
        <main className="min-w-0 flex-1 py-6">
          <Hero />
          <section className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} stat={stat} />
            ))}
          </section>
          <div className="grid items-start gap-8 xl:grid-cols-3">
            <AppointmentsTable />
            <div className="space-y-8">
              <RecentActivity />
              <InventoryTracking />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
