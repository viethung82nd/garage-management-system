import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons'
import type { ReactNode } from 'react'

const TONE_STYLES = {
  error: { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', icon: <CloseCircleFilled /> },
  success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', icon: <CheckCircleFilled /> },
} as const

/**
 * Shared error/success banner for back-office pages — replaces the inline
 * red/green box markup that used to be copy-pasted per page.
 */
export function InlineBanner({ tone, children }: { tone: keyof typeof TONE_STYLES; children: ReactNode }) {
  const style = TONE_STYLES[tone]

  return (
    <div
      className="bo-fade mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium"
      style={{ background: style.bg, borderColor: style.border, color: style.color }}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span className="mt-0.5 shrink-0">{style.icon}</span>
      <span>{children}</span>
    </div>
  )
}
