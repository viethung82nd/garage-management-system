import { ArrowLeftOutlined, CheckOutlined, InboxOutlined, PictureOutlined, PlusOutlined, SwapOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Button, Card, Empty, Image, Input, InputNumber, Popconfirm, Select, Steps, Tag, Upload } from 'antd'
import type { UploadFile } from 'antd/es/upload/interface'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../shared/auth'
import { resolveApiAssetUrl } from '../../shared/lib/api-client'
import {
  addWorkshopStepNote,
  createAdditionalServiceProposal,
  createTransferRequestApi,
  fetchInspectionReports,
  fetchWorkshopRepairOrderById,
  fetchWorkshopRepairOrders,
  fetchWorkshopServices,
  fetchWorkshopTechnicians,
  issueWorkshopRepairOrderParts,
  orderId,
  personName,
  unwrapArray,
  updateWorkshopRepairProgress,
  vehicleName,
  vehiclePlate,
  type ApiInspectionReport,
  type ApiRepairOrder,
  type ApiService,
} from '../../shared/api/workshop'
import { InlineBanner, useApiMessage } from '../../widgets/backoffice-shell'
import { TechnicianShell, technicianPalette } from '../../widgets/technician-shell'

const { TextArea } = Input

type RepairStepStatus = 'completed' | 'active' | 'waiting'

type RepairStep = {
  stepIndex: number
  estimate: string
  status: RepairStepStatus
  summary: string
  photos: string[]
  title: string
  isPart: boolean
  cause: string
  correction: string
}

function mapRepairSteps(order: ApiRepairOrder): RepairStep[] {
  const services = order.services || []
  const notes = order.stepNotes || []
  const orderCompleted = order.status === 'completed'

  return services.map((service, index) => {
    const apiService = typeof service.serviceId === 'object' ? service.serviceId : undefined
    const latestNote = [...notes].reverse().find((note) => note.stepIndex === index)
    const status: RepairStepStatus =
      orderCompleted || service.status === 'completed' ? 'completed' : service.status === 'inProgress' ? 'active' : 'waiting'

    return {
      estimate: `${apiService?.estimatedDuration || 45} min`,
      status,
      stepIndex: index,
      summary: latestNote?.content || '',
      photos: latestNote?.photos || [],
      title: apiService?.name || service.name || 'Repair item',
      // Part lines (kind === 'part') are physical stock, not labor — kept in
      // their own list so the technician isn't hunting for them in a flat
      // mix of service/labor rows.
      isPart: service.kind === 'part',
      cause: service.cause || '',
      correction: service.correction || '',
    }
  })
}

const stepTag: Record<RepairStepStatus, { label: string; color: string }> = {
  active: { label: 'In progress', color: 'red' },
  completed: { label: 'Completed', color: 'success' },
  waiting: { label: 'Not started', color: 'default' },
}

const antStepStatus: Record<RepairStepStatus, 'finish' | 'process' | 'wait'> = {
  active: 'process',
  completed: 'finish',
  waiting: 'wait',
}

function extractOrder(response: { order?: ApiRepairOrder } | ApiRepairOrder): ApiRepairOrder | undefined {
  return response && typeof response === 'object' && 'order' in response && response.order ? response.order : (response as ApiRepairOrder)
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: technicianPalette.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6, textTransform: 'uppercase' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

/** Read-only recap of the mandatory 3C record (Cause/Correction) once a step
 * is complete — otherwise it's captured on completion and never shown again,
 * to the technician or anyone reviewing the order afterwards. */
function CauseCorrection({ cause, correction }: { cause: string; correction: string }) {
  if (!cause && !correction) return null
  return (
    <div className="flex flex-col gap-3">
      {cause ? (
        <div>
          <div style={{ color: technicianPalette.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>Cause</div>
          <p style={{ color: technicianPalette.inkSoft, fontSize: 13, margin: 0 }}>{cause}</p>
        </div>
      ) : null}
      {correction ? (
        <div>
          <div style={{ color: technicianPalette.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>Correction</div>
          <p style={{ color: technicianPalette.inkSoft, fontSize: 13, margin: 0 }}>{correction}</p>
        </div>
      ) : null}
    </div>
  )
}

/** One labeled vertical Steps list — used twice (services, parts) so the two
 * kinds never sit interleaved in a single flat list. */
function StepGroup({
  label,
  steps,
  selectedStepIndex,
  onSelect,
}: {
  label: string
  steps: RepairStep[]
  selectedStepIndex: number | null
  onSelect: (stepIndex: number) => void
}) {
  if (!steps.length) return null
  return (
    <div>
      <div style={{ color: technicianPalette.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>
        {label} ({steps.length})
      </div>
      <Steps
        current={steps.findIndex((step) => step.stepIndex === selectedStepIndex)}
        direction="vertical"
        items={steps.map((step) => ({
          description: (
            <span style={{ color: technicianPalette.textMuted, fontSize: 12 }}>
              {step.summary || `${step.estimate} · ${stepTag[step.status].label.toLowerCase()}`}
            </span>
          ),
          status: antStepStatus[step.status],
          title: <span style={{ color: technicianPalette.ink, fontWeight: step.stepIndex === selectedStepIndex ? 700 : 600 }}>{step.title}</span>,
        }))}
        onChange={(index) => {
          const target = steps[index]
          if (target) onSelect(target.stepIndex)
        }}
      />
    </div>
  )
}

export function TechnicianRepairNotesPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderIdParam = searchParams.get('orderId') ?? ''

  const [repairOrder, setRepairOrder] = useState<ApiRepairOrder>()
  const [inspection, setInspection] = useState<ApiInspectionReport | null>(null)
  const [assignedCount, setAssignedCount] = useState<number | null>(null)
  const [steps, setSteps] = useState<RepairStep[]>([])
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [stepPhotos, setStepPhotos] = useState<UploadFile[]>([])
  // 3C (Cause/Correction — the step itself is the Complaint) — the backend
  // now refuses to mark a step complete without both on record.
  const [cause, setCause] = useState('')
  const [correction, setCorrection] = useState('')
  const [causeErrors, setCauseErrors] = useState<Record<string, string>>({})
  const [previewImage, setPreviewImage] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const { message: apiMessage, tone: apiTone, showError, showSuccess, clear: clearApiMessage } = useApiMessage()
  const [saving, setSaving] = useState(false)

  // Secondary: additional-service proposal
  const [proposalOpen, setProposalOpen] = useState(false)
  const [services, setServices] = useState<ApiService[]>([])
  const [proposalServiceId, setProposalServiceId] = useState('')
  const [proposalServiceName, setProposalServiceName] = useState('')
  const [proposalAffectedPart, setProposalAffectedPart] = useState('')
  const [proposalReason, setProposalReason] = useState('')
  const [proposalEstimateMinutes, setProposalEstimateMinutes] = useState(30)
  const [proposalPriority, setProposalPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [proposalPhotos, setProposalPhotos] = useState<UploadFile[]>([])
  const [proposalErrors, setProposalErrors] = useState<Record<string, string>>({})
  const [submittingProposal, setSubmittingProposal] = useState(false)

  // Secondary: issue parts
  const [issuingParts, setIssuingParts] = useState(false)

  // Secondary: transfer
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferReason, setTransferReason] = useState('')
  const [transferErrors, setTransferErrors] = useState<Record<string, string>>({})
  const [requestingTransfer, setRequestingTransfer] = useState(false)

  // No ?orderId= — auto-open a lone assigned order, otherwise send the
  // technician to their work-orders list to pick one (no duplicate picker).
  useEffect(() => {
    if (!token || orderIdParam) return
    const authToken = token
    let cancelled = false

    async function loadAssigned() {
      try {
        const userId = user?._id || user?.id
        const response = await fetchWorkshopRepairOrders(authToken, userId ? '?technicianId=' + encodeURIComponent(userId) : '')
        const list = unwrapArray<ApiRepairOrder>(response, ['repairOrders', 'orders'])
        if (cancelled) return
        if (list.length === 1) {
          const onlyId = list[0]._id || list[0].id
          if (onlyId) {
            navigate(`/technician/repair-notes?orderId=${onlyId}`, { replace: true })
            return
          }
        }
        setAssignedCount(list.length)
      } catch {
        if (!cancelled) setAssignedCount(0)
      }
    }

    void loadAssigned()
    return () => {
      cancelled = true
    }
  }, [token, orderIdParam, user?._id, user?.id])

  useEffect(() => {
    if (!token || !orderIdParam) {
      setRepairOrder(undefined)
      setSteps([])
      setInspection(null)
      return
    }
    const authToken = token
    let cancelled = false

    async function loadRepairOrder() {
      clearApiMessage()
      try {
        const order = await fetchWorkshopRepairOrderById(authToken, orderIdParam)
        if (cancelled) return
        const nextSteps = mapRepairSteps(order)
        setRepairOrder(order)
        setSteps(nextSteps)
        setSelectedStepIndex(nextSteps.find((step) => step.status === 'active')?.stepIndex ?? nextSteps.find((step) => step.status === 'waiting')?.stepIndex ?? nextSteps[0]?.stepIndex ?? null)
        setNote('')

        // Pull the advisor's inspection so the technician sees the vehicle
        // photos, findings and flagged repair points they're inheriting —
        // that handoff is the useful context here, not a re-typed customer line.
        try {
          const reportResponse = await fetchInspectionReports(authToken, `?repairOrderId=${orderIdParam}`)
          if (!cancelled) setInspection(unwrapArray<ApiInspectionReport>(reportResponse, ['inspectionReports'])[0] ?? null)
        } catch {
          if (!cancelled) setInspection(null)
        }
      } catch (err) {
        if (!cancelled) showError(err instanceof Error ? err.message : 'Unable to load repair progress from the API')
      }
    }

    void loadRepairOrder()
    return () => {
      cancelled = true
    }
  }, [token, orderIdParam])

  // Service catalog for the extra-work picker — only fetched when the panel opens.
  useEffect(() => {
    if (!token || !proposalOpen || services.length) return
    const authToken = token
    let cancelled = false
    void (async () => {
      try {
        const catalog = await fetchWorkshopServices(authToken)
        if (!cancelled) setServices(Array.isArray(catalog) ? catalog : [])
      } catch {
        /* best-effort */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, proposalOpen, services.length])

  const selectedStep = steps.find((step) => step.stepIndex === selectedStepIndex)
  const serviceSteps = steps.filter((step) => !step.isPart)
  const partSteps = steps.filter((step) => step.isPart)
  const hasPartLines = partSteps.length > 0
  const completedCount = steps.filter((step) => step.status === 'completed').length
  const progressPct = steps.length ? Math.round((completedCount / steps.length) * 100) : 0
  const vehicle = repairOrder?.vehicleId || repairOrder?.vehicle
  const repairOrderLabel = repairOrder ? orderId(repairOrder) : ''
  const vehicleTitle = repairOrder ? `${vehicleName(vehicle)} · ${vehiclePlate(vehicle)}` : 'Repair progress'
  const customerName = repairOrder ? personName(repairOrder.customer || vehicle?.customerId || vehicle?.customer, 'Customer') : ''
  const orderIsTerminal = repairOrder?.status === 'completed' || repairOrder?.status === 'cancelled'
  const orderNeedsRework = repairOrder?.status === 'reworkRequired'
  const reworkReason = useMemo(
    () => (orderNeedsRework ? [...(repairOrder?.stepNotes || [])].reverse().find((entry) => entry.stepIndex === undefined)?.content : undefined),
    [orderNeedsRework, repairOrder?.stepNotes],
  )
  const orderProgressActive = repairOrder?.status === 'inProgress' || orderNeedsRework

  const inspectionPhotos = inspection?.photos ?? []
  const inspectionRepairItems = (inspection?.items ?? []).filter((item) => item.status === 'repair')
  const inspectionRecommended = inspection?.recommendedServices ?? []
  const hasInspection = Boolean(inspection && (inspectionPhotos.length || inspection.findings || inspectionRepairItems.length || inspectionRecommended.length))

  function selectStep(index: number) {
    setSelectedStepIndex(index)
    setNote('')
    setStepPhotos([])
    setCause('')
    setCorrection('')
    setCauseErrors({})
  }

  function applyUpdatedOrder(updated: ApiRepairOrder | undefined, advanceFrom?: number) {
    if (!updated) return
    const nextSteps = mapRepairSteps(updated)
    setRepairOrder(updated)
    setSteps(nextSteps)
    if (advanceFrom !== undefined) {
      const next = nextSteps.find((step) => step.stepIndex > advanceFrom && step.status !== 'completed')
      if (next) setSelectedStepIndex(next.stepIndex)
    }
  }

  async function startStep() {
    const repairOrderId = repairOrder?._id || repairOrder?.id
    if (!repairOrderId || !selectedStep || !token) return
    setSaving(true)
    clearApiMessage()
    try {
      const response = await updateWorkshopRepairProgress(token, repairOrderId, { status: 'inProgress', stepIndex: selectedStep.stepIndex })
      applyUpdatedOrder(extractOrder(response))
      showSuccess('Step started — record what you do, then mark it complete.')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to start this step')
    } finally {
      setSaving(false)
    }
  }

  async function completeStep() {
    const repairOrderId = repairOrder?._id || repairOrder?.id
    if (!repairOrderId || !selectedStep || !token) return

    const errors: Record<string, string> = {}
    if (!cause.trim()) errors.cause = 'Record what caused the problem.'
    if (!correction.trim()) errors.correction = 'Record what you actually did to fix it.'
    setCauseErrors(errors)
    if (Object.keys(errors).length) return

    setSaving(true)
    clearApiMessage()
    try {
      if (note.trim() || stepPhotos.length) {
        await addWorkshopStepNote(token, repairOrderId, {
          content: note.trim() || 'Step completed.',
          stepIndex: selectedStep.stepIndex,
          photos: stepPhotos.map((file) => file.originFileObj as File).filter(Boolean),
        })
      }
      const response = await updateWorkshopRepairProgress(token, repairOrderId, {
        status: 'completed',
        stepIndex: selectedStep.stepIndex,
        cause: cause.trim(),
        correction: correction.trim(),
      })
      applyUpdatedOrder(extractOrder(response), selectedStep.stepIndex)
      setNote('')
      setStepPhotos([])
      setCause('')
      setCorrection('')
      showSuccess('Step completed.')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to complete this step')
    } finally {
      setSaving(false)
    }
  }

  async function saveNoteOnly() {
    const repairOrderId = repairOrder?._id || repairOrder?.id
    if (!repairOrderId || !selectedStep || !token) return
    if (!note.trim() && !stepPhotos.length) {
      showError('Write a note or attach a photo before saving.')
      return
    }
    setSaving(true)
    clearApiMessage()
    try {
      const response = await addWorkshopStepNote(token, repairOrderId, {
        content: note.trim() || 'Photo attached.',
        stepIndex: selectedStep.stepIndex,
        photos: stepPhotos.map((file) => file.originFileObj as File).filter(Boolean),
      })
      if (response.stepNotes) {
        setRepairOrder((current) => {
          if (!current) return current
          const updated = { ...current, stepNotes: response.stepNotes }
          setSteps(mapRepairSteps(updated))
          return updated
        })
      }
      setNote('')
      setStepPhotos([])
      showSuccess('Note saved.')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to save the note')
    } finally {
      setSaving(false)
    }
  }

  async function reopenStep() {
    const repairOrderId = repairOrder?._id || repairOrder?.id
    if (!repairOrderId || !selectedStep || !token) return
    setSaving(true)
    clearApiMessage()
    try {
      const response = await updateWorkshopRepairProgress(token, repairOrderId, { status: 'inProgress', stepIndex: selectedStep.stepIndex })
      applyUpdatedOrder(extractOrder(response))
      showSuccess('Step reopened.')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to reopen this step')
    } finally {
      setSaving(false)
    }
  }

  function validateProposal() {
    const errors: Record<string, string> = {}
    if (!proposalServiceName.trim()) errors.serviceName = 'Service name is required.'
    if (!proposalReason.trim()) errors.reason = 'Explain why this work is needed.'
    if (proposalEstimateMinutes < 1) errors.estimate = 'Estimate must be at least 1 minute.'
    return errors
  }

  async function submitProposal() {
    const repairOrderId = repairOrder?._id || repairOrder?.id
    if (!repairOrderId || !token) return
    const errors = validateProposal()
    setProposalErrors(errors)
    if (Object.keys(errors).length) return

    setSubmittingProposal(true)
    clearApiMessage()
    try {
      // No cost fields here on purpose — pricing extra work is the service
      // advisor's call, not the technician's; see AdditionalServiceSuggestionPage.
      await createAdditionalServiceProposal(token, {
        affectedPart: proposalAffectedPart.trim() || undefined,
        estimateMinutes: proposalEstimateMinutes,
        photos: proposalPhotos.map((file) => file.originFileObj as File).filter(Boolean),
        priority: proposalPriority,
        reason: proposalReason.trim(),
        repairOrderId,
        serviceId: proposalServiceId || undefined,
        serviceName: proposalServiceName.trim(),
      })
      showSuccess("Additional service proposal sent to the service advisor. This order is now waiting on the customer's decision.")
      setProposalOpen(false)
      setProposalServiceId('')
      setProposalServiceName('')
      setProposalAffectedPart('')
      setProposalReason('')
      setProposalEstimateMinutes(30)
      setProposalPriority('medium')
      setProposalPhotos([])
      setProposalErrors({})
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to submit the additional service proposal')
    } finally {
      setSubmittingProposal(false)
    }
  }

  async function issueParts() {
    const repairOrderId = repairOrder?._id || repairOrder?.id
    if (!repairOrderId || !token) return
    setIssuingParts(true)
    clearApiMessage()
    try {
      const result = await issueWorkshopRepairOrderParts(token, repairOrderId)
      showSuccess(result.message || 'Parts issued.')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to issue parts for this order')
    } finally {
      setIssuingParts(false)
    }
  }

  async function submitTransfer() {
    const repairOrderId = repairOrder?._id || repairOrder?.id
    if (!repairOrderId || !token) return
    const errors: Record<string, string> = {}
    if (!transferReason.trim()) errors.reason = 'Give a reason for the transfer.'
    setTransferErrors(errors)
    if (Object.keys(errors).length) return

    setRequestingTransfer(true)
    clearApiMessage()
    try {
      await createTransferRequestApi(token, { reason: transferReason.trim(), repairOrderId })
      showSuccess('Transfer request sent to the service advisor.')
      setTransferOpen(false)
      setTransferReason('')
      setTransferErrors({})
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to submit the transfer request')
    } finally {
      setRequestingTransfer(false)
    }
  }

  const fieldError = (message?: string) => (message ? <div style={{ color: technicianPalette.red, fontSize: 12, marginTop: 4 }}>{message}</div> : null)

  // No order in context: prompt to pick one from the list rather than
  // duplicating the whole work-orders list here.
  if (!orderIdParam) {
    return (
      <TechnicianShell eyebrow="Technician Repair Progress" title="Repair progress">
        <Card bordered={false} className="bo-enter rounded-2xl" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, border: `1px solid ${technicianPalette.border}` }}>
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <p style={{ color: technicianPalette.textMuted, fontSize: 14, maxWidth: 360 }}>
              {assignedCount === 0 ? 'You have no repair orders assigned right now.' : 'Pick a repair order from your work orders to start working on its steps.'}
            </p>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/technician/work-orders')} type="primary">
              Go to my work orders
            </Button>
          </div>
        </Card>
      </TechnicianShell>
    )
  }

  return (
    <TechnicianShell eyebrow="Technician Repair Progress" title={vehicleTitle}>
      {apiMessage ? <InlineBanner tone={apiTone}>{apiMessage}</InlineBanner> : null}

      {!repairOrder ? (
        <Card bordered={false} className="bo-enter rounded-2xl" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, border: `1px solid ${technicianPalette.border}` }}>
          <Empty description="Loading repair order..." image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      ) : (
        <>
          {/* Compact header */}
          <Card bordered={false} className="bo-enter rounded-2xl" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, border: `1px solid ${technicianPalette.border}` }} styles={{ body: { padding: 20 } }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <button
                  onClick={() => navigate('/technician/work-orders')}
                  style={{ alignItems: 'center', background: 'none', border: 'none', color: technicianPalette.textMuted, cursor: 'pointer', display: 'inline-flex', fontSize: 12, fontWeight: 700, gap: 6, padding: 0 }}
                  type="button"
                >
                  <ArrowLeftOutlined /> Work orders
                </button>
                <div style={{ color: technicianPalette.ink, fontSize: 18, fontWeight: 700, marginTop: 6 }}>{repairOrderLabel}</div>
                <div style={{ color: technicianPalette.textMuted, fontSize: 13, marginTop: 2 }}>Customer · {customerName}</div>
              </div>
              <div className="text-right">
                <div style={{ color: technicianPalette.ink, fontSize: 22, fontWeight: 700 }}>{completedCount}/{steps.length}</div>
                <div style={{ color: technicianPalette.textMuted, fontSize: 12, fontWeight: 600 }}>steps done</div>
              </div>
            </div>
            <div className="mt-4" style={{ background: technicianPalette.panelAlt, borderRadius: 999, height: 8, overflow: 'hidden' }}>
              <div style={{ background: orderProgressActive ? technicianPalette.red : technicianPalette.ink, borderRadius: 999, height: '100%', transition: 'width 0.4s ease', width: `${progressPct}%` }} />
            </div>
          </Card>

          {orderNeedsRework ? (
            <InlineBanner tone="error">
              Quality check sent this order back{reworkReason ? `: ${reworkReason}` : '.'} Reopen the affected step, fix it, and mark it complete again.
            </InlineBanner>
          ) : null}

          {orderIsTerminal ? (
            <InlineBanner tone="success">This order is {repairOrder.status === 'completed' ? 'completed' : 'cancelled'} — its steps can no longer be changed.</InlineBanner>
          ) : null}

          <div className="grid items-start gap-5 *:min-w-0 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="flex flex-col gap-5">
              {/* Steps */}
              <Card bordered={false} className="bo-enter rounded-2xl" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, border: `1px solid ${technicianPalette.border}` }} title="Repair steps">
                {steps.length && selectedStep ? (
                  <div className="flex flex-col gap-5">
                    <StepGroup label="Services" steps={serviceSteps} selectedStepIndex={selectedStepIndex} onSelect={selectStep} />
                    {serviceSteps.length && partSteps.length ? <div style={{ borderTop: `1px solid ${technicianPalette.border}` }} /> : null}
                    <StepGroup label="Parts" steps={partSteps} selectedStepIndex={selectedStepIndex} onSelect={selectStep} />
                  </div>
                ) : (
                  <Empty description="No repair steps on this order." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>

              {/* Advisor inspection handoff — the context the technician inherits from the SA */}
              <Card
                bordered={false}
                className="bo-enter rounded-2xl"
                extra={inspection?.inspectedAt ? <span style={{ color: technicianPalette.textMuted, fontSize: 12 }}>{new Date(inspection.inspectedAt).toLocaleDateString('en-GB')}</span> : null}
                style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, border: `1px solid ${technicianPalette.border}` }}
                title="Advisor inspection"
              >
                {hasInspection ? (
                  <div className="flex flex-col gap-4">
                    {inspectionPhotos.length ? (
                      <div>
                        <div className="flex items-center gap-2" style={{ color: technicianPalette.textMuted, fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
                          <PictureOutlined /> Vehicle photos
                        </div>
                        <Image.PreviewGroup>
                          <div className="flex flex-wrap gap-2">
                            {inspectionPhotos.map((url, index) => (
                              <Image
                                key={`${url}-${index}`}
                                src={resolveApiAssetUrl(url)}
                                width={76}
                                height={76}
                                style={{ borderRadius: 10, objectFit: 'cover' }}
                              />
                            ))}
                          </div>
                        </Image.PreviewGroup>
                      </div>
                    ) : null}

                    {inspection?.findings ? (
                      <div>
                        <div style={{ color: technicianPalette.textMuted, fontSize: 12, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Findings</div>
                        <p style={{ color: technicianPalette.inkSoft, fontSize: 14, margin: 0, whiteSpace: 'pre-line' }}>{inspection.findings}</p>
                      </div>
                    ) : null}

                    {inspectionRepairItems.length ? (
                      <div>
                        <div style={{ color: technicianPalette.textMuted, fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Flagged for repair</div>
                        <div className="flex flex-col gap-2">
                          {inspectionRepairItems.map((item, index) => (
                            <div key={`${item.label}-${index}`} style={{ background: technicianPalette.panelAlt, borderRadius: 12, padding: '10px 12px' }}>
                              <div style={{ color: technicianPalette.ink, fontSize: 14, fontWeight: 600 }}>
                                {item.label}
                                {item.category ? <span style={{ color: technicianPalette.textMuted, fontWeight: 500 }}> · {item.category}</span> : null}
                              </div>
                              {item.note ? <div style={{ color: technicianPalette.textMuted, fontSize: 13, marginTop: 2 }}>{item.note}</div> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : inspectionRecommended.length ? (
                      <div>
                        <div style={{ color: technicianPalette.textMuted, fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Recommended work</div>
                        <div className="flex flex-wrap gap-2">
                          {inspectionRecommended.map((service, index) => (
                            <Tag key={`${service.name}-${index}`}>{service.name}</Tag>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {inspection?.odometer || inspection?.fuelLevel ? (
                      <div className="flex flex-wrap gap-4" style={{ borderTop: `1px solid ${technicianPalette.border}`, paddingTop: 12 }}>
                        {inspection.odometer ? (
                          <span style={{ color: technicianPalette.textMuted, fontSize: 13 }}>Odometer · <strong style={{ color: technicianPalette.ink }}>{inspection.odometer.toLocaleString('en-US')} km</strong></span>
                        ) : null}
                        {inspection.fuelLevel ? (
                          <span style={{ color: technicianPalette.textMuted, fontSize: 13 }}>Fuel · <strong style={{ color: technicianPalette.ink }}>{inspection.fuelLevel}</strong></span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <Empty
                    description={repairOrder.issueDescription ? `Reason for visit: ${repairOrder.issueDescription}` : 'No inspection report was attached to this order.'}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </Card>
            </div>

            {/* Focused work panel — the primary action lives here */}
            {selectedStep ? (
              <Card bordered={false} className="bo-enter rounded-2xl" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, border: `1px solid ${technicianPalette.border}`, position: 'sticky', top: 96 }} styles={{ body: { padding: 22 } }}>
                <div style={{ color: technicianPalette.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Step {selectedStep.stepIndex + 1} of {steps.length}
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <h3 style={{ color: technicianPalette.ink, fontSize: 20, fontWeight: 700 }}>{selectedStep.title}</h3>
                  <Tag color={stepTag[selectedStep.status].color} style={{ marginRight: 0 }}>{stepTag[selectedStep.status].label}</Tag>
                </div>

                {orderIsTerminal ? (
                  <div className="mt-4 flex flex-col gap-3">
                    <CauseCorrection cause={selectedStep.cause} correction={selectedStep.correction} />
                    <div style={{ background: technicianPalette.panelAlt, borderRadius: 12, color: technicianPalette.inkSoft, fontSize: 13, padding: 14 }}>
                      {selectedStep.summary || 'No additional note was recorded for this step.'}
                    </div>
                    {selectedStep.photos.length ? (
                      <Image.PreviewGroup>
                        <div className="flex flex-wrap gap-2">
                          {selectedStep.photos.map((url, index) => (
                            <Image key={`${url}-${index}`} src={resolveApiAssetUrl(url)} width={64} height={64} style={{ borderRadius: 8, objectFit: 'cover' }} />
                          ))}
                        </div>
                      </Image.PreviewGroup>
                    ) : null}
                  </div>
                ) : selectedStep.status === 'completed' ? (
                  <div className="mt-4 flex flex-col gap-3">
                    <CauseCorrection cause={selectedStep.cause} correction={selectedStep.correction} />
                    <div style={{ background: technicianPalette.panelAlt, borderRadius: 12, color: technicianPalette.inkSoft, fontSize: 13, padding: 14 }}>
                      {selectedStep.summary || 'This step is marked complete.'}
                    </div>
                    {selectedStep.photos.length ? (
                      <Image.PreviewGroup>
                        <div className="flex flex-wrap gap-2">
                          {selectedStep.photos.map((url, index) => (
                            <Image key={`${url}-${index}`} src={resolveApiAssetUrl(url)} width={64} height={64} style={{ borderRadius: 8, objectFit: 'cover' }} />
                          ))}
                        </div>
                      </Image.PreviewGroup>
                    ) : null}
                    <Button block disabled={saving} icon={<ThunderboltOutlined />} onClick={reopenStep} size="large">
                      Reopen this step
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col gap-3">
                    <div>
                      <div style={{ color: technicianPalette.textMuted, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Cause</div>
                      <TextArea
                        onChange={(event) => setCause(event.target.value)}
                        placeholder="What caused the problem?"
                        rows={2}
                        status={causeErrors.cause ? 'error' : undefined}
                        value={cause}
                      />
                      {fieldError(causeErrors.cause)}
                    </div>

                    <div>
                      <div style={{ color: technicianPalette.textMuted, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Correction</div>
                      <TextArea
                        onChange={(event) => setCorrection(event.target.value)}
                        placeholder="What did you actually do to fix it?"
                        rows={2}
                        status={causeErrors.correction ? 'error' : undefined}
                        value={correction}
                      />
                      {fieldError(causeErrors.correction)}
                    </div>

                    <div>
                      <div style={{ color: technicianPalette.textMuted, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Notes for this step</div>
                      <TextArea onChange={(event) => setNote(event.target.value)} placeholder="What did you find or do for this item?" rows={5} value={note} />
                    </div>

                    <div>
                      <div style={{ color: technicianPalette.textMuted, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Photos (optional)</div>
                      <Upload
                        beforeUpload={() => false}
                        fileList={stepPhotos}
                        listType="picture-card"
                        onChange={({ fileList }) => setStepPhotos(fileList)}
                        onPreview={async (file) => {
                          const src = file.url || file.preview || (file.originFileObj ? await fileToDataUrl(file.originFileObj as File) : '')
                          if (!src) return
                          setPreviewImage(src)
                          setPreviewOpen(true)
                        }}
                        accept="image/*"
                        multiple
                      >
                        {stepPhotos.length >= 10 ? null : (
                          <div>
                            <PlusOutlined />
                            <div style={{ marginTop: 8 }}>Upload</div>
                          </div>
                        )}
                      </Upload>
                      {previewImage ? (
                        <Image style={{ display: 'none' }} src={previewImage} preview={{ visible: previewOpen, onVisibleChange: setPreviewOpen }} />
                      ) : null}
                    </div>

                    {selectedStep.status === 'waiting' ? (
                      <Button block disabled={saving} icon={<ThunderboltOutlined />} onClick={startStep} size="large" type="primary">
                        Start this step
                      </Button>
                    ) : (
                      <>
                        <Button block disabled={saving} icon={<CheckOutlined />} onClick={completeStep} size="large" type="primary">
                          Mark step complete
                        </Button>
                        <Button block disabled={saving || (!note.trim() && !stepPhotos.length)} onClick={saveNoteOnly} type="text" style={{ color: technicianPalette.textMuted }}>
                          Save note without completing
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </Card>
            ) : null}
          </div>

          {/* Secondary actions — clearly de-emphasised below the main work */}
          {!orderIsTerminal ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {hasPartLines ? (
                <Card bordered={false} className="bo-enter rounded-2xl" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, border: `1px solid ${technicianPalette.border}` }} title="Parts to issue?">
                  <div className="flex items-center justify-between gap-3">
                    <p style={{ color: technicianPalette.textMuted, fontSize: 13, margin: 0 }}>Pull this order's reserved parts from the shelf — this is what actually drops stock.</p>
                    <Popconfirm
                      cancelText="Cancel"
                      okText="Issue"
                      onConfirm={issueParts}
                      title="Issue this order's parts?"
                      description="Stock drops for real once you confirm — only do this after you've actually pulled the parts."
                    >
                      <Button icon={<InboxOutlined />} loading={issuingParts}>Issue parts</Button>
                    </Popconfirm>
                  </div>
                </Card>
              ) : null}

              <Card bordered={false} className="bo-enter rounded-2xl" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, border: `1px solid ${technicianPalette.border}` }} title="Found extra work?">
                {proposalOpen ? (
                  <div className="flex flex-col gap-3">
                    <LabeledField label="Pick from catalog (optional)">
                      <Select
                        allowClear
                        filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                        onChange={(value) => {
                          setProposalServiceId(value || '')
                          const picked = services.find((service) => (service._id || service.id) === value)
                          if (picked?.name) setProposalServiceName(picked.name)
                        }}
                        options={services.map((service) => ({ label: service.name, value: service._id || service.id }))}
                        placeholder="Search the service catalog..."
                        showSearch
                        style={{ width: '100%' }}
                        value={proposalServiceId || undefined}
                      />
                    </LabeledField>
                    <LabeledField label="Service name">
                      <Input
                        onChange={(event) => {
                          setProposalServiceName(event.target.value)
                          // Once the tech edits the text, it may no longer match the
                          // catalog entry they picked — treat it as a custom line.
                          setProposalServiceId('')
                        }}
                        placeholder="e.g. Rear brake pad replacement, or pick from catalog above"
                        status={proposalErrors.serviceName ? 'error' : undefined}
                        value={proposalServiceName}
                      />
                      {fieldError(proposalErrors.serviceName)}
                    </LabeledField>
                    <LabeledField label="Affected part (optional)">
                      <Input onChange={(event) => setProposalAffectedPart(event.target.value)} placeholder="e.g. Rear brake pads" value={proposalAffectedPart} />
                    </LabeledField>
                    <LabeledField label="Why is it needed?">
                      <Input onChange={(event) => setProposalReason(event.target.value)} placeholder="What you found and why it needs attention" status={proposalErrors.reason ? 'error' : undefined} value={proposalReason} />
                      {fieldError(proposalErrors.reason)}
                    </LabeledField>
                    <LabeledField label="Time estimate (minutes)">
                      <InputNumber min={1} onChange={(value) => setProposalEstimateMinutes(Math.max(0, Number(value) || 0))} status={proposalErrors.estimate ? 'error' : undefined} style={{ width: '100%' }} value={proposalEstimateMinutes} />
                      {fieldError(proposalErrors.estimate)}
                    </LabeledField>
                    <LabeledField label="Priority">
                      <Select
                        onChange={setProposalPriority}
                        options={[
                          { label: 'High priority', value: 'high' },
                          { label: 'Recommended', value: 'medium' },
                          { label: 'Monitor', value: 'low' },
                        ]}
                        style={{ width: '100%' }}
                        value={proposalPriority}
                      />
                    </LabeledField>
                    <LabeledField label="Evidence photos">
                      <Upload
                        beforeUpload={() => false}
                        fileList={proposalPhotos}
                        listType="picture-card"
                        onChange={({ fileList }) => setProposalPhotos(fileList)}
                        onPreview={async (file) => {
                          const src = file.url || file.preview || (file.originFileObj ? await fileToDataUrl(file.originFileObj as File) : '')
                          if (!src) return
                          setPreviewImage(src)
                          setPreviewOpen(true)
                        }}
                        accept="image/*"
                        multiple
                      >
                        {proposalPhotos.length >= 10 ? null : (
                          <div>
                            <PictureOutlined />
                            <div style={{ marginTop: 8 }}>Upload</div>
                          </div>
                        )}
                      </Upload>
                    </LabeledField>
                    <div className="flex gap-2">
                      <Button block icon={<PlusOutlined />} loading={submittingProposal} onClick={submitProposal} type="primary">
                        Send to advisor
                      </Button>
                      <Button onClick={() => { setProposalOpen(false); setProposalServiceId(''); setProposalPhotos([]); setProposalErrors({}) }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <p style={{ color: technicianPalette.textMuted, fontSize: 13, margin: 0 }}>Propose an extra service for the advisor to approve.</p>
                    <Button icon={<PlusOutlined />} onClick={() => setProposalOpen(true)}>Add</Button>
                  </div>
                )}
              </Card>

              <Card bordered={false} className="bo-enter rounded-2xl" style={{ background: technicianPalette.panel, boxShadow: technicianPalette.shadow, border: `1px solid ${technicianPalette.border}` }} title="Hand this order off?">
                {transferOpen ? (
                  <div className="flex flex-col gap-3">
                    <LabeledField label="Reason for the transfer">
                      <Input onChange={(event) => setTransferReason(event.target.value)} placeholder="e.g. Shift ending, handing off to the next technician" status={transferErrors.reason ? 'error' : undefined} value={transferReason} />
                      {fieldError(transferErrors.reason)}
                    </LabeledField>
                    <div className="flex gap-2">
                      <Button block icon={<SwapOutlined />} loading={requestingTransfer} onClick={submitTransfer} type="primary">
                        Send request
                      </Button>
                      <Button onClick={() => { setTransferOpen(false); setTransferErrors({}) }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <p style={{ color: technicianPalette.textMuted, fontSize: 13, margin: 0 }}>Ask the advisor to reassign this order to another technician.</p>
                    <Button icon={<SwapOutlined />} onClick={() => setTransferOpen(true)}>Transfer</Button>
                  </div>
                )}
              </Card>
            </div>
          ) : null}
        </>
      )}
    </TechnicianShell>
  )
}
