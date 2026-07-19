import { Card } from 'antd'
import type { ReactNode } from 'react'
import type { BackOfficePalette } from '../model/palettes'
import { useCountUp } from '../lib/useCountUp'

/**
 * Small metric tile used across every back-office role (admin, accountant,
 * service advisor). Was previously copy-pasted with minor variations into
 * ~7 separate SA page files under different names (StatCard/SummaryCard) —
 * one shared version here instead.
 */
export type StatCardTone = 'red' | 'blue' | 'amber' | 'emerald' | 'violet'

function toneAccent(palette: BackOfficePalette, tone: StatCardTone) {
  switch (tone) {
    case 'blue':
      return palette.navy
    case 'amber':
      return palette.amber
    case 'emerald':
      return palette.green
    case 'violet':
      return palette.violet || '#7c3aed'
    case 'red':
    default:
      return palette.red
  }
}

export function StatCard({
  label,
  value,
  note,
  icon,
  palette,
  tone = 'red',
  enterDelay,
}: {
  label: string
  value: string | number
  note?: string
  icon?: ReactNode
  palette: BackOfficePalette
  /** Single accent color applied to both the value and the bare icon. Defaults to the brand red. */
  tone?: StatCardTone
  /** Stagger index (0-4) for the entrance animation when several cards mount together. */
  enterDelay?: number
}) {
  const displayValue = useCountUp(value)
  const accent = toneAccent(palette, tone)

  return (
    <Card
      bordered={false}
      className={`bo-card-hover bo-enter${enterDelay ? ` bo-enter-${Math.min(enterDelay, 5)}` : ''} rounded-2xl`}
      styles={{ body: { padding: 20 } }}
      style={{ background: palette.panel, boxShadow: palette.shadow, border: `1px solid ${palette.border}` }}
    >
      <div style={{ alignItems: 'center', display: 'flex', gap: 12, justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: accent,
              fontSize: 28,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {displayValue}
          </div>
          <div style={{ color: palette.textMuted, fontSize: 13, fontWeight: 500, marginTop: 8 }}>{label}</div>
          {note ? <div style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>{note}</div> : null}
        </div>
        {icon ? (
          <span style={{ color: accent, flexShrink: 0, fontSize: 38, lineHeight: 1 }}>{icon}</span>
        ) : null}
      </div>
    </Card>
  )
}
