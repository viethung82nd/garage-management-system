import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Button, Icon, IconButton } from '../components/base'
import { sidebarItems, topNavItems } from '../design/tokens'

function topNavPath(label: string) {
  return label === 'Dashboard' ? '/' : `/${label.toLowerCase()}`
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-on-surface)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/10 bg-[rgba(11,15,16,0.84)] px-6 py-8 backdrop-blur-xl lg:flex lg:flex-col">
        <Link className="flex items-center gap-3" to="/">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#00ffa3] text-[#003920] shadow-[0_0_28px_rgba(0,255,163,0.28)]">
            <Icon name="wrench" />
          </span>
          <span>
            <span className="block text-base font-black text-[#00ffa3]">Service Hub</span>
            <span className="text-sm text-[var(--color-on-surface-variant)]">Main Workshop</span>
          </span>
        </Link>

        <nav className="mt-12 space-y-3">
          {sidebarItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                [
                  'flex min-h-12 items-center gap-4 rounded-full px-4 text-sm font-bold transition',
                  isActive
                    ? 'bg-[#00ffa3] text-[#003920] shadow-[0_0_24px_rgba(0,255,163,0.22)]'
                    : 'text-[var(--color-on-surface-variant)] hover:bg-white/[0.05] hover:text-white',
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

        <div className="mt-auto space-y-5">
          <Button className="w-full" type="button">
            New Repair
          </Button>
          <div className="space-y-2 border-t border-white/10 pt-5">
            <button className="flex min-h-10 w-full items-center gap-4 rounded-full px-4 text-sm font-bold text-[var(--color-on-surface-variant)] transition hover:bg-white/[0.05] hover:text-white">
              <Icon name="check" />
              Help
            </button>
            <button className="flex min-h-10 w-full items-center gap-4 rounded-full px-4 text-sm font-bold text-[var(--color-on-surface-variant)] transition hover:bg-white/[0.05] hover:text-white">
              <Icon name="alert" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[rgba(11,15,16,0.78)] backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[var(--container-max)] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <Link className="font-black text-white lg:hidden" to="/">
                Garage Master
              </Link>
              <Link className="hidden font-black text-white lg:block" to="/">
                Garage Master
              </Link>
              <nav className="hidden items-center gap-6 text-sm font-bold md:flex">
                {topNavItems.map((item) => (
                  <NavLink
                    className={({ isActive }) =>
                      [
                        'border-b-2 py-5 transition',
                        isActive
                          ? 'border-white text-white'
                          : 'border-transparent text-[var(--color-on-surface-variant)] hover:text-white',
                      ].join(' ')
                    }
                    key={item}
                    to={topNavPath(item)}
                  >
                    {item}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <IconButton icon="bell" label="Notifications" />
              <IconButton icon="gear" label="Settings" />
              <div className="h-10 w-10 rounded-full border border-white/10 bg-[radial-gradient(circle_at_35%_25%,#849588,#101415_62%)] shadow-inner" />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[var(--container-max)] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">{children}</main>
      </div>

      <button
        aria-label="Create new repair"
        className="fixed bottom-7 right-7 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#00ffa3] text-[#003920] shadow-[0_0_28px_rgba(0,255,163,0.35)] transition hover:bg-[#52ffac] focus:outline-none focus:ring-2 focus:ring-[#00ffa3]/70 focus:ring-offset-2 focus:ring-offset-[#101415]"
        type="button"
      >
        <Icon name="plus" />
      </button>
    </div>
  )
}
