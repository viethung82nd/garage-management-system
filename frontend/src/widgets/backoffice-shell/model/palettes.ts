export type BackOfficePalette = {
  ink: string
  inkSoft: string
  textMuted: string
  canvas: string
  panel: string
  panelAlt: string
  border: string
  red: string
  redDeep: string
  amber: string
  teal: string
  navy: string
  green: string
  shadow: string
  violet?: string
} 

export const adminPalette: BackOfficePalette = {
  ink: '#0f172a',
  inkSoft: '#334155',
  textMuted: '#64748b',
  canvas: '#f5f6f8',
  panel: '#ffffff',
  panelAlt: '#f1f3f6',
  border: '#e2e8f0',
  red: '#f51304',
  redDeep: '#c81003',
  amber: '#d97706',
  teal: '#0f766e',
  navy: '#1e3a5f',
  green: '#16a34a',
  shadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 28px rgba(15, 23, 42, 0.07)',
}

// Cool-neutral palette (matches admin/advisor exactly) so the sidebar's dark
// navy gradient and the light content area read as one cohesive system,
// with the "Invoice & Billing Tool" authoritative navy/green finance accents.
export const accountantPalette: BackOfficePalette = {
  ink: '#0f172a',
  inkSoft: '#334155',
  textMuted: '#64748b',
  canvas: '#f5f6f8',
  panel: '#ffffff',
  panelAlt: '#f1f3f6',
  border: '#e2e8f0',
  red: '#f51304',
  redDeep: '#c81003',
  amber: '#d97706',
  teal: '#197b74',
  navy: '#1e3a5f',
  green: '#059669',
  violet: '#8a3ffc',
  shadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 28px rgba(15, 23, 42, 0.07)',
}

export const advisorPalette: BackOfficePalette = {
  ink: '#0f172a',
  inkSoft: '#334155',
  textMuted: '#64748b',
  canvas: '#f5f6f8',
  panel: '#ffffff',
  panelAlt: '#f1f3f6',
  border: '#e2e8f0',
  red: '#f51304',
  redDeep: '#c81003',
  amber: '#d97706',
  teal: '#0f766e',
  navy: '#1e3a5f',
  green: '#16a34a',
  shadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 28px rgba(15, 23, 42, 0.07)',
}

export const technicianPalette: BackOfficePalette = {
  ink: '#0f0e0e',
  inkSoft: '#2a2727',
  textMuted: '#6b6262',
  canvas: '#f7f2ec',
  panel: '#fffdfa',
  panelAlt: '#f4eee8',
  border: 'rgba(15, 14, 14, 0.08)',
  red: '#f51304',
  redDeep: '#cf1a10',
  amber: '#ffb347',
  teal: '#197b74',
  navy: '#1f365c',
  green: '#2f8f63',
  shadow: '0 24px 70px rgba(15, 14, 14, 0.08)',
}
