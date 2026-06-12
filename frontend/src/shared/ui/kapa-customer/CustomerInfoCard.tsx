import type { ReactNode } from 'react'
import { CustomerPanel } from './CustomerPanel'

export function CustomerInfoCard({
  eyebrow,
  title,
  children,
  className = '',
}: {
  eyebrow?: string
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <CustomerPanel className={`customer-info-card ${className}`.trim()}>
      <div className="customer-info-card__header">
        {eyebrow ? <span className="customer-info-card__eyebrow">{eyebrow}</span> : null}
        <h3>{title}</h3>
      </div>
      {children}
    </CustomerPanel>
  )
}
