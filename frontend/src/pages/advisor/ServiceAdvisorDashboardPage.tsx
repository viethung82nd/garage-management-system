import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../../shared/ui/base'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

const stats = [
  { icon: 'calendar', label: 'Booking chờ duyệt', note: '+4 yêu cầu mới', value: '12' },
  { icon: 'clipboard', label: 'Xe cần tiếp nhận', note: 'Trong hôm nay', value: '06' },
  { icon: 'wrench', label: 'Lệnh đang mở', note: 'Đã phân công KTV', value: '18' },
  { icon: 'users', label: 'Khách đang chờ', note: 'Tại quầy dịch vụ', value: '04' },
] satisfies Array<{ icon: IconName; label: string; note: string; value: string }>

const queue = [
  { customer: 'Alex Nguyễn', meta: 'BMW M4 Competition - 51K-882.88', status: 'Chờ xác nhận', to: '/advisor/bookings' },
  { customer: 'Sarah Trần', meta: 'Audi RS6 Avant - 30F-686.01', status: 'Cần tiếp nhận', to: '/advisor/reception' },
  { customer: 'David Lê', meta: 'Toyota GR Supra - 29A-404.95', status: 'Đã phân công', to: '/advisor/work-orders' },
]

function StatCard({ stat }: { stat: (typeof stats)[number] }) {
  return (
    <section className="border border-[#efeded] bg-white p-6 shadow-[0_18px_40px_rgba(27,28,28,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.14em] text-[#6a6767]">{stat.label}</p>
          <p className="mt-3 text-4xl font-black text-[#171717]">{stat.value}</p>
          <p className="mt-2 text-sm font-semibold text-[#ba0013]">{stat.note}</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center bg-[#fff1f1] text-[#ba0013]">
          <Icon name={stat.icon} />
        </span>
      </div>
    </section>
  )
}

export function ServiceAdvisorDashboardPage() {
  return (
    <ServiceAdvisorShell active="dashboard" title="Tổng quan Service Advisor">
      <div className="space-y-7">
        <section className="relative overflow-hidden border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
          <div className="absolute right-8 top-8 hidden text-[#ba0013]/10 lg:block">
            <Icon className="h-32 w-32" name="clipboard" />
          </div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#ba0013]">Service Desk</p>
          <h2 className="mt-3 text-4xl font-black leading-tight text-[#171717] md:text-5xl">Quản lý đặt lịch, tiếp nhận và phân công</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#6a6767]">
            Đây là màn hình riêng cho Service Advisor, không trộn các chức năng quản trị hệ thống của Admin.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </section>

        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="border border-[#efeded] bg-white">
            <div className="flex items-center justify-between border-b border-[#efeded] px-6 py-5">
              <h3 className="text-lg font-black text-[#171717]">Hàng đợi cần xử lý</h3>
              <Link className="text-sm font-black text-[#ba0013] hover:underline" to="/advisor/bookings">
                Xem booking
              </Link>
            </div>
            <div className="divide-y divide-[#efeded]">
              {queue.map((item) => (
                <Link className="grid gap-3 p-5 transition hover:bg-[#fffafa] sm:grid-cols-[1fr_auto] sm:items-center" key={item.customer} to={item.to}>
                  <span>
                    <span className="block font-black text-[#171717]">{item.customer}</span>
                    <span className="mt-1 block text-sm font-semibold text-[#6a6767]">{item.meta}</span>
                  </span>
                  <span className="bg-[#fff1f1] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#ba0013]">{item.status}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="bg-[#1b1c1c] p-6 text-white">
            <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-[#ffb4ab]">Thao tác nhanh</p>
            <div className="mt-5 space-y-3">
              <Link className="flex min-h-12 items-center justify-between bg-white px-4 text-sm font-black text-[#1b1c1c]" to="/advisor/reception">
                Tiếp nhận xe <Icon name="chevron-right" />
              </Link>
              <Link className="flex min-h-12 items-center justify-between bg-white/10 px-4 text-sm font-black text-white" to="/advisor/work-orders">
                Tạo lệnh sửa chữa <Icon name="chevron-right" />
              </Link>
              <Link className="flex min-h-12 items-center justify-between bg-white/10 px-4 text-sm font-black text-white" to="/advisor/bookings">
                Duyệt lịch đặt <Icon name="chevron-right" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </ServiceAdvisorShell>
  )
}
