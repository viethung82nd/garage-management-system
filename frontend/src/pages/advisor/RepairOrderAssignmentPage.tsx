import { useEffect, useMemo, useState } from 'react'
import { createWorkshopRepairOrder, fetchWorkshopServices, fetchWorkshopTechnicians, updateWorkshopRepairOrder, type ApiService, type ApiTechnician } from '../../shared/api/workshop'
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

function mapServiceTask(service: ApiService): ServiceTask {
  return {
    estimate: `${service.estimatedDuration || 45} phút`,
    id: service._id || service.id || crypto.randomUUID(),
    name: service.name || 'Dịch vụ chưa đặt tên',
    parts: service.category || 'Theo cấu hình dịch vụ',
    selected: false,
  }
}

function mapTechnician(technician: ApiTechnician): Technician {
  return {
    activeOrders: technician.activeOrders || 0,
    id: technician._id || technician.id || crypto.randomUUID(),
    name: technician.fullName || technician.email || 'Kỹ thuật viên',
    skill: technician.skill || 'Chưa cập nhật kỹ năng',
    status: technician.status === 'busy' ? 'busy' : technician.status === 'off' || technician.status === 'offline' ? 'offline' : 'available',
  }
}

export function RepairOrderAssignmentPage() {
  const [tasks, setTasks] = useState<ServiceTask[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('')
  const [saved, setSaved] = useState(false)
  const [apiMessage, setApiMessage] = useState<string>()
  const [saving, setSaving] = useState(false)


  useEffect(() => {
    let cancelled = false

    async function loadAssignmentData() {
      setApiMessage(undefined)
      try {
        const [services, technicianList] = await Promise.all([fetchWorkshopServices(), fetchWorkshopTechnicians()])
        if (cancelled) return

        const serviceTasks = services.map(mapServiceTask)
        const nextTechnicians = technicianList.map(mapTechnician)
        setTasks(serviceTasks)
        setTechnicians(nextTechnicians)
        setSelectedTechnicianId(nextTechnicians[0]?.id || '')
      } catch (err) {
        if (!cancelled) {
          setApiMessage(err instanceof Error ? err.message : 'Không tải được dịch vụ/kỹ thuật viên từ API')
        }
      }
    }

    void loadAssignmentData()

    return () => {
      cancelled = true
    }
  }, [])

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

  async function createRepairOrder() {
    setSaving(true)
    setApiMessage(undefined)
    try {
      const created = await createWorkshopRepairOrder({ services: selectedTasks.map((task) => ({ serviceId: task.id, quantity: 1 })), technicianId: selectedTechnicianId })
      const id = created._id || created.id
      if (id && selectedTechnicianId) await updateWorkshopRepairOrder(id, { technicianId: selectedTechnicianId, status: 'pending' })
      setSaved(true)
      setApiMessage('Đã tạo lệnh sửa chữa và gửi phân công qua API.')
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Không tạo được lệnh sửa chữa')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ServiceAdvisorShell active="work-orders" title="Táº¡o lá»‡nh sá»­a chá»¯a & phÃ¢n cÃ´ng">
      <div className="space-y-7">
        {apiMessage ? <div className="border border-[#e7bdb8] bg-[#fffafa] px-5 py-4 text-sm font-bold text-[#ba0013]">{apiMessage}</div> : null}
        <section className="relative overflow-hidden border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
          <div className="absolute right-8 top-8 hidden text-[#ba0013]/10 lg:block">
            <Icon className="h-32 w-32" name="clipboard" />
          </div>
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#ba0013]">Create Repair Order</p>
              <h2 className="mt-3 text-4xl font-black leading-tight text-[#171717] md:text-5xl">Táº¡o lá»‡nh sá»­a chá»¯a tá»« há»“ sÆ¡ tiáº¿p nháº­n</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#6a6767]">
                Service Advisor chá»n háº¡ng má»¥c dá»‹ch vá»¥, kiá»ƒm tra thá»i lÆ°á»£ng dá»± kiáº¿n vÃ  phÃ¢n cÃ´ng ká»¹ thuáº­t viÃªn phÃ¹ há»£p trÆ°á»›c khi chuyá»ƒn lá»‡nh vÃ o xÆ°á»Ÿng.
              </p>
            </div>
            <div className="border border-[#efeded] bg-[#fbf9f8] p-5">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Tráº¡ng thÃ¡i</p>
              <p className="mt-2 text-2xl font-black text-[#ba0013]">{saved ? 'ÄÃ£ táº¡o lá»‡nh' : 'Äang soáº¡n'}</p>
              <p className="mt-1 text-sm font-semibold text-[#6a6767]">Nguá»“n: Booking #BK-0882</p>
            </div>
          </div>
        </section>

        <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-7">
        {apiMessage ? <div className="border border-[#e7bdb8] bg-[#fffafa] px-5 py-4 text-sm font-bold text-[#ba0013]">{apiMessage}</div> : null}
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
                <p className="text-lg font-black text-[#171717]">Sáºµn sÃ ng chuyá»ƒn lá»‡nh cho xÆ°á»Ÿng</p>
                <p className="mt-1 text-sm font-semibold text-[#6a6767]">
                  {selectedTasks.length} háº¡ng má»¥c Ä‘Æ°á»£c chá»n, phÃ¢n cÃ´ng cho {selectedTechnician?.name || 'chưa chọn KTV'}.
                </p>
              </div>
              <button
                className="inline-flex min-h-12 items-center justify-center gap-3 bg-[#ba0013] px-6 text-sm font-black uppercase text-white transition hover:bg-[#94000f]"
                disabled={saving || !selectedTasks.length || !selectedTechnicianId}
                onClick={createRepairOrder}
                type="button"
              >
                <Icon name="check" />
                {saving ? 'Đang tạo...' : 'Tạo lệnh & phân công'}
              </button>
            </section>
          </div>

          <WorkOrderSummary selectedTasks={selectedTasks} selectedTechnician={selectedTechnician} />
        </div>
      </div>
    </ServiceAdvisorShell>
  )
}
