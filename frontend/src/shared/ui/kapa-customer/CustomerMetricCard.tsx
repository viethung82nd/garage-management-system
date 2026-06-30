import type { ReactNode } from 'react'

export function CustomerMetricCard({
  label,
  value,
  note,
  accent = false,
}: {
  label: string
  value: ReactNode
  note?: string
  accent?: boolean
}) {
  return (
    <div className={`customer-metric-card${accent ? ' customer-metric-card--accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <p>{note}</p> : null}
    </div>
  )
}
