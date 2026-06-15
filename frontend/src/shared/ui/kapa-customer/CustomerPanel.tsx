import type { CSSProperties, ReactNode } from 'react'

export function CustomerPanel({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={`customer-panel ${className}`.trim()} style={style}>
      {children}
    </div>
  )
}
