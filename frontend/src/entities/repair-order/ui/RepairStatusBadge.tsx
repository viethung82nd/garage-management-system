import type { RepairStatus } from '../model/types'

const statusCopy: Record<RepairStatus, string> = {
  cancelled: 'Hủy',
  completed: 'Hoàn thành',
  'in-progress': 'Đang làm',
  waiting: 'Chờ',
}

const statusClassName: Record<RepairStatus, string> = {
  cancelled: 'bg-red-50 text-red-700 ring-red-100',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  'in-progress': 'bg-amber-50 text-amber-700 ring-amber-100',
  waiting: 'bg-slate-100 text-slate-700 ring-slate-200',
}

export function RepairStatusBadge({ status }: { status: RepairStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClassName[status]}`}>
      {statusCopy[status]}
    </span>
  )
}
