import { CheckOutlined } from '@ant-design/icons'
import { Button, Card, Empty, Progress, Select, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { fetchWorkshopRepairOrders, fetchWorkshopTechnicians, orderId, personName, unwrapArray, updateWorkshopRepairOrder, vehicleName, vehiclePlate, type ApiRepairOrder, type ApiTechnician } from '../../shared/api/workshop'
import { useAuth } from '../../shared/auth'
import { StatCard, advisorPalette } from '../../widgets/backoffice-shell'
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

const statusLabels: Record<TechnicianStatus, string> = {
  available: 'Available',
  busy: 'Busy',
  off: 'Off shift',
}

const statusColors: Record<TechnicianStatus, string> = {
  available: 'green',
  busy: 'gold',
  off: 'default',
}

const taskStatusLabels: Record<TaskStatus, string> = {
  'in-progress': 'In progress',
  scheduled: 'Scheduled',
  waiting: 'Awaiting assignment',
}

const priorityLabels: Record<ScheduleTask['priority'], string> = {
  high: 'Urgent',
  low: 'Normal',
  medium: 'Recommended',
}

const priorityColors: Record<ScheduleTask['priority'], string> = {
  high: 'red',
  low: 'default',
  medium: 'gold',
}

function mapTechnicianFromApi(technician: ApiTechnician, index: number): Technician {
  return {
    bay: technician.bay || 'Bay ' + String(index + 1).padStart(2, '0'),
    id: technician._id || technician.id || crypto.randomUUID(),
    name: technician.fullName || technician.email || 'Technician',
    skill: technician.skill || 'Skill not updated',
    status: technician.status === 'off' || technician.status === 'offline' ? 'off' : technician.status === 'busy' ? 'busy' : 'available',
  }
}

function mapScheduleTaskFromApi(order: ApiRepairOrder, index: number): ScheduleTask {
  const vehicle = order.vehicleId || order.vehicle
  const firstService = order.services?.[0]
  const serviceName = typeof firstService?.serviceId === 'object' ? firstService.serviceId.name : firstService?.name
  const technician = order.technicianId || order.technician

  return {
    advisorNote: order.stepNotes?.at(-1)?.content || 'No coordination note yet.',
    customer: personName(order.customer || vehicle?.customerId || vehicle?.customer, 'Customer'),
    duration: order.services?.reduce((sum, item) => sum + ((typeof item.serviceId === 'object' ? item.serviceId.estimatedDuration : 45) || 45) * (item.quantity || 1), 0) || 45,
    id: order._id || order.id || orderId(order),
    plate: vehiclePlate(vehicle),
    priority: index === 0 ? 'high' : 'medium',
    service: serviceName || 'Repair order',
    start: order.startedAt ? new Date(order.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : timeSlots[index % timeSlots.length],
    status: order.status === 'inProgress' || order.status === 'in-progress' ? 'in-progress' : technician ? 'scheduled' : 'waiting',
    technicianId: typeof technician === 'string' ? technician : technician?._id || technician?.id,
    vehicle: vehicleName(vehicle),
  }
}

function TechnicianCard({ active, load, onSelect, technician }: { active: boolean; load: number; onSelect: () => void; technician: Technician }) {
  return (
    <button
      className="w-full rounded-[20px] p-4 text-left transition"
      onClick={onSelect}
      style={{
        background: active ? advisorPalette.panelAlt : advisorPalette.panel,
        border: active ? `2px solid ${advisorPalette.red}` : `1px solid ${advisorPalette.border}`,
        boxShadow: advisorPalette.shadow,
      }}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p style={{ color: advisorPalette.ink, fontWeight: 700 }}>{technician.name}</p>
          <p style={{ color: advisorPalette.textMuted, fontSize: 13, fontWeight: 600, marginTop: 4 }}>{technician.skill}</p>
          <p style={{ color: advisorPalette.textMuted, fontSize: 12, fontWeight: 700, marginTop: 4 }}>{technician.bay}</p>
        </div>
        <Tag color={statusColors[technician.status]}>{statusLabels[technician.status]}</Tag>
      </div>
      <Progress percent={Math.min(100, load)} showInfo={false} strokeColor={advisorPalette.red} style={{ marginTop: 12 }} />
      <p style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, marginTop: 6, textTransform: 'uppercase' }}>Today's load: {load}%</p>
    </button>
  )
}

function TaskCell({ task }: { task?: ScheduleTask }) {
  if (!task) {
    return (
      <div style={{ alignItems: 'center', border: `1px dashed ${advisorPalette.border}`, borderRadius: 14, color: advisorPalette.textMuted, display: 'flex', fontSize: 12, fontWeight: 700, height: '100%', justifyContent: 'center', minHeight: 96 }}>
        Empty
      </div>
    )
  }

  return (
    <div style={{ background: task.status === 'in-progress' ? '#fff1f2' : advisorPalette.panelAlt, borderRadius: 14, padding: 12 }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p style={{ color: advisorPalette.ink, fontWeight: 700 }}>{task.vehicle}</p>
          <p style={{ color: advisorPalette.red, fontSize: 12, fontWeight: 700, marginTop: 2 }}>{task.plate}</p>
        </div>
        <Tag color={priorityColors[task.priority]}>{priorityLabels[task.priority]}</Tag>
      </div>
      <p style={{ color: advisorPalette.ink, fontSize: 13, fontWeight: 600, marginTop: 8 }}>{task.service}</p>
      <p style={{ color: advisorPalette.textMuted, fontSize: 12, marginTop: 6 }}>{task.start} - {task.duration} min</p>
      <p style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, marginTop: 6, textTransform: 'uppercase' }}>{taskStatusLabels[task.status]}</p>
    </div>
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
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Unable to load the technician schedule from the API')
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
    if (!selectedWaitingTask || !selectedTechnician || !token) return

    setSaving(true)
    setApiMessage(undefined)

    try {
      await updateWorkshopRepairOrder(token, selectedWaitingTask.id, { scheduledStart: selectedTime, status: 'pending', technicianId: selectedTechnician.id })
      setTasks((current) =>
        current.map((task) =>
          task.id === selectedWaitingTask.id ? { ...task, start: selectedTime, status: 'scheduled', technicianId: selectedTechnician.id } : task,
        ),
      )

      const nextWaiting = tasks.find((task) => !task.technicianId && task.id !== selectedWaitingTask.id)
      setSelectedWaitingTaskId(nextWaiting?.id || '')
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Unable to assign the schedule to the technician')
    } finally {
      setSaving(false)
    }
  }

  const scheduleColumns: ColumnsType<{ slot: string }> = [
    {
      dataIndex: 'slot',
      key: 'slot',
      render: (slot: string) => <span style={{ color: advisorPalette.red, fontWeight: 700 }}>{slot}</span>,
      title: 'Time slot',
      width: 110,
    },
    ...technicianList.map((technician) => ({
      key: technician.id,
      render: (row: { slot: string }) => <TaskCell task={tasks.find((task) => task.technicianId === technician.id && task.start === row.slot)} />,
      title: (
        <div>
          <div style={{ color: advisorPalette.ink, fontWeight: 700 }}>{technician.name}</div>
          <div style={{ color: advisorPalette.textMuted, fontSize: 12, fontWeight: 600 }}>{technician.bay}</div>
        </div>
      ),
      width: 220,
    })),
  ]

  return (
    <ServiceAdvisorShell title="Technician schedule coordination">
      {apiMessage ? (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 18, color: '#991b1b', padding: '12px 16px' }}>
          {apiMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4">
        <StatCard label="Technicians available" palette={advisorPalette} value={`${technicianList.filter((tech) => tech.status === 'available').length}/${technicianList.length}`} />
        <StatCard label="Vehicles awaiting assignment" palette={advisorPalette} value={waitingTasks.length} />
        <StatCard label="High priority" palette={advisorPalette} value={highPriorityWaiting} />
        <StatCard label="Hours scheduled" palette={advisorPalette} value={`${Math.round(totalScheduledMinutes / 60)}h`} />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {technicianList.map((technician) => (
              <TechnicianCard
                active={technician.id === selectedTechnician?.id}
                key={technician.id}
                load={todayLoad.find((item) => item.technicianId === technician.id)?.load ?? 0}
                onSelect={() => setSelectedTechnicianId(technician.id)}
                technician={technician}
              />
            ))}
          </div>

          <Card bordered={false} className="rounded-[28px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title="Daily schedule board">
            <Table
              columns={scheduleColumns}
              dataSource={timeSlots.map((slot) => ({ slot }))}
              pagination={false}
              rowKey="slot"
              scroll={{ x: 220 * technicianList.length + 110 }}
            />
          </Card>
        </div>

        <div className="flex flex-col gap-5" style={{ position: 'sticky', top: 96 }}>
          <Card bordered={false} className="rounded-[28px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title="Vehicles awaiting assignment">
            <div className="flex flex-col gap-3">
              {waitingTasks.length ? (
                waitingTasks.map((task) => (
                  <button
                    className="w-full rounded-[18px] p-4 text-left transition"
                    key={task.id}
                    onClick={() => setSelectedWaitingTaskId(task.id)}
                    style={{
                      background: task.id === selectedWaitingTaskId ? advisorPalette.panelAlt : 'transparent',
                      border: task.id === selectedWaitingTaskId ? `2px solid ${advisorPalette.red}` : `1px solid ${advisorPalette.border}`,
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p style={{ color: advisorPalette.ink, fontWeight: 700 }}>{task.vehicle}</p>
                        <p style={{ color: advisorPalette.red, fontSize: 12, fontWeight: 700, marginTop: 2 }}>{task.plate}</p>
                      </div>
                      <Tag color={priorityColors[task.priority]}>{priorityLabels[task.priority]}</Tag>
                    </div>
                    <p style={{ color: advisorPalette.ink, fontSize: 13, fontWeight: 600, marginTop: 8 }}>{task.service}</p>
                    <p style={{ color: advisorPalette.textMuted, fontSize: 12, marginTop: 6 }}>{task.advisorNote}</p>
                  </button>
                ))
              ) : (
                <Empty description="No vehicles awaiting assignment." />
              )}
            </div>
          </Card>

          <Card bordered={false} className="rounded-[28px]" style={{ background: advisorPalette.ink, boxShadow: advisorPalette.shadow }}>
            <p style={{ color: '#ffb4ab', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Quick assign</p>
            <h3 style={{ color: 'white', fontSize: 20, fontWeight: 700, marginTop: 10 }}>{selectedWaitingTask?.vehicle ?? 'Select a waiting vehicle'}</h3>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 8 }}>
              Technician: {selectedTechnician?.name ?? 'Select a technician'} - {selectedTechnician?.skill ?? 'Not updated'}
            </p>

            <div style={{ marginTop: 16 }}>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Time slot</p>
              <Select onChange={setSelectedTime} options={timeSlots.map((slot) => ({ label: slot, value: slot }))} style={{ width: '100%' }} value={selectedTime} />
            </div>

            <Button
              block
              disabled={saving || !selectedWaitingTask || !selectedTechnician || selectedTechnician.status === 'off'}
              icon={<CheckOutlined />}
              onClick={assignSelectedTask}
              style={{ marginTop: 16 }}
              type="primary"
            >
              Assign to technician
            </Button>

            {selectedTechnician?.status === 'off' ? (
              <p style={{ color: '#ffb4ab', fontSize: 13, fontWeight: 600, marginTop: 12 }}>This technician is off shift — pick another one to assign.</p>
            ) : null}
          </Card>
        </div>
      </div>
    </ServiceAdvisorShell>
  )
}
