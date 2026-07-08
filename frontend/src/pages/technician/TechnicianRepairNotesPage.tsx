import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUserInitials, useAuth } from '../../shared/auth'
import { addWorkshopStepNote, fetchWorkshopRepairOrders, orderId, unwrapArray, updateWorkshopRepairProgress, vehicleName, vehiclePlate, type ApiRepairOrder } from '../../shared/api/workshop'
import { TechnicianShell } from '../../widgets/technician-shell'
import { Icon, type IconName } from '../../shared/ui/base'

type RepairStepStatus = 'completed' | 'active' | 'waiting'

type StepMetric = {
  label: string
  status?: 'normal' | 'warning'
  unit: string
  value: string
}

type RepairStep = {
  checklist: string[]
  completedAt?: string
  estimate: string
  evidences: Array<{ label: string; note: string }>
  id: string
  materials: Array<{ name: string; qty: string }>
  metrics: StepMetric[]
  order: number
  owner: string
  startedAt?: string
  status: RepairStepStatus
  summary: string
  title: string
}

const emptyStep: RepairStep = {
  checklist: [],
  estimate: '0 phút',
  evidences: [],
  id: '',
  materials: [],
  metrics: [],
  order: 0,
  owner: 'Kỹ thuật viên',
  status: 'waiting',
  summary: 'Chưa có bước sửa chữa từ API.',
  title: 'Chưa có dữ liệu',
}

function mapRepairSteps(order: ApiRepairOrder): RepairStep[] {
  const services = order.services?.length ? order.services : [{ name: 'Kiểm tra và sửa chữa', quantity: 1 }]
  const notes = order.stepNotes || []

  return services.map((service, index) => {
    const apiService = typeof service.serviceId === 'object' ? service.serviceId : undefined
    const note = notes[index]
    const completed = order.status === 'completed'
    const active = !completed && (order.status === 'inProgress' || order.status === 'in-progress') && index === 0

    return {
      checklist: ['Xác nhận đúng hạng mục', 'Thực hiện theo quy trình kỹ thuật', 'Ghi nhận kết quả và bằng chứng'],
      completedAt: completed ? order.completedAt ? new Date(order.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Đã xong' : undefined,
      estimate: String(apiService?.estimatedDuration || 45) + ' phút',
      evidences: [{ label: 'Ảnh kỹ thuật', note: 'Tải ảnh từ phiếu kiểm tra của lệnh sửa chữa.' }],
      id: (typeof service.serviceId === 'string' ? service.serviceId : apiService?._id || apiService?.id) || 'service-' + index,
      materials: [],
      metrics: [],
      order: index + 1,
      owner: 'Kỹ thuật viên',
      startedAt: active && order.startedAt ? new Date(order.startedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : undefined,
      status: completed ? 'completed' : active ? 'active' : 'waiting',
      summary: note?.content || 'Chưa có ghi chú cho hạng mục này.',
      title: apiService?.name || service.name || 'Hạng mục sửa chữa',
    }
  })
}

const statusLabels: Record<RepairStepStatus, string> = {
  active: 'Đang thực hiện',
  completed: 'Hoàn thành',
  waiting: 'Chờ thực hiện',
}

function statusClass(status: RepairStepStatus) {
  return {
    active: 'border-[#ba0013] bg-[#fff1f1] text-[#ba0013]',
    completed: 'border-green-200 bg-green-50 text-green-700',
    waiting: 'border-[#d8d5d5] bg-[#fbf9f8] text-[#6a6767]',
  }[status]
}

function nowTime() {
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date())
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

function StepButton({ active, onSelect, ownerName, step }: { active: boolean; onSelect: () => void; ownerName: string; step: RepairStep }) {
  return (
    <button
      className={active ? 'w-full border-l-4 border-[#ba0013] bg-[#fffafa] p-5 text-left shadow-[0_10px_30px_rgba(27,28,28,0.05)]' : 'w-full border border-[#efeded] bg-white p-5 text-left transition hover:border-[#ba0013] hover:bg-[#fffafa]'}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <span className={step.status === 'completed' ? 'flex h-10 w-10 items-center justify-center bg-green-600 text-white' : step.status === 'active' ? 'flex h-10 w-10 items-center justify-center bg-[#ba0013] text-white' : 'flex h-10 w-10 items-center justify-center bg-[#e4e2e2] text-[#555151]'}>
            {step.status === 'completed' ? <Icon name="check" /> : <span className="font-black">{step.order}</span>}
          </span>
          <div>
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#ba0013]">Bước {step.order} - {step.estimate}</p>
            <h3 className="mt-2 text-lg font-black text-[#171717]">{step.title}</h3>
          </div>
        </div>
        <span className={`w-fit border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass(step.status)}`}>{statusLabels[step.status]}</span>
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-[#6a6767]">{step.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#6a6767]">
        {step.startedAt ? <span className="bg-[#fbf9f8] px-3 py-2">Bắt đầu {step.startedAt}</span> : null}
        {step.completedAt ? <span className="bg-green-50 px-3 py-2 text-green-700">Xong {step.completedAt}</span> : null}
        <span className="bg-[#fbf9f8] px-3 py-2">Phụ trách: {ownerName}</span>
      </div>
    </button>
  )
}

function StepDetail({
  checkedItems,
  disabled,
  note,
  onComplete,
  onNoteChange,
  onSave,
  onStart,
  onToggleChecklist,
  step,
  technicianInitials,
}: {
  checkedItems: string[]
  disabled: boolean
  note: string
  onComplete: () => void
  onNoteChange: (value: string) => void
  onSave: () => void
  onStart: () => void
  onToggleChecklist: (item: string) => void
  step: RepairStep
  technicianInitials: string
}) {
  return (
    <aside className="sticky top-28 space-y-7">
      <section className="bg-[#1b1c1c] p-6 text-white shadow-[0_18px_45px_rgba(15,14,14,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-[#ffb4ab]">Bước đang chọn</p>
            <h3 className="mt-3 text-2xl font-black">{step.title}</h3>
          </div>
          <span className={`border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass(step.status)}`}>{statusLabels[step.status]}</span>
        </div>
        <p className="mt-4 text-sm leading-6 text-white/70">{step.summary}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="bg-white/10 p-4">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white/55">Dự kiến</p>
            <p className="mt-2 text-xl font-black">{step.estimate}</p>
          </div>
          <div className="bg-white/10 p-4">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white/55">Kỹ thuật viên</p>
            <p className="mt-2 text-xl font-black">{technicianInitials}</p>
          </div>
        </div>
      </section>

      <section className="border border-[#efeded] bg-white p-6 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
        <h3 className="text-lg font-black text-[#171717]">Checklist thực hiện</h3>
        <div className="mt-4 space-y-3">
          {step.checklist.map((item) => {
            const checked = checkedItems.includes(item)

            return (
              <button className="flex w-full items-start gap-3 text-left" key={item} onClick={() => onToggleChecklist(item)} type="button">
                <span className={checked ? 'mt-0.5 flex h-6 w-6 items-center justify-center bg-[#ba0013] text-white' : 'mt-0.5 flex h-6 w-6 items-center justify-center border border-[#d8d5d5] bg-white text-transparent'}>
                  <Icon className="h-4 w-4" name="check" />
                </span>
                <span className={checked ? 'text-sm font-bold leading-6 text-[#171717]' : 'text-sm font-semibold leading-6 text-[#6a6767]'}>{item}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="border border-[#efeded] bg-white p-6 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
        <h3 className="text-lg font-black text-[#171717]">Ghi chú chi tiết</h3>
        <textarea
          className="mt-4 min-h-44 w-full border border-[#d8d5d5] bg-[#fbf9f8] p-4 text-sm leading-6 outline-none focus:border-[#ba0013] focus:ring-4 focus:ring-[#ba0013]/10"
          onChange={(event) => onNoteChange(event.target.value)}
          value={note}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
          <button className="flex min-h-12 items-center justify-center gap-3 border border-[#d8d5d5] px-4 text-sm font-black uppercase text-[#1b1c1c] transition hover:border-[#ba0013] hover:text-[#ba0013]" onClick={onStart} type="button">
            <Icon name="bolt" />
            Bắt đầu
          </button>
          <button className="flex min-h-12 items-center justify-center gap-3 bg-[#ba0013] px-4 text-sm font-black uppercase text-white transition hover:bg-[#94000f] disabled:opacity-60" disabled={disabled} onClick={onSave} type="button">
            <Icon name="clipboard" />
            Lưu ghi chú
          </button>
          <button className="flex min-h-12 items-center justify-center gap-3 border border-green-600 px-4 text-sm font-black uppercase text-green-700 transition hover:bg-green-50" onClick={onComplete} type="button">
            <Icon name="check" />
            Hoàn thành
          </button>
        </div>
      </section>
    </aside>
  )
}

export function TechnicianRepairNotesPage() {
  const { token, user } = useAuth()
  const technicianInitials = getUserInitials(user)
  const technicianName = user?.fullName || user?.email || 'Kỹ thuật viên'
  const [repairOrder, setRepairOrder] = useState<ApiRepairOrder>()
  const [steps, setSteps] = useState<RepairStep[]>([])
  const [selectedStepId, setSelectedStepId] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [checkedByStep, setCheckedByStep] = useState<Record<string, string[]>>({})
  const [apiMessage, setApiMessage] = useState<string>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    const authToken = token

    let cancelled = false

    async function loadRepairOrder() {
      setApiMessage(undefined)
      try {
        const userId = user?._id || user?.id
        const response = await fetchWorkshopRepairOrders(authToken, userId ? '?technicianId=' + encodeURIComponent(userId) : '')
        const order = unwrapArray<ApiRepairOrder>(response, ['repairOrders', 'orders'])[0]
        if (!cancelled && order) {
          const nextSteps = mapRepairSteps(order)
          setRepairOrder(order)
          setSteps(nextSteps)
          setSelectedStepId(nextSteps.find((step) => step.status === 'active')?.id || nextSteps[0]?.id || '')
          setNotes(Object.fromEntries(nextSteps.map((step) => [step.id, step.summary === 'Chưa có ghi chú cho hạng mục này.' ? '' : step.summary])))
        }
      } catch (err) {
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Không tải được ghi chú sửa chữa từ API')
      }
    }

    void loadRepairOrder()

    return () => {
      cancelled = true
    }
  }, [token, user?._id, user?.id])

  const selectedStep = steps.find((step) => step.id === selectedStepId) ?? steps[0] ?? emptyStep
  const completedCount = steps.filter((step) => step.status === 'completed').length
  const activeCount = steps.filter((step) => step.status === 'active').length
  const checkedItems = checkedByStep[selectedStep.id] ?? []
  const note = notes[selectedStep.id] ?? ''
  const progress = steps.length ? Math.round((completedCount / steps.length) * 100) : 0
  const currentVehicle = repairOrder?.vehicleId || repairOrder?.vehicle
  const repairOrderLabel = repairOrder ? orderId(repairOrder) : 'Chưa có lệnh'
  const repairVehicleLabel = repairOrder ? vehicleName(currentVehicle) + ' - ' + vehiclePlate(currentVehicle) : 'Chưa có xe được giao'

  const totalEvidence = useMemo(() => steps.reduce((sum, step) => sum + step.evidences.length, 0), [steps])

  function updateStepStatus(status: RepairStepStatus) {
    const stamp = nowTime()

    setSteps((current) =>
      current.map((step) => {
        if (step.id !== selectedStep.id) {
          return step
        }

        return {
          ...step,
          completedAt: status === 'completed' ? stamp : step.completedAt,
          startedAt: status === 'active' && !step.startedAt ? stamp : step.startedAt,
          status,
        }
      }),
    )
  }

  async function persistStepStatus(status: RepairStepStatus) {
    const repairOrderId = repairOrder?._id || repairOrder?.id
    if (!repairOrderId || !selectedStep.id || !token) return

    setSaving(true)
    setApiMessage(undefined)
    try {
      await updateWorkshopRepairProgress(token, repairOrderId, { status: status === 'active' ? 'inProgress' : status === 'completed' ? 'completed' : 'pending', stepId: selectedStep.id })
      updateStepStatus(status)
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Không cập nhật được tiến độ bước sửa chữa')
    } finally {
      setSaving(false)
    }
  }

  async function completeSelectedStep() {
    await persistStepStatus('completed')
    setSteps((current) =>
      current.map((step) => {
        const nextWaiting = step.order === selectedStep.order + 1 && step.status === 'waiting'
        return nextWaiting ? { ...step, startedAt: nowTime(), status: 'active' } : step
      }),
    )
  }

  async function saveSelectedNote() {
    const repairOrderId = repairOrder?._id || repairOrder?.id
    if (!repairOrderId || !selectedStep.id || !token) return

    setSaving(true)
    setApiMessage(undefined)
    try {
      await addWorkshopStepNote(token, repairOrderId, { checklist: checkedItems, content: note, stepId: selectedStep.id })
      setApiMessage('Đã lưu ghi chú bước sửa chữa qua API.')
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Không lưu được ghi chú sửa chữa')
    } finally {
      setSaving(false)
    }
  }

  function toggleChecklist(item: string) {
    setCheckedByStep((current) => {
      const items = current[selectedStep.id] ?? []
      const nextItems = items.includes(item) ? items.filter((value) => value !== item) : [...items, item]

      return { ...current, [selectedStep.id]: nextItems }
    })
  }

  return (
    <TechnicianShell active="repair-notes" eyebrow="Technician Repair Notes" notificationCount={2} title="Ghi chú sửa chữa từng bước">
      <div className="space-y-7">
        {apiMessage ? <div className="border border-[#e7bdb8] bg-[#fffafa] px-5 py-4 text-sm font-bold text-[#ba0013]">{apiMessage}</div> : null}
        <section className="relative overflow-hidden border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
          <div className="grid gap-6 xl:grid-cols-[1fr_340px] xl:items-center">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#ba0013]">{repairOrderLabel}</p>
              <h2 className="mt-3 text-4xl font-black leading-tight text-[#171717] md:text-5xl">Ghi chú sửa chữa {repairVehicleLabel}</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#6a6767]">
                Kỹ thuật viên cập nhật từng bước thực hiện, chỉ số đo, vật tư đã dùng và bằng chứng trước khi cố vấn dịch vụ gửi kết quả cho khách hàng.
              </p>
            </div>
            <div className="border border-[#efeded] bg-[#fbf9f8] p-5">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Tiến độ lệnh</p>
              <p className="mt-2 text-5xl font-black text-[#ba0013]">{progress}%</p>
              <div className="mt-4 h-3 bg-[#e4e2e2]">
                <div className="h-full bg-[#ba0013]" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-3 text-sm font-semibold text-[#6a6767]">{completedCount}/{steps.length} bước đã hoàn thành</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <SummaryCard icon="check" label="Bước đã xong" value={`${completedCount}/${steps.length}`} />
          <SummaryCard icon="bolt" label="Đang thực hiện" value={String(activeCount).padStart(2, '0')} />
          <SummaryCard icon="clipboard" label="Bằng chứng cần lưu" value={String(totalEvidence).padStart(2, '0')} />
          <SummaryCard icon="calendar" label="Dự kiến còn lại" value="2h 10m" />
        </section>

        <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="space-y-7">
            <section className="border border-[#efeded] bg-white p-6 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-[#ba0013]">Quy trình sửa chữa</p>
                  <h3 className="mt-2 text-2xl font-black text-[#171717]">Theo dõi từng bước thực hiện</h3>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#6a6767]">Chọn một bước để nhập ghi chú, tick checklist, xem chỉ số đo và cập nhật trạng thái.</p>
                </div>
                <Link className="inline-flex min-h-12 items-center justify-center gap-3 border border-[#d8d5d5] px-5 text-sm font-black uppercase text-[#1b1c1c] transition hover:border-[#ba0013] hover:text-[#ba0013]" to="/technician/work-orders">
                  <Icon name="chevron-left" />
                  Về lệnh được giao
                </Link>
              </div>
            </section>

            <section className="grid gap-4">
              {steps.map((step) => (
                <StepButton active={step.id === selectedStep.id} key={step.id} onSelect={() => setSelectedStepId(step.id)} ownerName={technicianName} step={step} />
              ))}
            </section>

            <section className="grid gap-7 lg:grid-cols-2">
              <div className="border border-[#efeded] bg-white p-6 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
                <h3 className="text-lg font-black text-[#171717]">Chỉ số kỹ thuật</h3>
                <div className="mt-5 grid gap-3">
                  {selectedStep.metrics.map((metric) => (
                    <div className={metric.status === 'warning' ? 'border-l-4 border-[#ba0013] bg-[#fffafa] p-4' : 'border border-[#efeded] bg-[#fbf9f8] p-4'} key={`${selectedStep.id}-${metric.label}`}>
                      <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#6a6767]">{metric.label}</p>
                      <p className={metric.status === 'warning' ? 'mt-2 text-2xl font-black text-[#ba0013]' : 'mt-2 text-2xl font-black text-[#171717]'}>{metric.value} <span className="text-sm font-bold text-[#6a6767]">{metric.unit}</span></p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#efeded] bg-white p-6 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
                <h3 className="text-lg font-black text-[#171717]">Vật tư và bằng chứng</h3>
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#6a6767]">Vật tư sử dụng</p>
                    <div className="mt-3 space-y-2">
                      {selectedStep.materials.length ? selectedStep.materials.map((material) => (
                        <div className="flex items-center justify-between gap-3 bg-[#fbf9f8] px-4 py-3" key={material.name}>
                          <span className="text-sm font-bold text-[#171717]">{material.name}</span>
                          <span className="text-sm font-black text-[#ba0013]">{material.qty}</span>
                        </div>
                      )) : <p className="bg-[#fbf9f8] px-4 py-3 text-sm font-semibold text-[#6a6767]">Bước này chưa dùng vật tư.</p>}
                    </div>
                  </div>

                  <div>
                    <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#6a6767]">Bằng chứng cần lưu</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {selectedStep.evidences.map((evidence) => (
                        <article className="border border-dashed border-[#e7bdb8] bg-[#fffafa] p-4" key={evidence.label}>
                          <span className="flex h-10 w-10 items-center justify-center bg-[#ba0013] text-white">
                            <Icon name="plus" />
                          </span>
                          <p className="mt-3 font-black text-[#171717]">{evidence.label}</p>
                          <p className="mt-1 text-sm leading-5 text-[#6a6767]">{evidence.note}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <StepDetail
            checkedItems={checkedItems}
            disabled={saving}
            note={note}
            onComplete={() => { void completeSelectedStep() }}
            onNoteChange={(value) => setNotes((current) => ({ ...current, [selectedStep.id]: value }))}
            onSave={() => { void saveSelectedNote() }}
            onStart={() => { void persistStepStatus('active') }}
            onToggleChecklist={toggleChecklist}
            step={selectedStep}
            technicianInitials={technicianInitials}
          />
        </div>
      </div>
    </TechnicianShell>
  )
}




