import { CheckOutlined, PlusCircleOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Button, Card, Empty, Input, InputNumber, Select, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUserInitials, useAuth } from '../../shared/auth'
import {
  addWorkshopStepNote,
  createAdditionalServiceProposal,
  fetchWorkshopRepairOrders,
  orderId,
  unwrapArray,
  updateWorkshopRepairProgress,
  vehicleName,
  vehiclePlate,
  type ApiRepairOrder,
} from '../../shared/api/workshop'
import { TechnicianShell, technicianPalette } from '../../widgets/technician-shell'

const { TextArea } = Input

type RepairStepStatus = 'completed' | 'active' | 'waiting'

type RepairStep = {
  checklist: string[]
  completedAt?: string
  estimate: string
  id: string
  order: number
  status: RepairStepStatus
  summary: string
  title: string
}

const emptyStep: RepairStep = {
  checklist: [],
  estimate: '0 min',
  id: '',
  order: 0,
  status: 'waiting',
  summary: 'No repair step from the API yet.',
  title: 'No data',
}

function mapRepairSteps(order: ApiRepairOrder): RepairStep[] {
  const services = order.services?.length ? order.services : [{ name: 'Inspect and repair', quantity: 1 }]
  const notes = order.stepNotes || []

  return services.map((service, index) => {
    const apiService = typeof service.serviceId === 'object' ? service.serviceId : undefined
    const note = notes[index]
    const completed = order.status === 'completed'
    const active = !completed && (order.status === 'inProgress' || order.status === 'in-progress') && index === 0

    return {
      checklist: ['Confirm the right item', 'Follow the technical procedure', 'Record the result and evidence'],
      completedAt: completed ? (order.completedAt ? new Date(order.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Done') : undefined,
      estimate: `${apiService?.estimatedDuration || 45} min`,
      id: (typeof service.serviceId === 'string' ? service.serviceId : apiService?._id || apiService?.id) || 'service-' + index,
      order: index + 1,
      status: completed ? 'completed' : active ? 'active' : 'waiting',
      summary: note?.content || 'No note for this item yet.',
      title: apiService?.name || service.name || 'Repair item',
    }
  })
}

const statusLabels: Record<RepairStepStatus, string> = {
  active: 'In progress',
  completed: 'Completed',
  waiting: 'Waiting',
}

const statusColors: Record<RepairStepStatus, string> = {
  active: 'red',
  completed: 'green',
  waiting: 'default',
}

function nowTime() {
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date())
}

function StepButton({ active, onSelect, step }: { active: boolean; onSelect: () => void; step: RepairStep }) {
  return (
    <button
      className="w-full rounded-[22px] p-5 text-left transition"
      onClick={onSelect}
      style={{
        background: active ? technicianPalette.panelAlt : technicianPalette.panel,
        border: active ? `2px solid ${technicianPalette.red}` : `1px solid ${technicianPalette.border}`,
        boxShadow: technicianPalette.shadow,
      }}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span
            style={{
              alignItems: 'center',
              background: step.status === 'completed' ? '#15803d' : step.status === 'active' ? technicianPalette.red : technicianPalette.panelAlt,
              borderRadius: 999,
              color: step.status === 'waiting' ? technicianPalette.textMuted : 'white',
              display: 'flex',
              fontWeight: 700,
              height: 36,
              justifyContent: 'center',
              width: 36,
            }}
          >
            {step.status === 'completed' ? <CheckOutlined /> : step.order}
          </span>
          <div>
            <p style={{ color: technicianPalette.red, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Step {step.order} - {step.estimate}</p>
            <h3 style={{ color: technicianPalette.ink, fontSize: 16, fontWeight: 700, marginTop: 6 }}>{step.title}</h3>
          </div>
        </div>
        <Tag color={statusColors[step.status]}>{statusLabels[step.status]}</Tag>
      </div>
      <p style={{ color: technicianPalette.textMuted, fontSize: 13, marginTop: 10 }}>{step.summary}</p>
      <div className="mt-3 flex flex-wrap gap-2" style={{ color: technicianPalette.textMuted, fontSize: 12, fontWeight: 600 }}>
        {step.completedAt ? <span style={{ background: '#dcfce7', borderRadius: 10, color: '#15803d', padding: '4px 10px' }}>Done {step.completedAt}</span> : null}
      </div>
    </button>
  )
}

export function TechnicianRepairNotesPage() {
  const { token, user } = useAuth()
  const technicianInitials = getUserInitials(user)
  const [repairOrder, setRepairOrder] = useState<ApiRepairOrder>()
  const [steps, setSteps] = useState<RepairStep[]>([])
  const [selectedStepId, setSelectedStepId] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [checkedByStep, setCheckedByStep] = useState<Record<string, string[]>>({})
  const [apiMessage, setApiMessage] = useState<string>()
  const [saving, setSaving] = useState(false)

  const [proposalOpen, setProposalOpen] = useState(false)
  const [proposalServiceName, setProposalServiceName] = useState('')
  const [proposalAffectedPart, setProposalAffectedPart] = useState('')
  const [proposalReason, setProposalReason] = useState('')
  const [proposalCustomerImpact, setProposalCustomerImpact] = useState('')
  const [proposalLaborCost, setProposalLaborCost] = useState(0)
  const [proposalPartsCost, setProposalPartsCost] = useState(0)
  const [proposalEstimateMinutes, setProposalEstimateMinutes] = useState(30)
  const [proposalPriority, setProposalPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [submittingProposal, setSubmittingProposal] = useState(false)

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
          setNotes(Object.fromEntries(nextSteps.map((step) => [step.id, step.summary === 'No note for this item yet.' ? '' : step.summary])))
        }
      } catch (err) {
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Unable to load repair progress from the API')
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
  const repairOrderLabel = repairOrder ? orderId(repairOrder) : 'No order'
  const repairVehicleLabel = repairOrder ? `${vehicleName(currentVehicle)} - ${vehiclePlate(currentVehicle)}` : 'No vehicle assigned'

  function updateStepStatus(status: RepairStepStatus) {
    const stamp = nowTime()

    setSteps((current) =>
      current.map((step) => {
        if (step.id !== selectedStep.id) return step
        return { ...step, completedAt: status === 'completed' ? stamp : step.completedAt, status }
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
      setApiMessage(err instanceof Error ? err.message : 'Unable to update the step progress')
    } finally {
      setSaving(false)
    }
  }

  async function completeSelectedStep() {
    await persistStepStatus('completed')
    setSteps((current) =>
      current.map((step) => {
        const nextWaiting = step.order === selectedStep.order + 1 && step.status === 'waiting'
        return nextWaiting ? { ...step, status: 'active' } : step
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
      setApiMessage('Repair note saved.')
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Unable to save the repair note')
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

  async function submitProposal() {
    const repairOrderId = repairOrder?._id || repairOrder?.id
    if (!repairOrderId || !token || !proposalServiceName.trim()) {
      setApiMessage('Enter a service name before submitting the proposal.')
      return
    }

    setSubmittingProposal(true)
    setApiMessage(undefined)
    try {
      await createAdditionalServiceProposal(token, {
        affectedPart: proposalAffectedPart || undefined,
        customerImpact: proposalCustomerImpact || undefined,
        estimateMinutes: proposalEstimateMinutes,
        laborCost: proposalLaborCost,
        partsCost: proposalPartsCost,
        priority: proposalPriority,
        reason: proposalReason || undefined,
        repairOrderId,
        serviceName: proposalServiceName.trim(),
      })
      setApiMessage('Additional service proposal sent to the service advisor.')
      setProposalOpen(false)
      setProposalServiceName('')
      setProposalAffectedPart('')
      setProposalReason('')
      setProposalCustomerImpact('')
      setProposalLaborCost(0)
      setProposalPartsCost(0)
      setProposalEstimateMinutes(30)
      setProposalPriority('medium')
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Unable to submit the additional service proposal')
    } finally {
      setSubmittingProposal(false)
    }
  }

  return (
    <TechnicianShell eyebrow="Technician Repair Progress" title={repairVehicleLabel}>
      {apiMessage ? (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 18, color: '#991b1b', padding: '12px 16px' }}>
          {apiMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Card bordered={false} className="rounded-[24px]" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, width: 220 }}>
          <p style={{ color: technicianPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Steps done</p>
          <p style={{ color: technicianPalette.ink, fontSize: 26, fontWeight: 700, marginTop: 8 }}>{completedCount}/{steps.length}</p>
        </Card>
        <Card bordered={false} className="rounded-[24px]" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, width: 220 }}>
          <p style={{ color: technicianPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>In progress</p>
          <p style={{ color: technicianPalette.ink, fontSize: 26, fontWeight: 700, marginTop: 8 }}>{String(activeCount).padStart(2, '0')}</p>
        </Card>
        <Card bordered={false} className="rounded-[24px]" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, width: 220 }}>
          <p style={{ color: technicianPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Order progress</p>
          <p style={{ color: technicianPalette.red, fontSize: 26, fontWeight: 700, marginTop: 8 }}>{progress}%</p>
        </Card>
        <Link to="/technician/work-orders" style={{ color: technicianPalette.textMuted, fontSize: 13, fontWeight: 700 }}>
          ← Back to work orders
        </Link>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-5">
          <Card bordered={false} className="rounded-[28px]" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow }} title={`${repairOrderLabel} — repair steps`}>
            <div className="flex flex-col gap-4">
              {steps.length ? steps.map((step) => <StepButton active={step.id === selectedStep.id} key={step.id} onSelect={() => setSelectedStepId(step.id)} step={step} />) : <Empty description="No repair steps from the API yet." />}
            </div>
          </Card>

          <Card
            bordered={false}
            className="rounded-[28px]"
            extra={
              <Button icon={<PlusCircleOutlined />} onClick={() => setProposalOpen((current) => !current)} type={proposalOpen ? 'default' : 'primary'}>
                Submit additional service
              </Button>
            }
            style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow }}
            title="Additional service request"
          >
            {proposalOpen ? (
              <div className="flex flex-col gap-3">
                <Input onChange={(event) => setProposalServiceName(event.target.value)} placeholder="Service name" value={proposalServiceName} />
                <Input onChange={(event) => setProposalAffectedPart(event.target.value)} placeholder="Affected part" value={proposalAffectedPart} />
                <Input onChange={(event) => setProposalReason(event.target.value)} placeholder="Reason" value={proposalReason} />
                <TextArea onChange={(event) => setProposalCustomerImpact(event.target.value)} placeholder="Customer impact" rows={2} value={proposalCustomerImpact} />
                <div className="grid grid-cols-3 gap-3">
                  <InputNumber addonBefore="Labor" min={0} onChange={(value) => setProposalLaborCost(Math.max(0, Number(value) || 0))} style={{ width: '100%' }} value={proposalLaborCost} />
                  <InputNumber addonBefore="Parts" min={0} onChange={(value) => setProposalPartsCost(Math.max(0, Number(value) || 0))} style={{ width: '100%' }} value={proposalPartsCost} />
                  <InputNumber addonBefore="Min" min={0} onChange={(value) => setProposalEstimateMinutes(Math.max(0, Number(value) || 0))} style={{ width: '100%' }} value={proposalEstimateMinutes} />
                </div>
                <Select
                  onChange={setProposalPriority}
                  options={[
                    { label: 'High priority', value: 'high' },
                    { label: 'Recommended', value: 'medium' },
                    { label: 'Monitor', value: 'low' },
                  ]}
                  value={proposalPriority}
                />
                <Button block icon={<PlusCircleOutlined />} loading={submittingProposal} onClick={submitProposal} type="primary">
                  Send to service advisor
                </Button>
              </div>
            ) : (
              <p style={{ color: technicianPalette.textMuted, fontSize: 13 }}>Found extra work while repairing this order? Submit a proposal for the service advisor to review.</p>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-5" style={{ position: 'sticky', top: 96 }}>
          <Card bordered={false} className="rounded-[28px]" style={{ background: technicianPalette.ink, boxShadow: technicianPalette.shadow }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p style={{ color: '#ffb4ab', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Selected step</p>
                <h3 style={{ color: 'white', fontSize: 20, fontWeight: 700, marginTop: 10 }}>{selectedStep.title}</h3>
              </div>
              <Tag color={statusColors[selectedStep.status]}>{statusLabels[selectedStep.status]}</Tag>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 12 }}>{selectedStep.summary}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14 }}>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Estimate</p>
                <p style={{ color: 'white', fontSize: 18, fontWeight: 700, marginTop: 6 }}>{selectedStep.estimate}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14 }}>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Technician</p>
                <p style={{ color: 'white', fontSize: 18, fontWeight: 700, marginTop: 6 }}>{technicianInitials}</p>
              </div>
            </div>
          </Card>

          <Card bordered={false} className="rounded-[28px]" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow }} title="Checklist">
            <div className="flex flex-col gap-2">
              {selectedStep.checklist.map((item) => {
                const checked = checkedItems.includes(item)
                return (
                  <button className="flex w-full items-start gap-3 text-left" key={item} onClick={() => toggleChecklist(item)} type="button">
                    <span
                      style={{
                        alignItems: 'center',
                        background: checked ? technicianPalette.red : 'transparent',
                        border: checked ? 'none' : `1px solid ${technicianPalette.border}`,
                        borderRadius: 6,
                        color: 'white',
                        display: 'flex',
                        flexShrink: 0,
                        height: 22,
                        justifyContent: 'center',
                        marginTop: 2,
                        width: 22,
                      }}
                    >
                      {checked ? <CheckOutlined style={{ fontSize: 12 }} /> : null}
                    </span>
                    <span style={{ color: checked ? technicianPalette.ink : technicianPalette.textMuted, fontSize: 13, fontWeight: checked ? 700 : 600 }}>{item}</span>
                  </button>
                )
              })}
            </div>
          </Card>

          <Card bordered={false} className="rounded-[28px]" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow }} title="Step notes">
            <TextArea onChange={(event) => setNotes((current) => ({ ...current, [selectedStep.id]: event.target.value }))} rows={5} value={note} />
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Button icon={<ThunderboltOutlined />} onClick={() => persistStepStatus('active')}>
                Start
              </Button>
              <Button disabled={saving} icon={<CheckOutlined />} onClick={() => saveSelectedNote()} type="primary">
                Save
              </Button>
              <Button onClick={() => completeSelectedStep()}>Complete</Button>
            </div>
          </Card>
        </div>
      </div>
    </TechnicianShell>
  )
}
