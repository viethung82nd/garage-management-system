import { useState } from 'react'
import { useAuth } from '../../shared/auth'
import { TechnicianShell } from '../../widgets/technician-shell'
import { Icon, type IconName } from '../../shared/ui/base'

type WorkOrderStatus = 'assigned' | 'in-progress' | 'paused' | 'completed'
type Priority = 'high' | 'medium' | 'low'

type WorkOrder = {
  id: string
  bay: string
  customer: string
  duration: number
  note: string
  plate: string
  priority: Priority
  service: string
  start: string
  status: WorkOrderStatus
  vehicle: string
}

const initialOrders: WorkOrder[] = [
  {
    bay: 'Cầu nâng 01',
    customer: 'Alex Nguyễn',
    duration: 90,
    id: 'RO-2026-0882',
    note: 'Khách báo rung vô lăng khi phanh tốc độ cao. Cần chụp ảnh má phanh trước khi tháo.',
    plate: '51K-882.88',
    priority: 'high',
    service: 'Kiểm tra phanh & rung vô lăng',
    start: '09:00',
    status: 'in-progress',
    vehicle: 'BMW M4 Competition',
  },
  {
    bay: 'Cầu nâng 01',
    customer: 'Sarah Trần',
    duration: 75,
    id: 'RO-2026-0885',
    note: 'Đã có phụ tùng trong kho. Kiểm tra lại tình trạng đĩa phanh trước khi xác nhận thay.',
    plate: '30F-686.01',
    priority: 'medium',
    service: 'Phục hồi hệ thống phanh',
    start: '10:45',
    status: 'assigned',
    vehicle: 'Audi RS6 Avant',
  },
  {
    bay: 'Khu nhanh',
    customer: 'David Lê',
    duration: 45,
    id: 'RO-2026-0889',
    note: 'Khách chờ tại lounge, ưu tiên hoàn thành trong ngày.',
    plate: '29A-404.95',
    priority: 'medium',
    service: 'Thay dầu & lọc dầu',
    start: '13:30',
    status: 'assigned',
    vehicle: 'Toyota GR Supra',
  },
  {
    bay: 'Cầu nâng 02',
    customer: 'Phạm Hoàng',
    duration: 60,
    id: 'RO-2026-0891',
    note: 'Kiểm tra tiếng kêu gầm bên phải khi qua gờ giảm tốc.',
    plate: '51H-888.20',
    priority: 'low',
    service: 'Chẩn đoán tiếng kêu gầm',
    start: '15:00',
    status: 'assigned',
    vehicle: 'VinFast Lux A2.0',
  },
]

const timeBlocks = ['08:00', '09:00', '10:45', '13:30', '15:00', '16:30']

const statusLabels: Record<WorkOrderStatus, string> = {
  assigned: 'Được giao',
  completed: 'Hoàn thành',
  'in-progress': 'Đang làm',
  paused: 'Tạm dừng',
}

function statusClass(status: WorkOrderStatus) {
  return {
    assigned: 'border-[#d8d5d5] bg-[#fbf9f8] text-[#6a6767]',
    completed: 'border-green-200 bg-green-50 text-green-700',
    'in-progress': 'border-[#ba0013] bg-[#fff1f1] text-[#ba0013]',
    paused: 'border-amber-200 bg-amber-50 text-amber-700',
  }[status]
}

function priorityClass(priority: Priority) {
  return {
    high: 'bg-[#ba0013] text-white',
    low: 'bg-[#e4e2e2] text-[#1b1c1c]',
    medium: 'bg-amber-100 text-amber-800',
  }[priority]
}

function priorityLabel(priority: Priority) {
  return {
    high: 'Gấp',
    low: 'Thường',
    medium: 'Nên làm',
  }[priority]
}

function SummaryCard({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <section className="border border-[#efeded] bg-white p-6 shadow-[0_18px_40px_rgba(27,28,28,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.14em] text-[#6a6767]">{label}</p>
          <p className="mt-3 text-3xl font-black text-[#171717]">{value}</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center bg-[#fff1f1] text-[#ba0013]">
          <Icon name={icon} />
        </span>
      </div>
    </section>
  )
}

function WorkOrderCard({
  active,
  onSelect,
  order,
}: {
  active: boolean
  onSelect: () => void
  order: WorkOrder
}) {
  return (
    <button
      className={active ? 'w-full border-l-4 border-[#ba0013] bg-[#fffafa] p-5 text-left shadow-[0_10px_30px_rgba(27,28,28,0.05)]' : 'w-full border border-[#efeded] bg-white p-5 text-left transition hover:border-[#ba0013] hover:bg-[#fffafa]'}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${priorityClass(order.priority)}`}>{priorityLabel(order.priority)}</span>
            <span className={`border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass(order.status)}`}>{statusLabels[order.status]}</span>
          </div>
          <h3 className="mt-3 text-lg font-black text-[#171717]">{order.vehicle}</h3>
          <p className="mt-1 font-mono text-xs font-bold text-[#ba0013]">{order.id} - {order.plate}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#6a6767]">Bắt đầu</p>
          <p className="mt-2 text-xl font-black text-[#171717]">{order.start}</p>
        </div>
      </div>
      <p className="mt-4 text-sm font-semibold text-[#1b1c1c]">{order.service}</p>
      <p className="mt-2 text-sm leading-6 text-[#6a6767]">{order.note}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="bg-[#fbf9f8] p-3">
          <p className="font-mono text-[10px] font-black uppercase text-[#6a6767]">Khách hàng</p>
          <p className="mt-1 text-sm font-black text-[#171717]">{order.customer}</p>
        </div>
        <div className="bg-[#fbf9f8] p-3">
          <p className="font-mono text-[10px] font-black uppercase text-[#6a6767]">Thời lượng</p>
          <p className="mt-1 text-sm font-black text-[#171717]">{order.duration} phút</p>
        </div>
        <div className="bg-[#fbf9f8] p-3">
          <p className="font-mono text-[10px] font-black uppercase text-[#6a6767]">Vị trí</p>
          <p className="mt-1 text-sm font-black text-[#171717]">{order.bay}</p>
        </div>
      </div>
    </button>
  )
}

function Timeline({ orders }: { orders: WorkOrder[] }) {
  return (
    <section className="border border-[#efeded] bg-white shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
      <div className="border-b border-[#efeded] px-6 py-5">
        <h2 className="text-lg font-black text-[#171717]">Lịch làm việc cá nhân hôm nay</h2>
        <p className="mt-1 text-sm font-semibold text-[#6a6767]">Theo dõi thứ tự lệnh được phân công trong ca.</p>
      </div>
      <div className="divide-y divide-[#efeded]">
        {timeBlocks.map((slot) => {
          const order = orders.find((item) => item.start === slot)

          return (
            <div className="grid gap-4 p-5 sm:grid-cols-[90px_1fr]" key={slot}>
              <div className="font-mono text-sm font-black text-[#ba0013]">{slot}</div>
              {order ? (
                <div className={order.status === 'in-progress' ? 'border-l-4 border-[#ba0013] bg-[#fffafa] p-4' : 'border border-[#efeded] bg-[#fbf9f8] p-4'}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-black text-[#171717]">{order.service}</p>
                      <p className="mt-1 text-sm font-semibold text-[#6a6767]">{order.vehicle} - {order.plate}</p>
                    </div>
                    <span className={`w-fit border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass(order.status)}`}>{statusLabels[order.status]}</span>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-[#e4e2e2] bg-[#fbf9f8] p-4 text-sm font-bold text-[#8a8686]">Trống / chờ điều phối</div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function TechnicianWorkOrdersPage() {
  const { user } = useAuth()
  const technicianName = user?.fullName || user?.email || 'Kỹ thuật viên'
  const [orders, setOrders] = useState(initialOrders)
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrders[0].id)

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0]
  const totalMinutes = orders.reduce((sum, order) => sum + order.duration, 0)
  const completedCount = orders.filter((order) => order.status === 'completed').length
  const inProgressCount = orders.filter((order) => order.status === 'in-progress').length

  function updateSelectedStatus(status: WorkOrderStatus) {
    setOrders((current) => current.map((order) => (order.id === selectedOrder.id ? { ...order, status } : order)))
  }

  return (
    <TechnicianShell active="work-orders" eyebrow="Technician Workspace" notificationCount={4} title="Lịch cá nhân & lệnh được phân công">
      <div className="space-y-7">
        <section className="relative overflow-hidden border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
          <div className="grid gap-6 xl:grid-cols-[1fr_320px] xl:items-center">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#ba0013]">My Work Schedule</p>
              <h2 className="mt-3 text-4xl font-black leading-tight text-[#171717] md:text-5xl">Lịch cá nhân và lệnh sửa chữa được giao</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#6a6767]">
                Kỹ thuật viên xem toàn bộ lệnh trong ca, ghi nhận trạng thái đang làm và mở nhanh lệnh cần xử lý tiếp theo.
              </p>
            </div>
            <div className="border border-[#efeded] bg-[#fbf9f8] p-5">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Ca làm hôm nay</p>
              <p className="mt-2 text-3xl font-black text-[#ba0013]">08:00 - 17:30</p>
              <p className="mt-1 text-sm font-semibold text-[#6a6767]">Phụ trách: {technicianName}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <SummaryCard icon="clipboard" label="Lệnh được giao" value={String(orders.length).padStart(2, '0')} />
          <SummaryCard icon="bolt" label="Đang làm" value={String(inProgressCount).padStart(2, '0')} />
          <SummaryCard icon="check" label="Hoàn thành" value={String(completedCount).padStart(2, '0')} />
          <SummaryCard icon="calendar" label="Tổng thời lượng" value={`${Math.round(totalMinutes / 60)}h${totalMinutes % 60 ? ` ${totalMinutes % 60}m` : ''}`} />
        </section>

        <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-7">
            <Timeline orders={orders} />

            <section className="space-y-4">
              <div className="border border-[#efeded] bg-white p-5">
                <h3 className="text-xl font-black text-[#171717]">Danh sách lệnh được phân công</h3>
                <p className="mt-1 text-sm font-semibold text-[#6a6767]">Chọn một lệnh để xem chi tiết và cập nhật trạng thái.</p>
              </div>
              {orders.map((order) => (
                <WorkOrderCard active={order.id === selectedOrder.id} key={order.id} onSelect={() => setSelectedOrderId(order.id)} order={order} />
              ))}
            </section>
          </div>

          <aside className="sticky top-28 space-y-7">
            <section className="bg-[#1b1c1c] p-6 text-white shadow-[0_18px_45px_rgba(15,14,14,0.18)]">
              <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-[#ffb4ab]">Lệnh đang chọn</p>
              <h3 className="mt-3 text-2xl font-black">{selectedOrder.id}</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">{selectedOrder.vehicle} - {selectedOrder.plate}</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="bg-white/10 p-4">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white/55">Bắt đầu</p>
                  <p className="mt-2 text-xl font-black">{selectedOrder.start}</p>
                </div>
                <div className="bg-white/10 p-4">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white/55">Thời lượng</p>
                  <p className="mt-2 text-xl font-black">{selectedOrder.duration}p</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-white/70">{selectedOrder.note}</p>
            </section>

            <section className="border border-[#efeded] bg-white p-6">
              <h3 className="text-lg font-black text-[#171717]">Cập nhật trạng thái</h3>
              <div className="mt-4 space-y-3">
                <button className="flex min-h-12 w-full items-center justify-center gap-3 bg-[#ba0013] px-5 text-sm font-black uppercase text-white transition hover:bg-[#94000f]" onClick={() => updateSelectedStatus('in-progress')} type="button">
                  <Icon name="bolt" />
                  Bắt đầu / tiếp tục
                </button>
                <button className="flex min-h-12 w-full items-center justify-center gap-3 border border-[#d8d5d5] px-5 text-sm font-black uppercase text-[#1b1c1c] transition hover:border-[#ba0013] hover:text-[#ba0013]" onClick={() => updateSelectedStatus('paused')} type="button">
                  Tạm dừng
                </button>
                <button className="flex min-h-12 w-full items-center justify-center gap-3 border border-green-600 px-5 text-sm font-black uppercase text-green-700 transition hover:bg-green-50" onClick={() => updateSelectedStatus('completed')} type="button">
                  <Icon name="check" />
                  Đánh dấu hoàn thành
                </button>
              </div>
            </section>

            <section className="border border-[#efeded] bg-white p-6">
              <h3 className="text-lg font-black text-[#171717]">Ghi chú nhanh</h3>
              <textarea className="mt-4 min-h-32 w-full border border-[#d8d5d5] bg-[#fbf9f8] p-4 text-sm outline-none focus:border-[#ba0013] focus:ring-4 focus:ring-[#ba0013]/10" defaultValue="Cần chụp ảnh trước/sau khi hoàn thành hạng mục chính." />
            </section>
          </aside>
        </div>
      </div>
    </TechnicianShell>
  )
}




