import { Card } from 'antd'
import type { ReactNode } from 'react'
import type { BackOfficePalette } from '../model/palettes'

/**
 * Small metric tile used across every back-office role (admin, accountant,
 * service advisor). Was previously copy-pasted with minor variations into
 * ~7 separate SA page files under different names (StatCard/SummaryCard) —
 * one shared version here instead.
 */
export function StatCard({
  label,
  value,
  note,
  icon,
  palette,
}: {
  label: string
  value: string | number
  note?: string
  icon?: ReactNode
  palette: BackOfficePalette
}) {
  return (
    <Card
      bordered={false}
      className="rounded-[28px]"
      styles={{ body: { padding: 20 } }}
      style={{ background: palette.panel, boxShadow: palette.shadow }}
    >
      <div style={{ alignItems: 'flex-start', display: 'flex', gap: 16, justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: palette.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            {label}
          </div>
          <div style={{ color: palette.ink, fontSize: 30, fontWeight: 700, marginTop: 8 }}>{value}</div>
          {note ? (
            <div style={{ color: palette.red, fontSize: 13, fontWeight: 600, marginTop: 6 }}>{note}</div>
          ) : null}
        </div>
        {icon ? (
          <span
            style={{
              alignItems: 'center',
              background: palette.panelAlt,
              borderRadius: 999,
              color: palette.red,
              display: 'flex',
              flexShrink: 0,
              fontSize: 18,
              height: 44,
              justifyContent: 'center',
              width: 44,
            }}
          >
            {icon}
          </span>
        ) : null}
      </div>
    </Card>
  )
}
