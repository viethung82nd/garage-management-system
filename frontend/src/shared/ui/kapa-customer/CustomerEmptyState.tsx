import type { ReactNode } from 'react'
import { CustomerInfoCard } from './CustomerInfoCard'

export function CustomerEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <CustomerInfoCard eyebrow="No Match Yet" title={title} className="customer-empty-state">
      <p>{description}</p>
      {action ? <div className="customer-empty-state__action">{action}</div> : null}
    </CustomerInfoCard>
  )
}
