import { CheckOutlined, ToolOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Image, Input, InputNumber, Select, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  fetchInspectionReports,
  fetchWorkshopRepairOrders,
  forwardRepairOrderToAccountant,
  formatApiDate,
  orderId,
  personName,
  submitQualityCheck,
  unwrapArray,
  vehicleName,
  vehiclePlate,
  type ApiInspectionReport,
  type ApiRepairOrder,
  type QualityCheckResult,
} from '../../shared/api/workshop'
import { resolveApiAssetUrl } from '../../shared/lib/api-client'
import { getUserInitials, useAuth } from '../../shared/auth'
import {
  InlineBanner,
  StatCard,
  advisorPalette,
  useApiMessage,
} from '../../widgets/backoffice-shell'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

const { TextArea } = Input

type CheckItem = {
  id: string
  label: string
  result: QualityCheckResult
  note: string
}

type OrderView = {
  id: string
  code: string
  vehicle: string
  plate: string
  technician: string
  customer: string
  completedAt: string
  forwardedToAccountantAt?: string
  invoicedAt?: string
  /** Photos the technician attached to their step notes — evidence of the
   * actual repair work, distinct from the advisor's pre-repair inspection photos. */
  stepPhotos: string[]
  /** Each line's 3C record (Cause/Correction) — captured as mandatory when the
   * technician completes the step, otherwise never shown to anyone again. */
  workPerformed: Array<{ title: string; isPart: boolean; cause: string; correction: string }>
}

const checklistSeed = [
  'Repairs match the work order',
  'Road test passed',
  'No warning lights on the dashboard',
  'No oil or coolant leaks',
  'Replacement parts match specification',
  'Torque and safety checks done',
  'Engine bay and interior cleaned',
  'Handover photos complete',
]

const resultLabels: Record<QualityCheckResult, string> = {
  fail: 'Fail',
  na: 'Skip',
  pass: 'Pass',
}

const resultColors: Record<QualityCheckResult, string> = {
  fail: 'red',
  na: 'default',
  pass: 'green',
}

function seedChecklist(): CheckItem[] {
  return checklistSeed.map((label) => ({
    id: crypto.randomUUID(),
    label,
    note: '',
    result: 'pass' as QualityCheckResult,
  }))
}

function mapOrder(order: ApiRepairOrder): OrderView {
  const vehicle = order.vehicleId || order.vehicle
  return {
    code: orderId(order),
    completedAt: formatApiDate(order.completedAt || order.updatedAt),
    customer: personName(
      order.customer || vehicle?.customerId || vehicle?.customer,
      'No customer on file',
    ),
    forwardedToAccountantAt: order.forwardedToAccountantAt,
    invoicedAt: order.invoicedAt,
    id: order._id || order.id || crypto.randomUUID(),
    plate: vehiclePlate(vehicle),
    technician: personName(order.technicianId || order.technician, 'Unassigned'),
    vehicle: vehicleName(vehicle),
    stepPhotos: (order.stepNotes || []).flatMap((note) => note.photos || []),
    workPerformed: (order.services || [])
      .filter((service) => service.cause || service.correction)
      .map((service) => ({
        title: (typeof service.serviceId === 'object' ? service.serviceId?.name : undefined) || service.name || 'Repair item',
        isPart: service.kind === 'part',
        cause: service.cause || '',
        correction: service.correction || '',
      })),
  }
}

export function QualityVerificationPage() {
  const { token } = useAuth()
  const [searchParams] = useSearchParams()
  const orderIdParam = searchParams.get('orderId') ?? ''
  const [orders, setOrders] = useState<OrderView[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [checklistByOrder, setChecklistByOrder] = useState<Record<string, CheckItem[]>>({})
  const [reworkNote, setReworkNote] = useState('')
  const [testDriveKm, setTestDriveKm] = useState<number | null>(null)
  const [verdictByOrder, setVerdictByOrder] = useState<Record<string, 'passed' | 'rework'>>({})
  const {
    message: apiMessage,
    tone: apiTone,
    showError,
    showSuccess,
    clear: clearApiMessage,
  } = useApiMessage()
  const [saving, setSaving] = useState(false)
  const [evidenceReports, setEvidenceReports] = useState<ApiInspectionReport[]>([])

  useEffect(() => {
    if (!token) return
    const authToken = token
    let cancelled = false

    async function loadOrders() {
      clearApiMessage()
      try {
        const response = await fetchWorkshopRepairOrders(authToken, '?status=completed')
        // Backend leaves status "completed" even after forwarding or billing
        // (accounting queries by that same status) — exclude orders that are
        // already forwarded OR already invoiced. The accountant can bill
        // directly off the completed-orders queue without ever going through
        // "Forward to accountant", so invoicedAt is checked independently
        // rather than assuming forwardedToAccountantAt was set first.
        const list = unwrapArray<ApiRepairOrder>(response, ['repairOrders', 'orders'])
          .map(mapOrder)
          .filter((order) => !order.forwardedToAccountantAt && !order.invoicedAt)
        if (cancelled) return
        setOrders(list)
        setSelectedId((current) => {
          if (current) return current
          if (orderIdParam && list.some((order) => order.id === orderIdParam)) return orderIdParam
          return ''
        })
        setChecklistByOrder((current) => {
          const next = { ...current }
          list.forEach((order) => {
            if (!next[order.id]) next[order.id] = seedChecklist()
          })
          return next
        })
      } catch (err) {
        if (!cancelled)
          showError(
            err instanceof Error
              ? err.message
              : 'Unable to load completed work orders from the API',
          )
      }
    }

    void loadOrders()
    return () => {
      cancelled = true
    }
  }, [token])

  const selectedOrder = orders.find((order) => order.id === selectedId)

  useEffect(() => {
    if (!token || !selectedOrder?.id) {
      setEvidenceReports([])
      return
    }
    const authToken = token
    const repairOrderId = selectedOrder.id
    let cancelled = false

    async function loadEvidence() {
      try {
        const response = await fetchInspectionReports(authToken, `?repairOrderId=${repairOrderId}`)
        if (!cancelled)
          setEvidenceReports(unwrapArray<ApiInspectionReport>(response, ['inspectionReports']))
      } catch {
        if (!cancelled) setEvidenceReports([])
      }
    }

    void loadEvidence()
    return () => {
      cancelled = true
    }
  }, [token, selectedOrder?.id])

  // Combines the advisor's pre-repair inspection photos with the
  // technician's own step-note photos — the latter is what actually shows
  // the completed work, which is what QC is verifying.
  const evidencePhotos = useMemo(
    () => [
      ...evidenceReports.flatMap((report) => report.photos || []),
      ...(selectedOrder?.stepPhotos || []),
    ],
    [evidenceReports, selectedOrder?.stepPhotos],
  )
  const checklist = (selectedOrder && checklistByOrder[selectedOrder.id]) || []
  const passCount = checklist.filter((item) => item.result === 'pass').length
  const failCount = checklist.filter((item) => item.result === 'fail').length
  const allDecided = checklist.length > 0 && failCount === 0
  const awaitingCount = orders.filter((order) => !verdictByOrder[order.id]).length
  const passedCount = useMemo(
    () => Object.values(verdictByOrder).filter((verdict) => verdict === 'passed').length,
    [verdictByOrder],
  )

  function setResult(itemId: string, result: QualityCheckResult) {
    if (!selectedOrder) return
    setChecklistByOrder((current) => ({
      ...current,
      [selectedOrder.id]: (current[selectedOrder.id] || []).map((item) =>
        item.id === itemId ? { ...item, result } : item,
      ),
    }))
  }

  function setItemNote(itemId: string, note: string) {
    if (!selectedOrder) return
    setChecklistByOrder((current) => ({
      ...current,
      [selectedOrder.id]: (current[selectedOrder.id] || []).map((item) =>
        item.id === itemId ? { ...item, note } : item,
      ),
    }))
  }

  // This page is service-advisor-only (see the route guard in App.tsx), and a
  // service advisor always holds both the quality-check and forward-to-accountant
  // permissions — there's no separate approval step in between. Forwarding also
  // can't wait for a second visit: a pass flips the order's status away from
  // "completed", so it drops out of this page's own queue and there would be
  // no way back to a lone "Forward" button. Chain the two calls into one action.
  async function submitVerdict(passed: boolean) {
    if (!selectedOrder || !token) return
    if (
      !passed &&
      !reworkNote.trim() &&
      !checklist.some((item) => item.result === 'fail' && item.note.trim())
    ) {
      showError('Add a note explaining what needs rework before sending it back to the technician.')
      return
    }

    setSaving(true)
    clearApiMessage()
    try {
      await submitQualityCheck(token, selectedOrder.id, {
        items: checklist.map((item) => ({
          label: item.label,
          note: item.note,
          result: item.result,
        })),
        note: reworkNote,
        passed,
        reworkReason: passed ? undefined : reworkNote,
        testDriveKm: testDriveKm ?? undefined,
      })
      setVerdictByOrder((current) => ({
        ...current,
        [selectedOrder.id]: passed ? 'passed' : 'rework',
      }))

      if (!passed) {
        showSuccess('Sent back to the technician for rework.')
        return
      }

      try {
        await forwardRepairOrderToAccountant(token, selectedOrder.id)
        const forwardedAt = new Date().toISOString()
        setOrders((current) =>
          current.map((order) =>
            order.id === selectedOrder.id
              ? { ...order, forwardedToAccountantAt: forwardedAt }
              : order,
          ),
        )
        showSuccess('Passed quality check and forwarded to accounting for invoicing.')
      } catch (forwardErr) {
        // QC pass is already saved — surface the forward failure on its own so
        // the retry button in the Handover card can pick it back up.
        showError(
          forwardErr instanceof Error
            ? `Passed quality check, but forwarding to accounting failed: ${forwardErr.message}`
            : 'Passed quality check, but forwarding to accounting failed.',
        )
      }
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : 'Unable to save the quality check. Check the API connection.',
      )
    } finally {
      setSaving(false)
    }
  }

  const checklistColumns: ColumnsType<CheckItem> = [
    {
      key: 'label',
      render: (_, item) => (
        <span style={{ color: advisorPalette.ink, fontWeight: 700 }}>{item.label}</span>
      ),
      title: 'Item',
    },
    {
      key: 'result',
      render: (_, item) => (
        <div className="flex flex-wrap gap-2">
          {(['pass', 'fail', 'na'] as QualityCheckResult[]).map((result) => (
            <Tag
              color={item.result === result ? resultColors[result] : undefined}
              key={result}
              onClick={() => setResult(item.id, result)}
              style={{ cursor: 'pointer' }}
            >
              {resultLabels[result]}
            </Tag>
          ))}
        </div>
      ),
      title: 'Result',
      width: 220,
    },
    {
      key: 'note',
      render: (_, item) =>
        item.result === 'fail' ? (
          <Input
            onChange={(event) => setItemNote(item.id, event.target.value)}
            placeholder="Describe the issue for the technician to rework"
            value={item.note}
          />
        ) : (
          <span style={{ color: advisorPalette.textMuted }}>—</span>
        ),
      title: 'Note',
    },
  ]

  return (
    <ServiceAdvisorShell title="Quality verification">
      {apiMessage ? <InlineBanner tone={apiTone}>{apiMessage}</InlineBanner> : null}

      <div className="flex flex-wrap gap-4">
        <StatCard label="Awaiting verification" palette={advisorPalette} value={awaitingCount} />
        <StatCard label="Passed today" palette={advisorPalette} value={passedCount} />
        <StatCard label="Failed items" palette={advisorPalette} value={failCount} />
      </div>

      <Card
        bordered={false}
        className="bo-card-hover bo-enter rounded-2xl"
        style={{
          background: advisorPalette.panel,
          boxShadow: advisorPalette.shadow,
          border: `1px solid ${advisorPalette.border}`,
        }}
        styles={{ body: { padding: 18 } }}
      >
        {orders.length ? (
          <>
            <Select
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              onChange={setSelectedId}
              options={orders.map((order) => ({
                label: `${order.code} — ${order.vehicle} (${order.plate})`,
                value: order.id,
              }))}
              placeholder="Select a completed work order to verify"
              showSearch
              style={{ width: '100%' }}
              value={selectedOrder?.id}
            />
            {selectedOrder ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {verdictByOrder[selectedOrder.id] ? (
                  <Tag color={verdictByOrder[selectedOrder.id] === 'passed' ? 'green' : 'red'}>
                    {verdictByOrder[selectedOrder.id] === 'passed' ? 'Passed' : 'Returned'}
                  </Tag>
                ) : (
                  <Tag color="gold">Awaiting QC</Tag>
                )}
                <span
                  style={{
                    alignItems: 'center',
                    background: advisorPalette.panelAlt,
                    borderRadius: 10,
                    display: 'inline-flex',
                    fontSize: 13,
                    fontWeight: 600,
                    gap: 6,
                    padding: '4px 10px',
                  }}
                >
                  <Avatar size={18} style={{ background: advisorPalette.ink, fontSize: 9 }}>
                    {getUserInitials(selectedOrder.technician)}
                  </Avatar>
                  {selectedOrder.technician}
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <span style={{ color: advisorPalette.textMuted }}>
            No orders awaiting quality check from the API.
          </span>
        )}
      </Card>

      {selectedOrder ? (
        <div className="grid items-start gap-5 *:min-w-0 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-5">
            <Card
              bordered={false}
              className="bo-card-hover bo-enter rounded-2xl"
              style={{
                background: advisorPalette.panel,
                boxShadow: advisorPalette.shadow,
                border: `1px solid ${advisorPalette.border}`,
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p
                    style={{
                      color: advisorPalette.textMuted,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    Order
                  </p>
                  <p style={{ color: advisorPalette.ink, fontWeight: 700, marginTop: 4 }}>
                    {selectedOrder.code}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      color: advisorPalette.textMuted,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    Vehicle
                  </p>
                  <p style={{ color: advisorPalette.ink, fontWeight: 700, marginTop: 4 }}>
                    {selectedOrder.vehicle}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      color: advisorPalette.textMuted,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    Customer
                  </p>
                  <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                    <Avatar size={22} style={{ background: advisorPalette.red }}>
                      {getUserInitials(selectedOrder.customer)}
                    </Avatar>
                    <p style={{ color: advisorPalette.ink, fontWeight: 700 }}>
                      {selectedOrder.customer}
                    </p>
                  </div>
                </div>
                <div>
                  <p
                    style={{
                      color: advisorPalette.textMuted,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    Completed
                  </p>
                  <p style={{ color: advisorPalette.ink, fontWeight: 700, marginTop: 4 }}>
                    {selectedOrder.completedAt}
                  </p>
                </div>
              </div>
            </Card>

            {selectedOrder.workPerformed.length ? (
              <Card
                bordered={false}
                className="bo-card-hover bo-enter rounded-2xl"
                style={{
                  background: advisorPalette.panel,
                  boxShadow: advisorPalette.shadow,
                  border: `1px solid ${advisorPalette.border}`,
                }}
                title="Work performed"
              >
                <div className="flex flex-col gap-3">
                  {selectedOrder.workPerformed.map((line, index) => (
                    <div key={`${line.title}-${index}`} style={{ background: advisorPalette.panelAlt, borderRadius: 12, padding: '12px 14px' }}>
                      <div className="flex items-center gap-2">
                        <span style={{ color: advisorPalette.ink, fontSize: 14, fontWeight: 700 }}>{line.title}</span>
                        {line.isPart ? <Tag>Part</Tag> : null}
                      </div>
                      {line.cause ? (
                        <p style={{ color: advisorPalette.inkSoft, fontSize: 13, margin: '6px 0 0' }}>
                          <span style={{ color: advisorPalette.textMuted, fontWeight: 700 }}>Cause · </span>
                          {line.cause}
                        </p>
                      ) : null}
                      {line.correction ? (
                        <p style={{ color: advisorPalette.inkSoft, fontSize: 13, margin: '4px 0 0' }}>
                          <span style={{ color: advisorPalette.textMuted, fontWeight: 700 }}>Correction · </span>
                          {line.correction}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            <Card
              bordered={false}
              className="bo-card-hover bo-enter rounded-2xl"
              extra={
                <Tag color="red">
                  {passCount}/{checklist.length} passed
                </Tag>
              }
              style={{
                background: advisorPalette.panel,
                boxShadow: advisorPalette.shadow,
                border: `1px solid ${advisorPalette.border}`,
              }}
              title="Verification checklist"
            >
              <Table
                columns={checklistColumns}
                dataSource={checklist}
                pagination={false}
                rowKey="id"
                size="small"
                className="bo-table"
                scroll={{ x: 640 }}
              />
            </Card>

            {evidencePhotos.length ? (
              <Card
                bordered={false}
                className="bo-card-hover bo-enter rounded-2xl"
                style={{
                  background: advisorPalette.panel,
                  boxShadow: advisorPalette.shadow,
                  border: `1px solid ${advisorPalette.border}`,
                }}
                title="Evidence photos"
              >
                <Image.PreviewGroup>
                  <div className="flex flex-wrap gap-3">
                    {evidencePhotos.map((photo, index) => (
                      <Image
                        alt={`Evidence photo ${index + 1}`}
                        key={photo}
                        src={resolveApiAssetUrl(photo)}
                        style={{ borderRadius: 12, objectFit: 'cover' }}
                        height={84}
                        width={84}
                      />
                    ))}
                  </div>
                </Image.PreviewGroup>
              </Card>
            ) : null}
          </div>

          <div className="flex flex-col gap-5" style={{ position: 'sticky', top: 96 }}>
            <Card
              bordered={false}
              className="bo-card-hover bo-enter rounded-2xl"
              style={{ background: advisorPalette.ink, boxShadow: advisorPalette.shadow }}
            >
              <p
                style={{
                  color: '#ffb4ab',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Verification result
              </p>
              <div
                className="mt-4 flex flex-col gap-3"
                style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}
              >
                <div className="flex items-center justify-between">
                  <span>Items passed</span>
                  <span style={{ fontWeight: 700 }}>
                    {passCount}/{checklist.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Failed</span>
                  <span style={{ color: '#ffb4ab', fontWeight: 700 }}>{failCount}</span>
                </div>
              </div>
              <div
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  marginTop: 16,
                  paddingTop: 16,
                }}
              >
                <p
                  style={{
                    color: 'rgba(255,255,255,0.55)',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Verdict
                </p>
                <p style={{ color: '#ffb4ab', fontSize: 20, fontWeight: 700, marginTop: 8 }}>
                  {allDecided ? 'Ready for handover' : 'Items still failing'}
                </p>
              </div>
            </Card>

            <Card
              bordered={false}
              className="bo-card-hover bo-enter rounded-2xl"
              style={{
                background: advisorPalette.panel,
                boxShadow: advisorPalette.shadow,
                border: `1px solid ${advisorPalette.border}`,
              }}
              title="Verification notes"
            >
              {verdictByOrder[selectedOrder.id] ? (
                <div className="flex flex-col items-start gap-2">
                  <Tag
                    color={verdictByOrder[selectedOrder.id] === 'passed' ? 'green' : 'red'}
                    icon={
                      verdictByOrder[selectedOrder.id] === 'passed' ? (
                        <CheckOutlined />
                      ) : (
                        <ToolOutlined />
                      )
                    }
                  >
                    {verdictByOrder[selectedOrder.id] === 'passed'
                      ? 'Passed — moved to handover'
                      : 'Returned to technician for rework'}
                  </Tag>
                  <span style={{ color: advisorPalette.textMuted, fontSize: 13 }}>
                    A verdict was already recorded for this order.
                  </span>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      color: advisorPalette.textMuted,
                      fontSize: 11,
                      fontWeight: 700,
                      marginBottom: 6,
                      textTransform: 'uppercase',
                    }}
                  >
                    Test drive kilometers
                  </div>
                  <InputNumber
                    min={0}
                    onChange={(value) => setTestDriveKm(typeof value === 'number' ? value : null)}
                    style={{ marginBottom: 16, width: '100%' }}
                    value={testDriveKm}
                  />
                  <TextArea
                    onChange={(event) => setReworkNote(event.target.value)}
                    placeholder="Result notes or reason for returning to the technician..."
                    rows={4}
                    value={reworkNote}
                  />
                  <div className="mt-4 flex flex-col gap-3">
                    <Button
                      block
                      disabled={saving || !allDecided}
                      icon={<CheckOutlined />}
                      onClick={() => submitVerdict(true)}
                      type="primary"
                    >
                      Pass &amp; forward to accounting
                    </Button>
                    <Button
                      block
                      disabled={saving}
                      icon={<ToolOutlined />}
                      onClick={() => submitVerdict(false)}
                    >
                      Return to technician
                    </Button>
                    {!allDecided ? (
                      <p style={{ color: advisorPalette.red, fontSize: 12, fontWeight: 700 }}>
                        Some items are still failing — only return to technician is available.
                      </p>
                    ) : null}
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <Card
          bordered={false}
          className="bo-card-hover bo-enter rounded-2xl"
          style={{
            background: advisorPalette.panel,
            boxShadow: advisorPalette.shadow,
            border: `1px solid ${advisorPalette.border}`,
          }}
        >
          Select a work order to verify.
        </Card>
      )}
    </ServiceAdvisorShell>
  )
}
