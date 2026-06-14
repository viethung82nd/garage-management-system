import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../../shared/ui/base'
import { AdminShell } from '../../widgets/admin-shell'

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

export function AdminDashboardPage() {
  return (
    <AdminShell active="dashboard" title="Tổng quan Admin">
      <div className="space-y-7">
        <section className="relative overflow-hidden border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
          <div className="absolute right-8 top-8 hidden text-[#ba0013]/10 lg:block">
            <Icon className="h-32 w-32" name="gear" />
          </div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#ba0013]">Admin Console</p>
          <h2 className="mt-3 text-4xl font-black leading-tight text-[#171717] md:text-5xl">Quản trị hệ thống garage</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#6a6767]">
            Màn hình riêng cho Admin: quản lý người dùng, phân quyền, cấu hình dịch vụ, phụ tùng và báo cáo hệ thống.
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
              <h3 className="text-lg font-black text-[#171717]">Nhật ký quản trị</h3>
            </div>
            <div className="divide-y divide-[#efeded]">
              {auditRows.map((row) => (
                <div className="grid gap-2 px-6 py-5 md:grid-cols-[180px_1fr_auto]" key={`${row.actor}-${row.time}`}>
                  <p className="font-black text-[#171717]">{row.actor}</p>
                  <p className="text-sm font-semibold text-[#6a6767]">{row.action}</p>
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
      </div>
    </AdminShell>
  )
}
