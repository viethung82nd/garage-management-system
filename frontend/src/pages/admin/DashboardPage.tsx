import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../../shared/ui/base'

const navItems = [
  { active: true, icon: 'grid', label: 'Tổng quan', path: '/admin/dashboard' },
  { icon: 'users', label: 'Người dùng', path: '/admin/users' },
  { icon: 'gear', label: 'Phân quyền', path: '/admin/roles' },
  { icon: 'wrench', label: 'Dịch vụ', path: '/admin/services' },
  { icon: 'sliders', label: 'Phụ tùng', path: '/admin/parts' },
  { icon: 'invoice', label: 'Báo cáo hệ thống', path: '/admin/reports' },
] satisfies Array<{ active?: boolean; icon: IconName; label: string; path: string }>

const stats = [
  { icon: 'users', label: 'Tài khoản hoạt động', note: '+8 trong tháng', value: '128' },
  { icon: 'team', label: 'Nhân sự xưởng', note: '24 đang trực', value: '42' },
  { icon: 'wrench', label: 'Gói dịch vụ', note: '6 cần rà soát giá', value: '36' },
  { icon: 'sliders', label: 'Mã phụ tùng', note: '12 dưới tồn tối thiểu', value: '512' },
] satisfies Array<{ icon: IconName; label: string; note: string; value: string }>

const auditRows = [
  { actor: 'Admin hệ thống', action: 'Cập nhật quyền Service Advisor', time: '09:15 hôm nay' },
  { actor: 'Quản lý kho', action: 'Điều chỉnh tồn má phanh Racing Series', time: '10:40 hôm nay' },
  { actor: 'Kế toán trưởng', action: 'Xuất báo cáo doanh thu tuần', time: '13:05 hôm nay' },
]

function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e4e2e2] bg-white/90 backdrop-blur-xl">
      <div className="flex h-20 w-full items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link className="text-2xl font-black tracking-tight text-[#ba0013]" to="/admin/dashboard">
            Kapa Admin
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link className="border-b-2 border-[#ba0013] pb-1 font-bold text-[#ba0013]" to="/admin/dashboard">
              Tổng quan
            </Link>
            <Link className="font-semibold text-[#5f5e5e] transition hover:text-[#ba0013]" to="/admin/users">
              Người dùng
            </Link>
            <Link className="font-semibold text-[#5f5e5e] transition hover:text-[#ba0013]" to="/admin/reports">
              Báo cáo
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-5">
          <button aria-label="Thông báo" className="text-[#5f5e5e] transition hover:text-[#ba0013]" type="button">
            <Icon name="bell" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center bg-[#1b1c1c] text-sm font-black text-white">AD</div>
        </div>
      </div>
    </header>
  )
}

function SideNav() {
  return (
    <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] w-64 shrink-0 border-r border-[#e4e2e2] bg-white py-6 lg:flex lg:flex-col">
      <div className="mb-6 px-4">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#5f5e5e]">Admin Console</p>
        <h2 className="mt-2 text-sm font-black text-[#ba0013]">Quản trị hệ thống</h2>
        <p className="text-xs text-[#5f5e5e]">Không trộn màn Service Advisor</p>
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
        <button className="flex items-center gap-3 py-2 text-sm font-semibold text-[#5f5e5e] hover:text-[#ba0013]" type="button">
          <Icon name="logout" />
          Đăng xuất
        </button>
      </div>
    </aside>
  )
}

function StatCard({ stat }: { stat: (typeof stats)[number] }) {
  return (
    <article className="border-t-4 border-[#ba0013] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
      <div className="mb-5 flex items-start justify-between">
        <span className="bg-[#ffdad6] p-3 text-[#ba0013]">
          <Icon name={stat.icon} />
        </span>
      </div>
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#5f5e5e]">{stat.label}</p>
      <p className="mt-2 text-3xl font-black text-[#1b1c1c]">{stat.value}</p>
      <p className="mt-2 text-sm font-semibold text-[#ba0013]">{stat.note}</p>
    </article>
  )
}

export function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-[#fbf9f8] font-sans text-[#1b1c1c]">
      <TopNav />
      <div className="flex w-full gap-6 px-6 py-2">
        <SideNav />
        <main className="min-w-0 flex-1 py-6">
          <section className="relative mb-8 overflow-hidden border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
            <p className="mb-2 font-mono text-sm font-bold uppercase tracking-[0.12em] text-[#ba0013]">Admin Dashboard</p>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-[#1b1c1c] md:text-5xl">Quản trị hệ thống garage</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5f5e5e]">
              Màn hình riêng cho Admin: quản lý người dùng, phân quyền, cấu hình dịch vụ, phụ tùng và báo cáo hệ thống.
            </p>
          </section>

          <section className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} stat={stat} />
            ))}
          </section>

          <div className="grid items-start gap-8 xl:grid-cols-[1fr_360px]">
            <section className="bg-white shadow-sm">
              <div className="border-b border-[#e4e2e2] px-6 py-5">
                <h2 className="text-xl font-black text-[#1b1c1c]">Nhật ký quản trị</h2>
              </div>
              <div className="divide-y divide-[#efeded]">
                {auditRows.map((row) => (
                  <div className="grid gap-2 px-6 py-5 md:grid-cols-[180px_1fr_auto]" key={`${row.actor}-${row.time}`}>
                    <p className="font-black text-[#1b1c1c]">{row.actor}</p>
                    <p className="text-sm font-semibold text-[#5f5e5e]">{row.action}</p>
                    <p className="font-mono text-xs font-bold uppercase text-[#ba0013]">{row.time}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-[#1b1c1c] p-6 text-white">
              <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-[#ffb4ab]">Lối tắt admin</p>
              <div className="mt-5 space-y-3">
                <Link className="flex min-h-12 items-center justify-between bg-white px-4 text-sm font-black text-[#1b1c1c]" to="/admin/users">
                  Quản lý người dùng <Icon name="chevron-right" />
                </Link>
                <Link className="flex min-h-12 items-center justify-between bg-white/10 px-4 text-sm font-black text-white" to="/admin/roles">
                  Phân quyền <Icon name="chevron-right" />
                </Link>
                <Link className="flex min-h-12 items-center justify-between bg-white/10 px-4 text-sm font-black text-white" to="/admin/reports">
                  Báo cáo hệ thống <Icon name="chevron-right" />
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
