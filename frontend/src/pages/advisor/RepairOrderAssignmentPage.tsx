import { useMemo, useState } from 'react'
import { Icon } from '../../shared/ui/base'
import {
  CustomerVehiclePanel,
  ServiceTaskBuilder,
  TechnicianAssignmentPanel,
  WorkOrderSummary,
  type ServiceTask,
  type Technician,
} from '../../widgets/repair-order-assignment'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

const initialTasks: ServiceTask[] = [
  {
    estimate: '45 phút',
    id: 'engine-diagnostic',
    name: 'Chẩn đoán động cơ bằng máy chuyên dụng',
    parts: 'Không yêu cầu',
    selected: true,
  },
  {
    estimate: '60 phút',
    id: 'brake-system',
    name: 'Kiểm tra phanh, đĩa phanh và dầu phanh',
    parts: 'Dầu phanh DOT 4, vệ sinh cụm phanh',
    selected: true,
  },
  {
    estimate: '30 phút',
    id: 'oil-filter',
    name: 'Thay dầu động cơ và lọc dầu',
    parts: 'Mobil 1 ESP X3 0W-40, lọc OEM',
    selected: false,
  },
  {
    estimate: '40 phút',
    id: 'wheel-balance',
    name: 'Cân bằng động và kiểm tra lốp',
    parts: 'Chì cân bằng, van lốp',
    selected: false,
  },
]

const technicians: Technician[] = [
  { activeOrders: 1, id: 'tech-minh', name: 'Nguyễn Minh', skill: 'Chẩn đoán động cơ, xe Đức', status: 'available' },
  { activeOrders: 2, id: 'tech-huy', name: 'Trần Quang Huy', skill: 'Phanh, gầm, hệ thống treo', status: 'busy' },
  { activeOrders: 0, id: 'tech-lan', name: 'Lê Lan Chi', skill: 'Bảo dưỡng nhanh, điện thân xe', status: 'available' },
  { activeOrders: 0, id: 'tech-phuc', name: 'Phạm Gia Phúc', skill: 'Hộp số tự động', status: 'offline' },
]

export function RepairOrderAssignmentPage() {
  const [tasks, setTasks] = useState(initialTasks)
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('tech-minh')
  const [saved, setSaved] = useState(false)

  const selectedTasks = useMemo(() => tasks.filter((task) => task.selected), [tasks])
  const selectedTechnician = technicians.find((tech) => tech.id === selectedTechnicianId)

  function toggleTask(id: string) {
    setSaved(false)
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, selected: !task.selected } : task)))
  }

  function assignTechnician(id: string) {
    setSaved(false)
    setSelectedTechnicianId(id)
  }

  function createRepairOrder() {
    setSaved(true)
  }

  return (
    <ServiceAdvisorShell active="work-orders" title="Tạo lệnh sửa chữa & phân công">
      <div className="space-y-7">
        <section className="relative overflow-hidden border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
          <div className="absolute right-8 top-8 hidden text-[#ba0013]/10 lg:block">
            <Icon className="h-32 w-32" name="clipboard" />
          </div>
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#ba0013]">Create Repair Order</p>
              <h2 className="mt-3 text-4xl font-black leading-tight text-[#171717] md:text-5xl">Tạo lệnh sửa chữa từ hồ sơ tiếp nhận</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#6a6767]">
                Service Advisor chọn hạng mục dịch vụ, kiểm tra thời lượng dự kiến và phân công kỹ thuật viên phù hợp trước khi chuyển lệnh vào xưởng.
              </p>
            </div>
            <div className="border border-[#efeded] bg-[#fbf9f8] p-5">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Trạng thái</p>
              <p className="mt-2 text-2xl font-black text-[#ba0013]">{saved ? 'Đã tạo lệnh' : 'Đang soạn'}</p>
              <p className="mt-1 text-sm font-semibold text-[#6a6767]">Nguồn: Booking #BK-0882</p>
            </div>
          </div>
        </section>

        <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-7">
            <CustomerVehiclePanel />

            <div className="grid gap-7 lg:grid-cols-2">
              <ServiceTaskBuilder onToggleTask={toggleTask} tasks={tasks} />
              <TechnicianAssignmentPanel
                onSelectTechnician={assignTechnician}
                selectedTechnicianId={selectedTechnicianId}
                technicians={technicians}
              />
            </div>

            <section className="flex flex-col gap-4 border border-[#efeded] bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-black text-[#171717]">Sẵn sàng chuyển lệnh cho xưởng</p>
                <p className="mt-1 text-sm font-semibold text-[#6a6767]">
                  {selectedTasks.length} hạng mục được chọn, phân công cho {selectedTechnician?.name}.
                </p>
              </div>
              <button
                className="inline-flex min-h-12 items-center justify-center gap-3 bg-[#ba0013] px-6 text-sm font-black uppercase text-white transition hover:bg-[#94000f]"
                onClick={createRepairOrder}
                type="button"
              >
                <Icon name="check" />
                Tạo lệnh & phân công
              </button>
            </section>
          </div>

          <WorkOrderSummary selectedTasks={selectedTasks} selectedTechnician={selectedTechnician} />
        </div>
      </div>
    </ServiceAdvisorShell>
  )
}
