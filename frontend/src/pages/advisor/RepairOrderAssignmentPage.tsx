import { useEffect, useMemo, useState } from 'react'
import { createWorkshopRepairOrder, fetchWorkshopServices, fetchWorkshopTechnicians, updateWorkshopRepairOrder, type ApiService, type ApiTechnician } from '../../shared/api/workshop'
import { useAuth } from '../../shared/auth'
import { Icon } from '../../shared/ui/base'
import {
  CustomerVehiclePanel,
  ServiceTaskBuilder,
  TechnicianAssignmentPanel,
  WorkOrderSummary,
  type RepairOrderHeader,
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

const emptyHeader: RepairOrderHeader = {
  customerName: '',
  customerPhone: '',
  odometer: '',
  plate: '',
  priority: '',
  promisedAt: '',
  vehicleName: '',
  vin: '',
}

function newOrderCode() {
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  return `RO-${stamp}-${String(Math.floor(Math.random() * 9000) + 1000)}`
}

export function RepairOrderAssignmentPage() {
  const { token } = useAuth()
  const [tasks, setTasks] = useState<ServiceTask[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('')
  const [header, setHeader] = useState<RepairOrderHeader>(emptyHeader)
  const [note, setNote] = useState('')
  const [orderCode] = useState(newOrderCode)
  const [saved, setSaved] = useState(false)
  const [apiMessage, setApiMessage] = useState<string>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    const authToken = token

    let cancelled = false

    async function loadAssignmentData() {
      setApiMessage(undefined)
      try {
        const [services, technicianList] = await Promise.all([fetchWorkshopServices(authToken), fetchWorkshopTechnicians(authToken)])
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
  }, [token])

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

  function updateHeader(field: keyof RepairOrderHeader, value: string) {
    setSaved(false)
    setHeader((current) => ({ ...current, [field]: value }))
  }

  async function createRepairOrder() {
    if (!token) return

    setSaving(true)
    setApiMessage(undefined)
    try {
      const payload = {
        code: orderCode,
        customer: { name: header.customerName, phone: header.customerPhone },
        note,
        priority: header.priority || undefined,
        promisedAt: header.promisedAt || undefined,
        services: selectedTasks.map((task) => ({ serviceId: task.id, quantity: 1 })),
        technicianId: selectedTechnicianId,
        vehicle: { licensePlate: header.plate, model: header.vehicleName, odometer: Number(header.odometer) || undefined, vin: header.vin },
      }
      const created = await createWorkshopRepairOrder(token, payload)
      const id = created._id || created.id
      if (id && selectedTechnicianId) await updateWorkshopRepairOrder(token, id, { technicianId: selectedTechnicianId, status: 'pending' })
      setSaved(true)
      setApiMessage('Đã tạo lệnh sửa chữa và gửi phân công qua API.')
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Không tạo được lệnh sửa chữa')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ServiceAdvisorShell active="work-orders" title="Tạo lệnh sửa chữa & phân công">
      <div className="space-y-7">
        {apiMessage ? <div className="border border-[#e7bdb8] bg-[#fffafa] px-5 py-4 text-sm font-bold text-[#ba0013]">{apiMessage}</div> : null}
        <section className="relative overflow-hidden border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
          <div className="absolute right-8 top-8 hidden text-[#ba0013]/10 lg:block">
            <Icon className="h-32 w-32" name="clipboard" />
          </div>
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#ba0013]">Create Repair Order</p>
              <h2 className="mt-3 text-4xl font-black leading-tight text-[#171717] md:text-5xl">Tạo lệnh sửa chữa từ hồ sơ tiếp nhận</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#6a6767]">
                Service Advisor chọn hạng mục dịch vụ, kiểm tra thời lượng dự kiến và phân công kỹ thuật viên phù hợp trước khi
                chuyển lệnh vào xưởng.
              </p>
            </div>
            <div className="border border-[#efeded] bg-[#fbf9f8] p-5">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Trạng thái</p>
              <p className="mt-2 text-2xl font-black text-[#ba0013]">{saved ? 'Đã tạo lệnh' : 'Đang soạn'}</p>
              <p className="mt-1 text-sm font-semibold text-[#6a6767]">Mã: {orderCode}</p>
            </div>
          </div>
        </section>

        <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-7">
            <CustomerVehiclePanel onChange={updateHeader} value={header} />

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
                  {selectedTasks.length} hạng mục được chọn, phân công cho {selectedTechnician?.name || 'chưa chọn KTV'}.
                </p>
              </div>
              <button
                className="inline-flex min-h-12 items-center justify-center gap-3 bg-[#ba0013] px-6 text-sm font-black uppercase text-white transition hover:bg-[#94000f] disabled:opacity-60"
                disabled={saving || !selectedTasks.length || !selectedTechnicianId}
                onClick={createRepairOrder}
                type="button"
              >
                <Icon name="check" />
                {saving ? 'Đang tạo...' : 'Tạo lệnh & phân công'}
              </button>
            </section>
          </div>

          <WorkOrderSummary code={orderCode} note={note} onNoteChange={setNote} selectedTasks={selectedTasks} selectedTechnician={selectedTechnician} />
        </div>
      </div>
    </ServiceAdvisorShell>
  )
}
