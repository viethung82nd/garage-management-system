import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type IconName =
  | 'alert'
  | 'bell'
  | 'bolt'
  | 'calendar'
  | 'car'
  | 'cart'
  | 'cash'
  | 'chevron-left'
  | 'chevron-right'
  | 'check'
  | 'clipboard'
  | 'download'
  | 'gear'
  | 'grid'
  | 'help'
  | 'info'
  | 'invoice'
  | 'lift'
  | 'logout'
  | 'map'
  | 'person'
  | 'plus'
  | 'search'
  | 'sliders'
  | 'team'
  | 'users'
  | 'wrench'

type Tone = 'blue' | 'emerald' | 'neutral' | 'red'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const iconPaths: Record<IconName, ReactNode> = {
  alert: (
    <>
      <path d="M12 4.2 3.8 18h16.4L12 4.2Z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  bolt: (
    <>
      <path d="m13 2-7 12h5l-1 8 8-13h-5l0-7Z" />
    </>
  ),
  calendar: (
    <>
      <path d="M7 3v4" />
      <path d="M17 3v4" />
      <path d="M4 8h16" />
      <rect width="16" height="16" x="4" y="5" rx="3" />
    </>
  ),
  car: (
    <>
      <path d="m5 12 1.6-4.2A3 3 0 0 1 9.4 6h5.2a3 3 0 0 1 2.8 1.8L19 12" />
      <path d="M5 12h14v5H5z" />
      <path d="M7 17v2" />
      <path d="M17 17v2" />
      <path d="M8 14h.01" />
      <path d="M16 14h.01" />
    </>
  ),
  cart: (
    <>
      <path d="M4 5h2l2.2 9.2a2 2 0 0 0 2 1.5h5.6a2 2 0 0 0 1.9-1.4L20 8H7" />
      <path d="M10 20h.01" />
      <path d="M18 20h.01" />
    </>
  ),
  cash: (
    <>
      <rect width="16" height="10" x="4" y="7" rx="2" />
      <path d="M8 11h.01" />
      <path d="M16 13h.01" />
      <path d="M12 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
    </>
  ),
  'chevron-left': (
    <>
      <path d="m15 18-6-6 6-6" />
    </>
  ),
  'chevron-right': (
    <>
      <path d="m9 18 6-6-6-6" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </>
  ),
  clipboard: (
    <>
      <rect width="14" height="16" x="5" y="5" rx="2" />
      <path d="M9 5a3 3 0 0 1 6 0" />
      <path d="M9 11h6" />
      <path d="M9 15h4" />
    </>
  ),
  gear: (
    <>
      <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="m4.9 4.9 2.1 2.1" />
      <path d="m17 17 2.1 2.1" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="m4.9 19.1 2.1-2.1" />
      <path d="m17 7 2.1-2.1" />
    </>
  ),
  grid: (
    <>
      <rect width="7" height="7" x="3" y="3" rx="1.5" />
      <rect width="7" height="7" x="14" y="3" rx="1.5" />
      <rect width="7" height="7" x="3" y="14" rx="1.5" />
      <rect width="7" height="7" x="14" y="14" rx="1.5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9a2.4 2.4 0 1 1 3.9 1.9c-.9.6-1.7 1.2-1.7 2.6" />
      <path d="M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  invoice: (
    <>
      <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2Z" />
      <path d="M10 8h6" />
      <path d="M10 12h6" />
      <path d="M10 16h4" />
    </>
  ),
  lift: (
    <>
      <path d="M7 19V9" />
      <path d="M17 19V9" />
      <path d="M5 19h14" />
      <path d="M8 9h8" />
      <path d="M9 6h6l2 3H7l2-3Z" />
      <path d="M10 13h4" />
    </>
  ),
  map: (
    <>
      <path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" />
      <path d="M9 3v15" />
      <path d="M15 6v15" />
    </>
  ),
  logout: (
    <>
      <path d="M14 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3" />
      <path d="M9 12h11" />
      <path d="m17 9 3 3-3 3" />
    </>
  ),
  person: (
    <>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  sliders: (
    <>
      <path d="M5 4v16" />
      <path d="M12 4v16" />
      <path d="M19 4v16" />
      <path d="M3 8h4" />
      <path d="M10 14h4" />
      <path d="M17 10h4" />
    </>
  ),
  team: (
    <>
      <path d="M16 11a3 3 0 1 0-2.8-4" />
      <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M2.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M15 14.5a4.5 4.5 0 0 1 6.5 4" />
    </>
  ),
  users: (
    <>
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M17 11a3 3 0 1 0 0-6" />
      <path d="M3 21a6 6 0 0 1 12 0" />
      <path d="M17 14a5 5 0 0 1 4 5" />
    </>
  ),
  wrench: (
    <>
      <path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-2.8-2.8 2.2-2.6Z" />
    </>
  ),
}

const toneClasses: Record<Tone, string> = {
  blue: 'bg-[#3c4661]/50 text-[#d9e2ff]',
  emerald: 'bg-[#00ffa3]/10 text-[#00ffa3]',
  neutral: 'bg-white/5 text-[var(--color-on-surface-variant)]',
  red: 'bg-[#93000a]/35 text-[#ffb4ab]',
}

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cx('h-5 w-5 shrink-0', className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {iconPaths[name]}
    </svg>
  )
}

export function Button({
  children,
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
}) {
  return (
    <button
      className={cx(
        'inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-6 text-sm font-bold transition',
        'focus:outline-none focus:ring-2 focus:ring-[#00ffa3]/70 focus:ring-offset-2 focus:ring-offset-[#101415]',
        variant === 'primary' &&
          'bg-[#00ffa3] text-[#003920] shadow-[0_0_28px_rgba(0,255,163,0.22)] hover:bg-[#52ffac]',
        variant === 'secondary' &&
          'border border-white/15 bg-white/[0.03] text-white hover:border-[#00ffa3]/60 hover:bg-white/[0.06]',
        variant === 'ghost' && 'bg-[#272a2c]/80 text-white hover:bg-[#323537]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function IconButton({
  label,
  icon,
}: {
  label: string
  icon: IconName
}) {
  return (
    <button
      aria-label={label}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[var(--color-on-surface-variant)] transition hover:border-[#00ffa3]/50 hover:text-[#00ffa3] focus:outline-none focus:ring-2 focus:ring-[#00ffa3]/70"
      title={label}
      type="button"
    >
      <Icon name={icon} />
    </button>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cx(
        'rounded-[var(--radius-md)] border border-white/10 bg-[rgba(29,32,34,0.72)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function Badge({
  children,
  tone = 'emerald',
}: {
  children: ReactNode
  tone?: Tone
}) {
  return (
    <span className={cx('inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold', toneClasses[tone])}>
      {children}
    </span>
  )
}

export function StatCard({
  eyebrow,
  icon,
  label,
  tone,
  value,
}: {
  eyebrow: string
  icon: IconName
  label: string
  tone: Tone
  value: string
}) {
  return (
    <Card className="min-h-44 p-6">
      <div className="flex items-start justify-between gap-4">
        <span className={cx('inline-flex h-14 w-14 items-center justify-center rounded-full', toneClasses[tone])}>
          <Icon name={icon} />
        </span>
        <span className={cx('max-w-24 text-right text-sm font-bold leading-5', toneClasses[tone], 'bg-transparent p-0')}>
          {eyebrow}
        </span>
      </div>
      <p className="mt-5 text-xs font-bold uppercase text-[var(--color-on-surface-variant)]">{label}</p>
      <p className="mt-2 text-3xl font-black leading-tight text-white">{value}</p>
    </Card>
  )
}

export function SectionHeader({
  action,
  title,
}: {
  action?: ReactNode
  title: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-5">
      <h2 className="text-base font-bold text-white">{title}</h2>
      {action}
    </div>
  )
}
