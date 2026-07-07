import type { ReactNode } from 'react'
import { Icon, type IconName } from '../../../shared/ui/base'

export type ServiceTask = {
  id: string
  estimate: string
  name: string
  parts: string
  selected: boolean
}

export type Technician = {
  id: string
  activeOrders: number
  name: string
  skill: string
  status: 'available' | 'busy' | 'offline'
}

export function SectionCard({
  accent,
  children,
  icon,
  title,
}: {
  accent?: boolean
  children: ReactNode
  icon: IconName
  title: string
}) {
  return (
    <section className={`bg-white shadow-[0_10px_30px_rgba(27,28,28,0.05)] ${accent ? 'border-l-8 border-[#ba0013]' : 'border border-[#efeded]'}`}>
      <div className="flex items-center gap-3 border-b border-[#efeded] px-6 py-5">
        <span className="flex h-10 w-10 items-center justify-center bg-[#fff1f1] text-[#ba0013]">
          <Icon name={icon} />
        </span>
        <h2 className="text-lg font-black text-[#171717]">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  )
}

export function Field({
  label,
  placeholder,
  type = 'text',
  value,
}: {
  label: string
  placeholder?: string
  type?: string
  value?: string
}) {
  return (
    <label className="space-y-2">
      <span className="block font-mono text-[11px] font-black uppercase tracking-[0.14em] text-[#6a6767]">{label}</span>
      <input
        className="h-12 w-full border border-[#d8d5d5] bg-[#fbf9f8] px-4 text-sm font-bold text-[#1b1c1c] outline-none transition placeholder:text-[#9b9696] focus:border-[#ba0013] focus:bg-white focus:ring-4 focus:ring-[#ba0013]/10"
        defaultValue={value}
        placeholder={placeholder}
        type={type}
      />
    </label>
  )
}

export function CustomerVehiclePanel() {
  return (
    <SectionCard accent icon="car" title="Thông tin khách hàng & xe">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Khách hàng" value="Alex Nguyễn" />
        <Field label="Số điện thoại" value="090 123 4567" />
        <Field label="Xe" value="BMW M4 Competition" />
        <Field label="Biển số" value="51K-882.88" />
        <Field label="VIN" value="WBS33AZ08PCM44882" />
        <Field label="Số km" value="18,240 km" />
        <Field label="Ngày hẹn trả" type="date" />
        <Field label="Ưu tiên" value="Cao" />
      </div>
    </SectionCard>
  )
}

export function ServiceTaskBuilder({
  onToggleTask,
  tasks,
}: {
  onToggleTask: (id: string) => void
  tasks: ServiceTask[]
}) {
  return (
    <SectionCard icon="clipboard" title="Hạng mục dịch vụ">
      <div className="space-y-3">
        {tasks.map((task) => (
          <button
            className={
              task.selected
                ? 'grid w-full gap-4 border-l-4 border-[#ba0013] bg-[#fffafa] p-4 text-left sm:grid-cols-[1fr_auto] sm:items-center'
                : 'grid w-full gap-4 border border-[#efeded] bg-[#fbf9f8] p-4 text-left transition hover:border-[#ba0013] sm:grid-cols-[1fr_auto] sm:items-center'
            }
            key={task.id}
            onClick={() => onToggleTask(task.id)}
            type="button"
          >
            <span>
              <span className="flex items-center gap-3">
                <span
                  className={
                    task.selected
                      ? 'flex h-7 w-7 items-center justify-center bg-[#ba0013] text-white'
                      : 'flex h-7 w-7 items-center justify-center border border-[#b8b4b4] text-transparent'
                  }
                >
                  <Icon className="h-4 w-4" name="check" />
                </span>
                <span className="font-black text-[#171717]">{task.name}</span>
              </span>
              <span className="mt-2 block text-sm font-semibold text-[#6a6767]">Phụ tùng: {task.parts}</span>
            </span>
            <span className="font-mono text-xs font-black uppercase tracking-[0.12em] text-[#ba0013]">{task.estimate}</span>
          </button>
        ))}
      </div>
    </SectionCard>
  )
}

export function TechnicianAssignmentPanel({
  onSelectTechnician,
  selectedTechnicianId,
  technicians,
}: {
  onSelectTechnician: (id: string) => void
  selectedTechnicianId: string
  technicians: Technician[]
}) {
  return (
    <SectionCard icon="team" title="Phân công kỹ thuật viên">
      <div className="space-y-3">
        {technicians.map((tech) => {
          const selected = tech.id === selectedTechnicianId
          const disabled = tech.status === 'offline'

          return (
            <button
              className={
                selected
                  ? 'w-full border-l-4 border-[#ba0013] bg-[#fffafa] p-4 text-left'
                  : 'w-full border border-[#efeded] bg-[#fbf9f8] p-4 text-left transition hover:border-[#ba0013] disabled:cursor-not-allowed disabled:opacity-45'
              }
              disabled={disabled}
              key={tech.id}
              onClick={() => onSelectTechnician(tech.id)}
              type="button"
            >
              <span className="flex items-start justify-between gap-4">
                <span>
                  <span className="block font-black text-[#171717]">{tech.name}</span>
                  <span className="mt-1 block text-sm font-semibold text-[#6a6767]">{tech.skill}</span>
                </span>
                <StatusPill status={tech.status} />
              </span>
              <span className="mt-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#6a6767]">
                <Icon className="h-4 w-4" name="clipboard" />
                {tech.activeOrders} lệnh đang xử lý
              </span>
            </button>
          )
        })}
      </div>
    </SectionCard>
  )
}

function StatusPill({ status }: { status: Technician['status'] }) {
  const label = {
    available: 'Sẵn sàng',
    busy: 'Bận',
    offline: 'Nghỉ ca',
  }[status]

  const classes = {
    available: 'bg-green-100 text-green-800',
    busy: 'bg-amber-100 text-amber-800',
    offline: 'bg-[#e4e2e2] text-[#6a6767]',
  }[status]

  return <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${classes}`}>{label}</span>
}

export function WorkOrderSummary({
  selectedTasks,
  selectedTechnician,
}: {
  selectedTasks: ServiceTask[]
  selectedTechnician?: Technician
}) {
  const totalMinutes = selectedTasks.reduce((sum, task) => sum + Number.parseInt(task.estimate, 10), 0)

  return (
    <aside className="sticky top-28 space-y-6">
      <section className="bg-[#1b1c1c] p-6 text-white shadow-[0_18px_45px_rgba(15,14,14,0.18)]">
        <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-[#ffb4ab]">Lệnh sửa chữa mới</p>
        <h2 className="mt-3 text-3xl font-black">RO-2026-0882</h2>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <SummaryMetric label="Hạng mục" value={String(selectedTasks.length).padStart(2, '0')} />
          <SummaryMetric label="Dự kiến" value={`${totalMinutes || 0} phút`} />
        </div>
        <div className="mt-6 border-t border-white/10 pt-6">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-white/55">Kỹ thuật viên phụ trách</p>
          <p className="mt-2 text-xl font-black">{selectedTechnician?.name ?? 'Chưa phân công'}</p>
          <p className="mt-1 text-sm text-white/60">{selectedTechnician?.skill ?? 'Chọn kỹ thuật viên phù hợp với hạng mục sửa chữa.'}</p>
        </div>
      </section>

      <section className="border border-[#efeded] bg-white p-6">
        <h3 className="text-lg font-black text-[#171717]">Ghi chú cố vấn</h3>
        <textarea
          className="mt-4 min-h-32 w-full border border-[#d8d5d5] bg-[#fbf9f8] p-4 text-sm text-[#1b1c1c] outline-none focus:border-[#ba0013] focus:ring-4 focus:ring-[#ba0013]/10"
          defaultValue="Khách báo xe rung nhẹ khi phanh ở tốc độ cao. Ưu tiên kiểm tra phanh, cân bằng bánh và chạy thử trước khi bàn giao."
        />
      </section>
    </aside>
  )
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 p-4">
      <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-white/55">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  )
}
