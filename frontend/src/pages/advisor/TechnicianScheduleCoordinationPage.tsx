import { useEffect, useState } from 'react'
import { fetchWorkshopRepairOrders, fetchWorkshopTechnicians, orderId, personName, unwrapArray, updateWorkshopRepairOrder, vehicleName, vehiclePlate, type ApiRepairOrder, type ApiTechnician } from '../../shared/api/workshop'
import { useAuth } from '../../shared/auth'
import { Icon, type IconName } from '../../shared/ui/base'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

type TechnicianStatus = 'available' | 'busy' | 'off'
type TaskStatus = 'scheduled' | 'in-progress' | 'waiting'

type Technician = {
  id: string
  bay: string
  name: string
  skill: string
  status: TechnicianStatus
}

type ScheduleTask = {
  id: string
  advisorNote: string
  customer: string
  duration: number
  plate: string
  priority: 'high' | 'medium' | 'low'
  service: string
  start: string
  status: TaskStatus
  technicianId?: string
  vehicle: string
}

const timeSlots = ['08:00', '09:00', '10:30', '13:30', '15:00', '16:30']


function mapTechnicianFromApi(technician: ApiTechnician, index: number): Technician {
  return {
    bay: technician.bay || 'Cầu nâng ' + String(index + 1).padStart(2, '0'),
    id: technician._id || technician.id || crypto.randomUUID(),
    name: technician.fullName || technician.email || 'Kỹ thuật viên',
    skill: technician.skill || 'Chưa cập nhật kỹ năng',
    status: technician.status === 'off' || technician.status === 'offline' ? 'off' : technician.status === 'busy' ? 'busy' : 'available',
  }
}

function mapScheduleTaskFromApi(order: ApiRepairOrder, index: number): ScheduleTask {
  const vehicle = order.vehicleId || order.vehicle
  const firstService = order.services?.[0]
  const serviceName = typeof firstService?.serviceId === 'object' ? firstService.serviceId.name : firstService?.name
  const technician = order.technicianId || order.technician

  return {
    advisorNote: order.stepNotes?.at(-1)?.content || 'Chưa có ghi chú điều phối.',
    customer: personName(order.customer || vehicle?.customerId || vehicle?.customer, 'Khách hàng'),
    duration: order.services?.reduce((sum, item) => sum + ((typeof item.serviceId === 'object' ? item.serviceId.estimatedDuration : 45) || 45) * (item.quantity || 1), 0) || 45,
    id: order._id || order.id || orderId(order),
    plate: vehiclePlate(vehicle),
    priority: index === 0 ? 'high' : 'medium',
    service: serviceName || 'Lệnh sửa chữa',
    start: order.startedAt ? new Date(order.startedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : timeSlots[index % timeSlots.length],
    status: order.status === 'inProgress' || order.status === 'in-progress' ? 'in-progress' : technician ? 'scheduled' : 'waiting',
    technicianId: typeof technician === 'string' ? technician : technician?._id || technician?.id,
    vehicle: vehicleName(vehicle),
  }
}

function statusLabel(status: TechnicianStatus) {
  return {
    available: 'Sẵn sàng',
    busy: 'Đang bận',
    off: 'Nghỉ ca',
  }[status]
}

function taskStatusLabel(status: TaskStatus) {
  return {
    'in-progress': 'Đang làm',
    scheduled: 'Đã xếp lịch',
    waiting: 'Chờ phân công',
  }[status]
}

function priorityClass(priority: ScheduleTask['priority']) {
  return {
    high: 'bg-[#ba0013] text-white',
    low: 'bg-[#e4e2e2] text-[#1b1c1c]',
    medium: 'bg-amber-100 text-amber-800',
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

function TechnicianCard({
  active,
  load,
  onSelect,
  technician,
}: {
  active: boolean
  load: number
  onSelect: () => void
  technician: Technician
}) {
  const statusClass = {
    available: 'bg-green-50 text-green-700',
    busy: 'bg-amber-50 text-amber-700',
    off: 'bg-[#e4e2e2] text-[#6a6767]',
  }[technician.status]

  return (
    <button
      className={active ? 'w-full border-l-4 border-[#ba0013] bg-[#fffafa] p-4 text-left' : 'w-full border border-[#efeded] bg-white p-4 text-left transition hover:border-[#ba0013] hover:bg-[#fffafa]'}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-[#171717]">{technician.name}</p>
          <p className="mt-1 text-sm font-semibold text-[#6a6767]">{technician.skill}</p>
          <p className="mt-1 text-xs font-bold text-[#8a8686]">{technician.bay}</p>
        </div>
        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass}`}>{statusLabel(technician.status)}</span>
      </div>
      <div className="mt-4 h-2 bg-[#efeded]">
        <div className="h-full bg-[#ba0013]" style={{ width: `${Math.min(100, load)}%` }} />
      </div>
      <p className="mt-2 font-mono text-[10px] font-black uppercase text-[#6a6767]">Tải hôm nay: {load}%</p>
    </button>
  )
}

function TaskCard({ task }: { task: ScheduleTask }) {
  return (
    <article className={task.status === 'in-progress' ? 'border-l-4 border-[#ba0013] bg-[#fffafa] p-3' : 'border border-[#efeded] bg-white p-3'}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-[#171717]">{task.vehicle}</p>
          <p className="mt-1 font-mono text-xs font-bold text-[#ba0013]">{task.plate}</p>
        </div>
        <span className={`px-2 py-1 text-[10px] font-black uppercase ${priorityClass(task.priority)}`}>{task.priority === 'high' ? 'Gấp' : task.priority === 'medium' ? 'Nên làm' : 'Thường'}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-[#1b1c1c]">{task.service}</p>
      <p className="mt-2 text-xs text-[#6a6767]">{task.start} - {task.duration} phút</p>
      <p className="mt-2 text-[11px] font-bold uppercase text-[#8a8686]">{taskStatusLabel(task.status)}</p>
    </article>
  )
}

export function TechnicianScheduleCoordinationPage() {
  const { token } = useAuth()
  const [technicianList, setTechnicianList] = useState<Technician[]>([])
  const [tasks, setTasks] = useState<ScheduleTask[]>([])
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('')
  const [selectedWaitingTaskId, setSelectedWaitingTaskId] = useState('')
  const [selectedTime, setSelectedTime] = useState('15:00')
  const [apiMessage, setApiMessage] = useState<string>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    const authToken = token

    let cancelled = false

    async function loadSchedule() {
      setApiMessage(undefined)
      try {
        const [techResponse, orderResponse] = await Promise.all([fetchWorkshopTechnicians(authToken), fetchWorkshopRepairOrders(authToken)])
        const nextTechnicians = techResponse.map(mapTechnicianFromApi)
        const nextTasks = unwrapArray<ApiRepairOrder>(orderResponse, ['repairOrders', 'orders']).map(mapScheduleTaskFromApi)

        if (!cancelled) {
          setTechnicianList(nextTechnicians)
          setTasks(nextTasks)
          setSelectedTechnicianId((current) => current || nextTechnicians[0]?.id || '')
          setSelectedWaitingTaskId((current) => current || nextTasks.find((task) => !task.technicianId)?.id || '')
        }
      } catch (err) {
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Không tải được lịch kỹ thuật viên từ API')
      }
    }

    void loadSchedule()

    return () => {
      cancelled = true
    }
  }, [token])

  const selectedTechnician = technicianList.find((technician) => technician.id === selectedTechnicianId) ?? technicianList[0]
  const waitingTasks = tasks.filter((task) => !task.technicianId)
  const assignedTasks = tasks.filter((task) => task.technicianId)
  const todayLoad = technicianList.map((technician) => {
    const minutes = assignedTasks.filter((task) => task.technicianId === technician.id).reduce((sum, task) => sum + task.duration, 0)
    return { technicianId: technician.id, load: Math.round((minutes / 360) * 100) }
  })

  const selectedWaitingTask = tasks.find((task) => task.id === selectedWaitingTaskId)

  const totalScheduledMinutes = assignedTasks.reduce((sum, task) => sum + task.duration, 0)
  const highPriorityWaiting = waitingTasks.filter((task) => task.priority === 'high').length

  async function assignSelectedTask() {
    if (!selectedWaitingTask || !selectedTechnician || !token) {
      return
    }

    setSaving(true)
    setApiMessage(undefined)

    try {
      await updateWorkshopRepairOrder(token, selectedWaitingTask.id, { scheduledStart: selectedTime, status: 'pending', technicianId: selectedTechnician.id })
      setTasks((current) =>
        current.map((task) =>
          task.id === selectedWaitingTask.id
            ? { ...task, start: selectedTime, status: 'scheduled', technicianId: selectedTechnician.id }
            : task,
        ),
      )

      const nextWaiting = tasks.find((task) => !task.technicianId && task.id !== selectedWaitingTask.id)
      setSelectedWaitingTaskId(nextWaiting?.id || '')
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Không gán được lịch cho kỹ thuật viên')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ServiceAdvisorShell active="technician-schedule" title="Điều phối lịch kỹ thuật viên">
      <div className="space-y-7">
        <section className="relative overflow-hidden border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
          <div className="absolute right-8 top-8 hidden text-[#ba0013]/10 lg:block">
            <Icon className="h-32 w-32" name="team" />
          </div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#ba0013]">Technician Dispatch Board</p>
          <h2 className="mt-3 text-4xl font-black leading-tight text-[#171717] md:text-5xl">Xem tải công việc và điều phối lịch KTV</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#6a6767]">
            Service Advisor theo dõi lịch trong ngày, xe đang chờ phân công và gán công việc vào kỹ thuật viên phù hợp theo kỹ năng, tải việc và khung giờ.
          </p>
        </section>

        {apiMessage ? <div className="border border-[#e7bdb8] bg-[#fffafa] px-5 py-4 text-sm font-bold text-[#ba0013]">{apiMessage}</div> : null}

        <section className="grid gap-4 md:grid-cols-4">
          <SummaryCard icon="team" label="KTV sẵn sàng" value={`${technicianList.filter((tech) => tech.status === 'available').length}/${technicianList.length}`} />
          <SummaryCard icon="clipboard" label="Xe chờ phân công" value={String(waitingTasks.length).padStart(2, '0')} />
          <SummaryCard icon="alert" label="Ưu tiên cao" value={String(highPriorityWaiting).padStart(2, '0')} />
          <SummaryCard icon="calendar" label="Giờ đã xếp" value={`${Math.round(totalScheduledMinutes / 60)}h`} />
        </section>

        <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-7">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {technicianList.map((technician) => (
                <TechnicianCard
                  active={technician.id === selectedTechnician.id}
                  key={technician.id}
                  load={todayLoad.find((item) => item.technicianId === technician.id)?.load ?? 0}
                  onSelect={() => setSelectedTechnicianId(technician.id)}
                  technician={technician}
                />
              ))}
            </section>

            <section className="overflow-hidden border border-[#efeded] bg-white shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
              <div className="flex flex-col gap-3 border-b border-[#efeded] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-black text-[#171717]">Lịch làm việc trong ngày</h3>
                  <p className="mt-1 text-sm font-semibold text-[#6a6767]">Theo dõi nhanh theo KTV và khung giờ.</p>
                </div>
                <span className="bg-[#fff1f1] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#ba0013]">03/07/2026</span>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[980px]">
                  <div className="grid grid-cols-[130px_repeat(4,minmax(190px,1fr))] border-b border-[#efeded] bg-[#fbf9f8]">
                    <div className="px-4 py-3 font-mono text-[11px] font-black uppercase tracking-[0.12em] text-[#6a6767]">Khung giờ</div>
                    {technicianList.map((technician) => (
                      <div className="border-l border-[#efeded] px-4 py-3" key={technician.id}>
                        <p className="font-black text-[#171717]">{technician.name}</p>
                        <p className="text-xs font-semibold text-[#6a6767]">{technician.bay}</p>
                      </div>
                    ))}
                  </div>

                  {timeSlots.map((slot) => (
                    <div className="grid min-h-32 grid-cols-[130px_repeat(4,minmax(190px,1fr))] border-b border-[#efeded]" key={slot}>
                      <div className="bg-[#fbf9f8] px-4 py-4 font-mono text-sm font-black text-[#ba0013]">{slot}</div>
                      {technicianList.map((technician) => {
                        const task = tasks.find((item) => item.technicianId === technician.id && item.start === slot)

                        return (
                          <div className="border-l border-[#efeded] p-3" key={`${slot}-${technician.id}`}>
                            {task ? <TaskCard task={task} /> : <div className="flex h-full min-h-24 items-center justify-center border border-dashed border-[#e4e2e2] text-xs font-bold text-[#8a8686]">Trống</div>}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-7">
            <section className="border border-[#efeded] bg-white p-6 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
              <h3 className="text-lg font-black text-[#171717]">Xe chờ phân công</h3>
              <p className="mt-1 text-sm font-semibold text-[#6a6767]">Chọn xe, KTV và khung giờ để điều phối.</p>

              <div className="mt-5 space-y-3">
                {waitingTasks.length ? (
                  waitingTasks.map((task) => (
                    <button
                      className={task.id === selectedWaitingTaskId ? 'w-full border-l-4 border-[#ba0013] bg-[#fffafa] p-4 text-left' : 'w-full border border-[#efeded] bg-[#fbf9f8] p-4 text-left transition hover:border-[#ba0013]'}
                      key={task.id}
                      onClick={() => setSelectedWaitingTaskId(task.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-[#171717]">{task.vehicle}</p>
                          <p className="mt-1 font-mono text-xs font-bold text-[#ba0013]">{task.plate}</p>
                        </div>
                        <span className={`px-2 py-1 text-[10px] font-black uppercase ${priorityClass(task.priority)}`}>{task.priority === 'high' ? 'Gấp' : task.priority === 'medium' ? 'Nên làm' : 'Thường'}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-[#1b1c1c]">{task.service}</p>
                      <p className="mt-2 text-xs text-[#6a6767]">{task.advisorNote}</p>
                    </button>
                  ))
                ) : (
                  <div className="bg-[#fbf9f8] p-5 text-sm font-semibold text-[#6a6767]">Không còn xe chờ phân công.</div>
                )}
              </div>
            </section>

            <section className="bg-[#1b1c1c] p-6 text-white shadow-[0_18px_45px_rgba(15,14,14,0.18)]">
              <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-[#ffb4ab]">Điều phối nhanh</p>
              <h3 className="mt-3 text-2xl font-black">{selectedWaitingTask?.vehicle ?? 'Chọn xe chờ'}</h3>
              <p className="mt-2 text-sm text-white/65">KTV: {selectedTechnician?.name ?? 'Chọn KTV'} - {selectedTechnician?.skill ?? 'Chưa cập nhật'}</p>

              <label className="mt-5 block space-y-2">
                <span className="block font-mono text-[11px] font-black uppercase tracking-[0.14em] text-white/55">Khung giờ</span>
                <select className="h-12 w-full bg-white/10 px-4 text-white outline-none focus:ring-2 focus:ring-[#ba0013]" onChange={(event) => setSelectedTime(event.target.value)} value={selectedTime}>
                  {timeSlots.map((slot) => (
                    <option className="text-[#1b1c1c]" key={slot}>{slot}</option>
                  ))}
                </select>
              </label>

              <button
                className="mt-5 flex min-h-12 w-full items-center justify-center gap-3 bg-[#ba0013] px-5 text-sm font-black uppercase text-white transition hover:bg-[#e31e24] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={saving || !selectedWaitingTask || !selectedTechnician || selectedTechnician.status === 'off'}
                onClick={assignSelectedTask}
                type="button"
              >
                <Icon name="check" />
                Gán lịch cho KTV
              </button>

              {selectedTechnician?.status === 'off' ? (
                <p className="mt-3 text-sm font-semibold text-[#ffb4ab]">KTV đang nghỉ ca, chọn kỹ thuật viên khác để phân công.</p>
              ) : null}
            </section>
          </aside>
        </div>
      </div>
    </ServiceAdvisorShell>
  )
}

