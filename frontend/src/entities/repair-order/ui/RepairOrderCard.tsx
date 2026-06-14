import type { RepairOrder } from '../model/types'
import { RepairStatusBadge } from './RepairStatusBadge'

export function RepairOrderCard({ repairOrder }: { repairOrder: RepairOrder }) {
  return (
    <article className="rounded-[var(--radius-md)] border border-white/10 bg-[rgba(29,32,34,0.72)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-on-surface-variant)]">{repairOrder.id}</p>
          <h3 className="mt-2 text-2xl font-black leading-none text-white">{repairOrder.vehicleName}</h3>
          <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
            {repairOrder.customerName} - {repairOrder.licensePlate}
          </p>
        </div>
        <RepairStatusBadge status={repairOrder.status} />
      </div>
    </article>
  )
}
