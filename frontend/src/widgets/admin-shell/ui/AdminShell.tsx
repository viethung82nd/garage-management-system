import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../../../shared/ui/base'

export type AdminNavKey = 'dashboard' | 'users' | 'roles' | 'services' | 'parts' | 'reports'

const navItems = [
  { key: 'dashboard', icon: 'grid', label: 'Tổng quan', to: '/admin/dashboard' },
  { key: 'users', icon: 'users', label: 'Người dùng', to: '/admin/users' },
  { key: 'roles', icon: 'gear', label: 'Phân quyền', to: '/admin/roles' },
  { key: 'services', icon: 'wrench', label: 'Dịch vụ', to: '/admin/services' },
  { key: 'parts', icon: 'sliders', label: 'Phụ tùng', to: '/admin/parts' },
  { key: 'reports', icon: 'invoice', label: 'Báo cáo hệ thống', to: '/admin/reports' },
] satisfies Array<{ key: AdminNavKey; icon: IconName; label: string; to: string }>

export function AdminShell({
  active,
  children,
  eyebrow = 'Admin Console',
  title,
}: {
  active: AdminNavKey
  children: ReactNode
  eyebrow?: string
  title: string
}) {
  return (
    <div className="min-h-screen bg-[#fbf9f8] text-[#1b1c1c]">
      <aside className="hidden min-h-screen w-64 border-r border-[#efeded] bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 border-b border-[#efeded] px-7">
          <div className="flex h-11 w-11 items-center justify-center bg-[#ba0013] text-white">
            <Icon name="gear" />
          </div>
          <div>
            <p className="text-lg font-black leading-none text-[#171717]">Kapa Admin</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-[#8a8686]">Admin Console</p>
          </div>
        </div>

        <div className="border-b border-[#efeded] px-7 py-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a8686]">Quản trị hệ thống</p>
          <p className="mt-2 text-sm font-black text-[#1b1c1c]">Admin: Hệ thống</p>
          <p className="mt-1 text-xs text-[#6a6767]">Toàn quyền truy cập</p>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          {navItems.map((item) => (
            <Link
              className={
                item.key === active
                  ? 'flex min-h-12 items-center gap-3 border-l-4 border-[#ba0013] bg-[#fff1f1] px-4 text-sm font-black text-[#ba0013]'
                  : 'flex min-h-12 items-center gap-3 px-4 text-sm font-bold text-[#555151] transition hover:bg-[#fbf9f8] hover:text-[#ba0013]'
              }
              key={item.key}
              to={item.to}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="space-y-3 border-t border-[#efeded] p-5">
          <button className="flex min-h-11 w-full items-center gap-3 px-2 text-sm font-bold text-[#555151] hover:text-[#ba0013]" type="button">
            <Icon name="logout" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-[#efeded] bg-white/90 backdrop-blur-xl">
          <div className="flex min-h-20 items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-[#ba0013]">{eyebrow}</p>
              <h1 className="text-2xl font-black text-[#171717] sm:text-3xl">{title}</h1>
            </div>
            <div className="hidden items-center gap-4 sm:flex">
              <button
                aria-label="Thông báo"
                className="relative flex h-11 w-11 items-center justify-center border border-[#dedada] text-[#1b1c1c] transition hover:border-[#ba0013] hover:text-[#ba0013]"
                type="button"
              >
                <Icon name="bell" />
              </button>
              <div className="flex h-11 w-11 items-center justify-center bg-[#1b1c1c] text-sm font-black text-white">AD</div>
            </div>
          </div>
        </header>

        <main className="w-full px-5 py-7 sm:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  )
}
