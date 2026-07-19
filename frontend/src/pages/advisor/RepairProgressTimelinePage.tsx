import { CheckCircleFilled } from '@ant-design/icons'
import { Avatar, Card, Empty, Progress, Select, Steps, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchWorkshopRepairOrders, formatApiDate, orderId, personName, unwrapArray, vehicleName, vehiclePlate, type ApiRepairOrder } from '../../shared/api/workshop'
import { getUserInitials, useAuth } from '../../shared/auth'
import { InlineBanner, StatCard, advisorPalette } from '../../widgets/backoffice-shell'
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
  code: string
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
    code: orderId(order),
    customer: personName(order.customer || vehicle?.customerId || vehicle?.customer, 'Customer'),
    id: order._id || order.id || crypto.randomUUID(),
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

function StageDetail({ stage, timeline }: { stage: TimelineStage; timeline: RepairTimeline }) {
  return (
    <div className="flex flex-col gap-5" style={{ position: 'sticky', top: 96 }}>
      <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.ink, boxShadow: advisorPalette.shadow }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p style={{ color: '#ffb4ab', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Selected step</p>
            <h3 style={{ color: 'white', fontSize: 20, fontWeight: 700, marginTop: 10 }}>{stage.title}</h3>
          </div>
          <Tag color={statusColors[stage.status]}>{statusLabels[stage.status]}</Tag>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 12 }}>{stage.description}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 12 }}>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Time</p>
            <p style={{ color: 'white', fontSize: 16, fontWeight: 700, marginTop: 4 }}>{stage.time}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 12 }}>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Owner</p>
            <p style={{ color: 'white', fontSize: 16, fontWeight: 700, marginTop: 4 }}>{stage.owner}</p>
          </div>
        </div>
      </Card>

      <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }} title="Things to watch">
        <div className="flex flex-col gap-3">
          <div style={{ alignItems: 'center', background: advisorPalette.panelAlt, borderRadius: 14, display: 'flex', gap: 10, justifyContent: 'space-between', padding: 12 }}>
            <span style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Customer</span>
            <span style={{ color: advisorPalette.ink, fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{timeline.customer} · {timeline.vehicle} - {timeline.plate}</span>
          </div>
          <div style={{ alignItems: 'center', background: advisorPalette.panelAlt, borderRadius: 14, display: 'flex', gap: 10, justifyContent: 'space-between', padding: 12 }}>
            <span style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Evidence</span>
            <span style={{ color: advisorPalette.ink, fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{stage.evidence}</span>
          </div>
          <div style={{ alignItems: 'center', background: advisorPalette.panelAlt, borderRadius: 14, display: 'flex', gap: 10, justifyContent: 'space-between', padding: 12 }}>
            <span style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Visible to customer</span>
            <span style={{ alignItems: 'center', color: stage.customerVisible ? '#15803d' : advisorPalette.red, display: 'flex', fontWeight: 700, fontSize: 13, gap: 6 }}>
              {stage.customerVisible ? <CheckCircleFilled /> : null}
              {stage.customerVisible ? 'Yes' : 'Internal only'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}

export function RepairProgressTimelinePage() {
  const { token } = useAuth()
  const [searchParams] = useSearchParams()
  const orderIdParam = searchParams.get('orderId') ?? ''
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
          const preselected = orderIdParam ? nextTimelines.find((timeline) => timeline.id === orderIdParam) : undefined
          setSelectedTimelineId((current) => current || preselected?.id || '')
          setSelectedStageId((current) => current || preselected?.stages.find((stage) => stage.status === 'active')?.id || preselected?.stages[0]?.id || '')
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

  const selectedTimeline = timelines.find((timeline) => timeline.id === selectedTimelineId)
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
      {apiMessage ? <InlineBanner tone="error">{apiMessage}</InlineBanner> : null}

      {!selectedTimeline || !selectedStage ? (
        <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}>
          {timelines.length ? (
            <>
              <Select
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                onChange={selectTimeline}
                options={timelines.map((timeline) => ({ label: `${timeline.code} — ${timeline.vehicle} (${timeline.plate})`, value: timeline.id }))}
                placeholder="Select a repair order to view its timeline"
                showSearch
                style={{ width: '100%', maxWidth: 420 }}
              />
              <p style={{ color: advisorPalette.textMuted, fontSize: 13, marginTop: 12 }}>Select an order above to see its progress timeline.</p>
            </>
          ) : (
            <Empty description="No repair orders from the API to show a timeline for." />
          )}
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            <StatCard label="Orders in progress" palette={advisorPalette} value={activeOrders} />
            <StatCard label="Orders blocked" palette={advisorPalette} value={blockedOrders} />
            <StatCard label="Needs update" palette={advisorPalette} value={nextCustomerUpdate} />
            <StatCard label="Steps visible to customer" palette={advisorPalette} value={`${customerVisibleStages}/${selectedTimeline.stages.length}`} />
          </div>

          <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }} styles={{ body: { padding: 18 } }}>
            <div className="flex flex-wrap items-center gap-4">
              <Select
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                onChange={selectTimeline}
                options={timelines.map((timeline) => ({ label: `${timeline.code} — ${timeline.vehicle} (${timeline.plate})`, value: timeline.id }))}
                showSearch
                style={{ minWidth: 320 }}
                value={selectedTimeline.id}
              />
              <Tag color={priorityColors[selectedTimeline.priority]}>{priorityLabels[selectedTimeline.priority]}</Tag>
              <Tag>{selectedTimeline.statusText}</Tag>
              <div className="flex items-center gap-2" style={{ flex: '1 1 200px', minWidth: 160 }}>
                <Progress percent={selectedTimeline.progress} showInfo={false} strokeColor={advisorPalette.red} style={{ flex: 1 }} />
                <span style={{ color: advisorPalette.ink, fontSize: 13, fontWeight: 700 }}>{selectedTimeline.progress}%</span>
              </div>
              <span style={{ color: advisorPalette.textMuted, fontSize: 13, fontWeight: 600 }}>Promised: {selectedTimeline.promisedAt}</span>
            </div>
          </Card>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex flex-col gap-5">
              <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }} title={`${selectedTimeline.code} — progress steps`}>
                <Steps
                  current={selectedTimeline.stages.findIndex((stage) => stage.id === selectedStage.id)}
                  items={selectedTimeline.stages.map((stage) => ({
                    description: (
                      <button
                        onClick={() => setSelectedStageId(stage.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: stage.id === selectedStage.id ? advisorPalette.ink : advisorPalette.textMuted,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: stage.id === selectedStage.id ? 700 : 600,
                          padding: 0,
                          textAlign: 'left',
                        }}
                        type="button"
                      >
                        {stage.time} · {stage.description}
                      </button>
                    ),
                    status: stepStatus[stage.status],
                    title: stage.title,
                  }))}
                  onChange={(index) => setSelectedStageId(selectedTimeline.stages[index]?.id ?? selectedStageId)}
                />
              </Card>

              <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }} styles={{ body: { padding: 18 } }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 32, rowGap: 12 }}>
                  <div>
                    <p style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Advisor</p>
                    <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                      <Avatar size={22} style={{ background: advisorPalette.ink }}>{getUserInitials(selectedTimeline.advisor)}</Avatar>
                      <p style={{ color: advisorPalette.ink, fontSize: 15, fontWeight: 700 }}>{selectedTimeline.advisor}</p>
                    </div>
                  </div>
                  <div>
                    <p style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Technician</p>
                    <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                      <Avatar size={22} style={{ background: advisorPalette.red }}>{getUserInitials(selectedTimeline.technician)}</Avatar>
                      <p style={{ color: advisorPalette.ink, fontSize: 15, fontWeight: 700 }}>{selectedTimeline.technician}</p>
                    </div>
                  </div>
                  <div>
                    <p style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Status</p>
                    <p style={{ color: advisorPalette.red, fontSize: 15, fontWeight: 700, marginTop: 4 }}>{selectedTimeline.statusText}</p>
                  </div>
                </div>
              </Card>
            </div>

            <StageDetail stage={selectedStage} timeline={selectedTimeline} />
          </div>
        </>
      )}
    </ServiceAdvisorShell>
  )
}
