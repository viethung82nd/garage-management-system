import { CheckCircleFilled } from '@ant-design/icons'
import { Card, Empty, Progress, Steps, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { fetchWorkshopRepairOrders, formatApiDate, orderId, personName, unwrapArray, vehicleName, vehiclePlate, type ApiRepairOrder } from '../../shared/api/workshop'
import { useAuth } from '../../shared/auth'
import { StatCard, advisorPalette } from '../../widgets/backoffice-shell'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

type TimelineStatus = 'done' | 'active' | 'blocked' | 'upcoming'
type Priority = 'high' | 'medium' | 'low'

type TimelineStage = {
  customerVisible: boolean
  description: string
  evidence: string
  id: string
  owner: string
  status: TimelineStatus
  time: string
  title: string
}

type RepairTimeline = {
  advisor: string
  customer: string
  id: string
  plate: string
  priority: Priority
  progress: number
  promisedAt: string
  statusText: string
  technician: string
  vehicle: string
  stages: TimelineStage[]
}

const statusLabels: Record<TimelineStatus, string> = {
  active: 'In progress',
  blocked: 'Blocked',
  done: 'Done',
  upcoming: 'Upcoming',
}

const statusColors: Record<TimelineStatus, string> = {
  active: 'red',
  blocked: 'gold',
  done: 'green',
  upcoming: 'default',
}

const stepStatus: Record<TimelineStatus, 'finish' | 'process' | 'error' | 'wait'> = {
  active: 'process',
  blocked: 'error',
  done: 'finish',
  upcoming: 'wait',
}

function mapOrderStatusText(status?: string) {
  if (status === 'completed') return 'Completed'
  if (status === 'inProgress' || status === 'in-progress') return 'In progress'
  if (status === 'cancelled') return 'Cancelled'
  return 'Pending'
}

function mapTimelineStatus(status?: string): TimelineStatus {
  if (status === 'completed') return 'done'
  if (status === 'inProgress' || status === 'in-progress') return 'active'
  if (status === 'cancelled' || status === 'blocked') return 'blocked'
  return 'upcoming'
}

function mapRepairTimeline(order: ApiRepairOrder, index: number): RepairTimeline {
  const vehicle = order.vehicleId || order.vehicle
  const technician = order.technicianId || order.technician
  const stageStatus = mapTimelineStatus(order.status)
  const notes = order.stepNotes || []
  const stages: TimelineStage[] = [
    {
      customerVisible: true,
      description: 'Repair order synced from the system.',
      evidence: orderId(order),
      id: 'created',
      owner: personName(order.advisorId || order.advisor, 'Service Advisor'),
      status: stageStatus === 'upcoming' ? 'active' : 'done',
      time: order.createdAt ? new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--',
      title: 'Repair order created',
    },
    ...notes.map((note, noteIndex) => ({
      customerVisible: true,
      description: note.content || 'Progress note from the technician.',
      evidence: 'Technician note',
      id: 'note-' + noteIndex,
      owner: personName(note.technicianId, 'Technician'),
      status: noteIndex === notes.length - 1 && stageStatus === 'active' ? 'active' : 'done',
      time: note.createdAt ? new Date(note.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--',
      title: 'Repair update',
    } satisfies TimelineStage)),
    {
      customerVisible: true,
      description: stageStatus === 'done' ? 'Order complete, ready for handover.' : 'Waiting for the next update from the shop.',
      evidence: formatApiDate(order.updatedAt),
      id: 'handover',
      owner: personName(technician, 'Technician'),
      status: stageStatus === 'done' ? 'done' : 'upcoming',
      time: order.completedAt ? new Date(order.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : order.promisedAt || '--:--',
      title: 'Completed & handed over',
    },
  ]

  const doneCount = stages.filter((stage) => stage.status === 'done').length

  return {
    advisor: personName(order.advisorId || order.advisor, 'Service Advisor'),
    customer: personName(order.customer || vehicle?.customerId || vehicle?.customer, 'Customer'),
    id: orderId(order),
    plate: vehiclePlate(vehicle),
    priority: index === 0 ? 'high' : 'medium',
    progress: Math.round((doneCount / stages.length) * 100),
    promisedAt: order.promisedAt || 'Not scheduled',
    statusText: mapOrderStatusText(order.status),
    technician: personName(technician, 'Unassigned'),
    vehicle: vehicleName(vehicle),
    stages,
  }
}

const priorityLabels: Record<Priority, string> = {
  high: 'Urgent',
  low: 'Normal',
  medium: 'Watch closely',
}

const priorityColors: Record<Priority, string> = {
  high: 'red',
  low: 'default',
  medium: 'gold',
}

function OrderCard({ active, onSelect, timeline }: { active: boolean; onSelect: () => void; timeline: RepairTimeline }) {
  const activeStage = timeline.stages.find((stage) => stage.status === 'active')
  const blockedStage = timeline.stages.find((stage) => stage.status === 'blocked')

  return (
    <button
      className="w-full rounded-[24px] p-5 text-left transition"
      onClick={onSelect}
      style={{
        background: active ? advisorPalette.panelAlt : advisorPalette.panel,
        border: active ? `2px solid ${advisorPalette.red}` : `1px solid ${advisorPalette.border}`,
        boxShadow: advisorPalette.shadow,
      }}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Tag color={priorityColors[timeline.priority]}>{priorityLabels[timeline.priority]}</Tag>
            <Tag>{timeline.statusText}</Tag>
          </div>
          <h3 style={{ color: advisorPalette.ink, fontSize: 16, fontWeight: 700, marginTop: 10 }}>{timeline.vehicle}</h3>
          <p style={{ color: advisorPalette.red, fontSize: 12, fontWeight: 700, marginTop: 4 }}>{timeline.id} - {timeline.plate}</p>
        </div>
        <div className="text-right">
          <p style={{ color: advisorPalette.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Promised</p>
          <p style={{ color: advisorPalette.ink, fontSize: 16, fontWeight: 700, marginTop: 6 }}>{timeline.promisedAt}</p>
        </div>
      </div>
      <Progress percent={timeline.progress} showInfo={false} strokeColor={advisorPalette.red} style={{ marginTop: 14 }} />
      <div className="mt-3 flex flex-wrap gap-2" style={{ color: advisorPalette.textMuted, fontSize: 12, fontWeight: 600 }}>
        <span style={{ background: advisorPalette.panelAlt, borderRadius: 10, padding: '4px 10px' }}>Customer: {timeline.customer}</span>
        <span style={{ background: advisorPalette.panelAlt, borderRadius: 10, padding: '4px 10px' }}>Tech: {timeline.technician}</span>
      </div>
      <p style={{ color: advisorPalette.textMuted, fontSize: 13, fontWeight: 600, marginTop: 10 }}>
        {blockedStage ? `Blocked at: ${blockedStage.title}` : activeStage ? `Current step: ${activeStage.title}` : 'No step currently in progress'}
      </p>
    </button>
  )
}

function StageDetail({ stage, timeline }: { stage: TimelineStage; timeline: RepairTimeline }) {
  return (
    <div className="flex flex-col gap-5" style={{ position: 'sticky', top: 96 }}>
      <Card bordered={false} className="rounded-[28px]" style={{ background: advisorPalette.ink, boxShadow: advisorPalette.shadow }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p style={{ color: '#ffb4ab', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Selected step</p>
            <h3 style={{ color: 'white', fontSize: 20, fontWeight: 700, marginTop: 10 }}>{stage.title}</h3>
          </div>
          <Tag color={statusColors[stage.status]}>{statusLabels[stage.status]}</Tag>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 12 }}>{stage.description}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14 }}>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Time</p>
            <p style={{ color: 'white', fontSize: 18, fontWeight: 700, marginTop: 6 }}>{stage.time}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14 }}>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Owner</p>
            <p style={{ color: 'white', fontSize: 18, fontWeight: 700, marginTop: 6 }}>{stage.owner}</p>
          </div>
        </div>
      </Card>

      <Card bordered={false} className="rounded-[28px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title="Things to watch">
        <div className="flex flex-col gap-3">
          <div style={{ background: advisorPalette.panelAlt, borderRadius: 16, padding: 14 }}>
            <p style={{ color: advisorPalette.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Customer</p>
            <p style={{ color: advisorPalette.ink, fontWeight: 700, marginTop: 6 }}>{timeline.customer}</p>
            <p style={{ color: advisorPalette.textMuted, fontSize: 13, marginTop: 2 }}>{timeline.vehicle} - {timeline.plate}</p>
          </div>
          <div style={{ background: advisorPalette.panelAlt, borderRadius: 16, padding: 14 }}>
            <p style={{ color: advisorPalette.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Evidence</p>
            <p style={{ color: advisorPalette.ink, fontSize: 13, fontWeight: 600, marginTop: 6 }}>{stage.evidence}</p>
          </div>
          <div style={{ background: advisorPalette.panelAlt, borderRadius: 16, padding: 14 }}>
            <p style={{ color: advisorPalette.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Visible to customer</p>
            <p style={{ alignItems: 'center', color: stage.customerVisible ? '#15803d' : advisorPalette.red, display: 'flex', fontWeight: 700, gap: 6, marginTop: 6 }}>
              {stage.customerVisible ? <CheckCircleFilled /> : null}
              {stage.customerVisible ? 'Yes, the customer can see this step' : 'No, shop-internal only'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

export function RepairProgressTimelinePage() {
  const { token } = useAuth()
  const [timelines, setTimelines] = useState<RepairTimeline[]>([])
  const [selectedTimelineId, setSelectedTimelineId] = useState('')
  const [selectedStageId, setSelectedStageId] = useState('')
  const [apiMessage, setApiMessage] = useState<string>()

  useEffect(() => {
    if (!token) return
    const authToken = token

    let cancelled = false

    async function loadTimelines() {
      setApiMessage(undefined)
      try {
        const response = await fetchWorkshopRepairOrders(authToken)
        const nextTimelines = unwrapArray<ApiRepairOrder>(response, ['repairOrders', 'orders']).map(mapRepairTimeline)
        if (!cancelled) {
          setTimelines(nextTimelines)
          const first = nextTimelines[0]
          setSelectedTimelineId((current) => current || first?.id || '')
          setSelectedStageId((current) => current || first?.stages.find((stage) => stage.status === 'active')?.id || first?.stages[0]?.id || '')
        }
      } catch (err) {
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Unable to load repair timelines from the API')
      }
    }

    void loadTimelines()

    return () => {
      cancelled = true
    }
  }, [token])

  const selectedTimeline = timelines.find((timeline) => timeline.id === selectedTimelineId) ?? timelines[0]
  const selectedStage = selectedTimeline?.stages.find((stage) => stage.id === selectedStageId) ?? selectedTimeline?.stages[0]
  const activeOrders = timelines.filter((timeline) => timeline.stages.some((stage) => stage.status === 'active')).length
  const blockedOrders = timelines.filter((timeline) => timeline.stages.some((stage) => stage.status === 'blocked')).length
  const customerVisibleStages = selectedTimeline?.stages.filter((stage) => stage.customerVisible).length ?? 0

  const nextCustomerUpdate = useMemo(() => {
    const active = selectedTimeline?.stages.find((stage) => stage.status === 'active')
    const blocked = selectedTimeline?.stages.find((stage) => stage.status === 'blocked')
    return blocked?.title ?? active?.title ?? 'No new update'
  }, [selectedTimeline])

  function selectTimeline(id: string) {
    const timeline = timelines.find((item) => item.id === id)
    if (!timeline) return

    setSelectedTimelineId(id)
    setSelectedStageId(timeline.stages.find((stage) => stage.status === 'active')?.id ?? timeline.stages[0]?.id ?? '')
  }

  return (
    <ServiceAdvisorShell title="Repair progress timeline">
      {apiMessage ? (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 18, color: '#991b1b', padding: '12px 16px' }}>
          {apiMessage}
        </div>
      ) : null}

      {!selectedTimeline || !selectedStage ? (
        <Card bordered={false} className="rounded-[28px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }}>
          <Empty description="No repair orders from the API to show a timeline for." />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            <StatCard label="Orders in progress" palette={advisorPalette} value={activeOrders} />
            <StatCard label="Orders blocked" palette={advisorPalette} value={blockedOrders} />
            <StatCard label="Needs update" palette={advisorPalette} value={nextCustomerUpdate} />
            <StatCard label="Steps visible to customer" palette={advisorPalette} value={`${customerVisibleStages}/${selectedTimeline.stages.length}`} />
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 lg:grid-cols-3">
                {timelines.map((timeline) => (
                  <OrderCard active={timeline.id === selectedTimeline.id} key={timeline.id} onSelect={() => selectTimeline(timeline.id)} timeline={timeline} />
                ))}
              </div>

              <Card bordered={false} className="rounded-[28px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title={`${selectedTimeline.id} — progress steps`}>
                <Steps
                  current={selectedTimeline.stages.findIndex((stage) => stage.id === selectedStage.id)}
                  items={selectedTimeline.stages.map((stage) => ({
                    description: (
                      <button className="text-left" onClick={() => setSelectedStageId(stage.id)} style={{ cursor: 'pointer' }} type="button">
                        <div style={{ color: advisorPalette.textMuted, fontSize: 12, fontWeight: 600 }}>{stage.time} · {stage.description}</div>
                      </button>
                    ),
                    status: stepStatus[stage.status],
                    title: stage.title,
                  }))}
                  onChange={(index) => setSelectedStageId(selectedTimeline.stages[index]?.id ?? selectedStageId)}
                />
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                <Card bordered={false} className="rounded-[24px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }}>
                  <p style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Advisor</p>
                  <p style={{ color: advisorPalette.ink, fontSize: 16, fontWeight: 700, marginTop: 8 }}>{selectedTimeline.advisor}</p>
                </Card>
                <Card bordered={false} className="rounded-[24px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }}>
                  <p style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Technician</p>
                  <p style={{ color: advisorPalette.ink, fontSize: 16, fontWeight: 700, marginTop: 8 }}>{selectedTimeline.technician}</p>
                </Card>
                <Card bordered={false} className="rounded-[24px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }}>
                  <p style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Status</p>
                  <p style={{ color: advisorPalette.red, fontSize: 16, fontWeight: 700, marginTop: 8 }}>{selectedTimeline.statusText}</p>
                </Card>
              </div>
            </div>

            <StageDetail stage={selectedStage} timeline={selectedTimeline} />
          </div>
        </>
      )}
    </ServiceAdvisorShell>
  )
}
