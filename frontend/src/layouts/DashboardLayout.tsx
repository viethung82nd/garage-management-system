import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Icon, IconButton } from '../components/base'
import { sidebarItems, topNavItems } from '../design/tokens'

export function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-on-surface)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] py-8 lg:flex lg:flex-col">
        <Link className="mb-10 flex items-center gap-3 px-6" to="/">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00ffa3] text-[#003920] shadow-[0_0_20px_rgba(0,255,163,0.3)]">
            <Icon name="wrench" />
          </span>
          <span>
            <span className="block text-base font-black text-[#00ffa3]">Trung tâm dịch vụ</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Xưởng chính
            </span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1 px-2">
          {sidebarItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                [
                  'flex min-h-12 items-center gap-4 rounded-full px-4 text-sm font-bold transition',
                  isActive
                    ? 'bg-[#00ffa3] text-[#003920] shadow-[0_0_24px_rgba(0,255,163,0.18)]'
                    : 'text-[var(--color-on-surface-variant)] hover:bg-white/[0.05] hover:text-[var(--color-on-surface)]',
                ].join(' ')
              }
              key={item.path}
              to={item.path}
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-1 border-t border-white/5 px-2 pt-4">
          <Link
            className="mx-2 mb-3 inline-flex min-h-12 w-[calc(100%-1rem)] items-center justify-center gap-3 rounded-full bg-[#00ffa3] px-6 text-sm font-bold text-[#003920] shadow-[0_0_28px_rgba(0,255,163,0.22)] transition hover:bg-[#52ffac]"
            to="/advisor/reception"
          >
            Tiếp nhận xe
          </Link>
          <button className="flex min-h-12 w-full items-center gap-4 rounded-full px-4 text-sm font-bold text-[var(--color-on-surface-variant)] transition hover:bg-white/[0.05] hover:text-[var(--color-on-surface)]">
            <Icon name="help" />
            Trợ giúp
          </button>
          <button className="flex min-h-12 w-full items-center gap-4 rounded-full px-4 text-sm font-bold text-[var(--color-on-surface-variant)] transition hover:bg-white/[0.05] hover:text-[var(--color-on-surface)]">
            <Icon name="logout" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[rgba(16,20,21,0.82)] backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-12">
            <div className="flex min-w-0 items-center gap-8">
              <Link className="sr-only" to="/">
                Trang tiếp nhận xe
              </Link>
              <nav className="hidden items-center gap-6 text-sm font-bold md:flex">
                {topNavItems.map((item) => (
                  <NavLink
                    className={() =>
                      [
                        'transition',
                        location.pathname.startsWith(item.path.split('/').slice(0, 2).join('/'))
                          ? 'text-white'
                          : 'text-[var(--color-on-surface-variant)] hover:text-[#00ffa3]',
                      ].join(' ')
                    }
                    key={item.path}
                    to={item.path}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <IconButton icon="bell" label="Thông báo" />
              <IconButton icon="gear" label="Cài đặt" />
              <div className="h-9 w-9 rounded-full border border-white/10 bg-[radial-gradient(circle_at_35%_25%,#849588,#101415_62%)] shadow-inner" />
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>

      <div className="pointer-events-none fixed right-0 top-0 -z-10 h-[500px] w-[500px] bg-[#00e290]/5 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-0 left-0 -z-10 h-[400px] w-[400px] bg-[#3c4661]/10 blur-[100px]" />
    </div>
  )
}
