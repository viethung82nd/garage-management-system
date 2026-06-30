type StatusTone = 'completed' | 'in-progress' | 'pending' | 'ready'

export function CustomerStatusBadge({
  tone,
  children,
}: {
  tone: StatusTone
  children: string
}) {
  return <span className={`customer-status-badge customer-status-badge--${tone}`}>{children}</span>
}
