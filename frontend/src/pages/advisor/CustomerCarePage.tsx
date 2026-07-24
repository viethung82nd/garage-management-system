import { PhoneOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Card, Input, InputNumber, Modal, Rate, Select, Table, Tabs, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState, type ReactNode } from 'react'
import {
  fetchDeferredWork,
  fetchFollowUps,
  fetchReminders,
  fetchSatisfactionSummary,
  generateFollowUps,
  generateReminders,
  recordFollowUpOutcome,
  resolveDeferredWork,
  updateReminderStatus,
  type ApiDeferredWork,
  type ApiFollowUp,
  type ApiReminder,
  type ComplaintCategory,
  type DeferredWorkStatus,
  type FollowUpStatus,
  type RecordFollowUpOutcomePayload,
  type ReminderStatus,
  type ReminderType,
  type SatisfactionSummary,
} from '../../shared/api/crm'
import { formatApiDate, orderId, personName, unwrapArray, vehicleName, vehiclePlate, type ApiVehicle } from '../../shared/api/workshop'
import { useAuth } from '../../shared/auth'
import { InlineBanner, StatCard, advisorPalette, useApiMessage } from '../../widgets/backoffice-shell'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}

function asVehicleRef(value?: ApiVehicle | string) {
  return typeof value === 'object' ? value : undefined
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>
      {children}
    </div>
  )
}

// ============= REMINDERS =============

const reminderTypeLabels: Record<ReminderType, string> = {
  maintenanceDue: 'Maintenance due',
  registrationExpiry: 'Registration expiry',
  insuranceExpiry: 'Insurance expiry',
  warrantyExpiry: 'Warranty expiry',
  deferredWork: 'Deferred work',
  lapsedCustomer: 'Lapsed customer',
}

const reminderStatusLabels: Record<ReminderStatus, string> = {
  pending: 'Pending',
  sent: 'Sent',
  dismissed: 'Dismissed',
  done: 'Done',
}

const reminderStatusColors: Record<ReminderStatus, string> = {
  pending: 'gold',
  sent: 'blue',
  dismissed: 'default',
  done: 'green',
}

const reminderStatusFilterOptions: { label: string; value: ReminderStatus | '' }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Sent', value: 'sent' },
  { label: 'Dismissed', value: 'dismissed' },
  { label: 'Done', value: 'done' },
  { label: 'All', value: '' },
]

type ReminderRow = {
  id: string
  type: ReminderType
  vehiclePlate: string
  customer: string
  dueAt: string
  status: ReminderStatus
}

function mapReminder(reminder: ApiReminder): ReminderRow {
  return {
    id: reminder._id || reminder.id || crypto.randomUUID(),
    type: reminder.type || 'maintenanceDue',
    vehiclePlate: vehiclePlate(asVehicleRef(reminder.vehicleId)),
    customer: personName(reminder.customerId, 'Customer'),
    dueAt: reminder.dueAt || '',
    status: reminder.status || 'pending',
  }
}

function RemindersPanel({ token }: { token: string | null }) {
  const [reminders, setReminders] = useState<ReminderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<ReminderStatus | ''>('pending')
  const [generating, setGenerating] = useState(false)
  const [busyId, setBusyId] = useState<string>()
  const { message: apiMessage, tone: apiTone, showError, showSuccess, clear: clearApiMessage } = useApiMessage()

  async function loadReminders(authToken: string, filter: ReminderStatus | '') {
    setLoading(true)
    try {
      const query = filter ? `?status=${filter}` : ''
      const response = await fetchReminders(authToken, query)
      setReminders(unwrapArray<ApiReminder>(response, ['reminders']).map(mapReminder))
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to load reminders from the API')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) return
    void loadReminders(token, statusFilter)
  }, [token, statusFilter])

  async function handleGenerate() {
    if (!token) return
    setGenerating(true)
    clearApiMessage()
    try {
      const result = await generateReminders(token)
      showSuccess(`Generated ${result.created} new reminder(s).`)
      await loadReminders(token, statusFilter)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to generate reminders')
    } finally {
      setGenerating(false)
    }
  }

  async function handleUpdateStatus(id: string, status: ReminderStatus) {
    if (!token) return
    setBusyId(id)
    clearApiMessage()
    try {
      await updateReminderStatus(token, id, status)
      setReminders((current) => current.map((row) => (row.id === id ? { ...row, status } : row)))
      showSuccess(status === 'sent' ? 'Reminder marked as sent.' : 'Reminder dismissed.')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to update the reminder')
    } finally {
      setBusyId(undefined)
    }
  }

  const pendingCount = reminders.filter((row) => row.status === 'pending').length
  const sentCount = reminders.filter((row) => row.status === 'sent').length
  const doneCount = reminders.filter((row) => row.status === 'done').length

  const columns: ColumnsType<ReminderRow> = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: ReminderType) => reminderTypeLabels[type],
    },
    {
      title: 'Vehicle',
      dataIndex: 'vehiclePlate',
      key: 'vehiclePlate',
      render: (plate: string) => <span style={{ color: advisorPalette.red, fontWeight: 600 }}>{plate}</span>,
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: 'Due date',
      dataIndex: 'dueAt',
      key: 'dueAt',
      render: (value: string) => formatApiDate(value),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: ReminderStatus) => <Tag color={reminderStatusColors[status]}>{reminderStatusLabels[status]}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, row) => (
        <div className="flex justify-end gap-2">
          <Button disabled={row.status !== 'pending'} loading={busyId === row.id} onClick={() => handleUpdateStatus(row.id, 'sent')} size="small">
            Sent
          </Button>
          <Button
            danger
            disabled={row.status === 'dismissed' || row.status === 'done'}
            loading={busyId === row.id}
            onClick={() => handleUpdateStatus(row.id, 'dismissed')}
            size="small"
          >
            Dismiss
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      {apiMessage ? <InlineBanner tone={apiTone}>{apiMessage}</InlineBanner> : null}

      <div className="flex flex-wrap gap-4">
        <StatCard label="Pending" palette={advisorPalette} value={pendingCount} enterDelay={1} />
        <StatCard label="Sent" palette={advisorPalette} tone="blue" value={sentCount} enterDelay={2} />
        <StatCard label="Done" palette={advisorPalette} tone="emerald" value={doneCount} enterDelay={3} />
      </div>

      <Card
        bordered={false}
        className="bo-card-hover bo-enter rounded-2xl"
        style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 20 }}>
          <Select onChange={setStatusFilter} options={reminderStatusFilterOptions} style={{ width: 180 }} value={statusFilter} />
          <Button icon={<ReloadOutlined />} loading={generating} onClick={handleGenerate} type="primary">
            Generate reminders
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={reminders}
          loading={loading}
          pagination={{ pageSize: 8, showTotal: (total) => `${total} reminders` }}
          rowKey="id"
          scroll={{ x: 960 }}
          className="bo-table"
        />
      </Card>
    </div>
  )
}

// ============= FOLLOW-UPS =============

const followUpStatusLabels: Record<FollowUpStatus, string> = {
  pending: 'Pending',
  contacted: 'Contacted',
  noAnswer: 'No answer',
  closed: 'Closed',
}

const followUpStatusColors: Record<FollowUpStatus, string> = {
  pending: 'gold',
  contacted: 'green',
  noAnswer: 'orange',
  closed: 'default',
}

const followUpStatusFilterOptions: { label: string; value: FollowUpStatus | '' }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'No answer', value: 'noAnswer' },
  { label: 'Closed', value: 'closed' },
  { label: 'All', value: '' },
]

const complaintCategoryLabels: Record<ComplaintCategory, string> = {
  greeting: 'Greeting/reception',
  repairQuality: 'Repair quality',
  price: 'Price',
  timeliness: 'Timeliness',
  cleanliness: 'Cleanliness',
  explanation: 'Explanation of work',
  facilities: 'Facilities',
  none: 'No complaint',
}

const complaintCategoryOptions = (Object.keys(complaintCategoryLabels) as ComplaintCategory[]).map((value) => ({
  label: complaintCategoryLabels[value],
  value,
}))

const followUpResultOptions: { label: string; value: 'contacted' | 'noAnswer' }[] = [
  { label: 'Contacted', value: 'contacted' },
  { label: 'No answer', value: 'noAnswer' },
]

type FollowUpRow = {
  id: string
  repairOrderLabel: string
  vehicleLabel: string
  dueAt: string
  status: FollowUpStatus
}

function mapFollowUp(followUp: ApiFollowUp): FollowUpRow {
  const vehicle = asVehicleRef(followUp.vehicleId)
  const repairOrderId = typeof followUp.repairOrderId === 'string' ? followUp.repairOrderId : ''

  return {
    id: followUp._id || followUp.id || crypto.randomUUID(),
    repairOrderLabel: repairOrderId ? orderId({ _id: repairOrderId }) : 'Repair order',
    vehicleLabel: vehicle ? `${vehicleName(vehicle)} - ${vehiclePlate(vehicle)}` : 'Not updated',
    dueAt: followUp.dueAt || '',
    status: followUp.status || 'pending',
  }
}

function RecordOutcomeModal({
  followUp,
  onCancel,
  onSave,
  open,
  saving,
}: {
  followUp: FollowUpRow | null
  onCancel: () => void
  onSave: (payload: RecordFollowUpOutcomePayload) => void | Promise<void>
  open: boolean
  saving: boolean
}) {
  const [status, setStatus] = useState<'contacted' | 'noAnswer'>('contacted')
  const [csatScore, setCsatScore] = useState<number>()
  const [npsScore, setNpsScore] = useState<number>()
  const [complaintCategory, setComplaintCategory] = useState<ComplaintCategory>()
  const [note, setNote] = useState('')

  // Reset each time the dialog opens so one call's outcome can't bleed into the next.
  useEffect(() => {
    if (open) {
      setStatus('contacted')
      setCsatScore(undefined)
      setNpsScore(undefined)
      setComplaintCategory(undefined)
      setNote('')
    }
  }, [open])

  return (
    <Modal
      cancelText="Cancel"
      confirmLoading={saving}
      okText="Save"
      onCancel={onCancel}
      onOk={() =>
        void onSave({
          status,
          csatScore,
          npsScore,
          complaintCategory,
          note: note.trim() || undefined,
        })
      }
      open={open}
      title="Record outcome"
    >
      {followUp ? (
        <div
          className="flex items-center justify-between"
          style={{ background: advisorPalette.panelAlt, borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}
        >
          <span style={{ color: advisorPalette.ink, fontWeight: 600 }}>{followUp.vehicleLabel}</span>
          <span style={{ color: advisorPalette.textMuted, fontSize: 13 }}>{followUp.repairOrderLabel}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <label>
          <FieldLabel>Result *</FieldLabel>
          <Select onChange={setStatus} options={followUpResultOptions} style={{ width: '100%' }} value={status} />
        </label>

        <label>
          <FieldLabel>CSAT</FieldLabel>
          <Rate count={5} onChange={setCsatScore} value={csatScore} />
        </label>

        <label>
          <FieldLabel>NPS</FieldLabel>
          <InputNumber max={10} min={0} onChange={(value) => setNpsScore(value ?? undefined)} style={{ width: '100%' }} value={npsScore} />
        </label>

        <label>
          <FieldLabel>Complaint</FieldLabel>
          <Select allowClear onChange={setComplaintCategory} options={complaintCategoryOptions} style={{ width: '100%' }} value={complaintCategory} />
        </label>

        <label>
          <FieldLabel>Note</FieldLabel>
          <Input.TextArea autoSize={{ maxRows: 4, minRows: 2 }} onChange={(event) => setNote(event.target.value)} value={note} />
        </label>
      </div>
    </Modal>
  )
}

function FollowUpsPanel({ token }: { token: string | null }) {
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | ''>('pending')
  const [generating, setGenerating] = useState(false)
  const [satisfaction, setSatisfaction] = useState<SatisfactionSummary | null>(null)
  const [modalRow, setModalRow] = useState<FollowUpRow | null>(null)
  const [saving, setSaving] = useState(false)
  const { message: apiMessage, tone: apiTone, showError, showSuccess, clear: clearApiMessage } = useApiMessage()

  async function loadFollowUps(authToken: string, filter: FollowUpStatus | '') {
    setLoading(true)
    try {
      const query = filter ? `?status=${filter}` : ''
      const response = await fetchFollowUps(authToken, query)
      setFollowUps(unwrapArray<ApiFollowUp>(response, ['followUps']).map(mapFollowUp))
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to load follow-ups from the API')
    } finally {
      setLoading(false)
    }
  }

  function loadSatisfaction(authToken: string) {
    fetchSatisfactionSummary(authToken)
      .then(setSatisfaction)
      .catch(() => {})
  }

  useEffect(() => {
    if (!token) return
    void loadFollowUps(token, statusFilter)
  }, [token, statusFilter])

  useEffect(() => {
    if (!token) return
    loadSatisfaction(token)
  }, [token])

  async function handleGenerate() {
    if (!token) return
    setGenerating(true)
    clearApiMessage()
    try {
      const result = await generateFollowUps(token)
      showSuccess(`Generated ${result.created} new follow-up(s).`)
      await loadFollowUps(token, statusFilter)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to generate follow-ups')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSaveOutcome(payload: RecordFollowUpOutcomePayload) {
    if (!token || !modalRow) return
    setSaving(true)
    clearApiMessage()
    try {
      const updated = await recordFollowUpOutcome(token, modalRow.id, payload)
      const mapped = mapFollowUp(updated)
      setFollowUps((current) => current.map((row) => (row.id === modalRow.id ? mapped : row)))
      showSuccess('Follow-up outcome recorded.')
      setModalRow(null)
      loadSatisfaction(token)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to record the outcome')
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnsType<FollowUpRow> = [
    {
      title: 'Repair order / vehicle',
      key: 'order',
      render: (_, row) => (
        <div>
          <div style={{ color: advisorPalette.red, fontSize: 12, fontWeight: 700 }}>{row.repairOrderLabel}</div>
          <div style={{ color: advisorPalette.textMuted, fontSize: 13 }}>{row.vehicleLabel}</div>
        </div>
      ),
    },
    {
      title: 'Due date',
      dataIndex: 'dueAt',
      key: 'dueAt',
      render: (value: string) => formatApiDate(value),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: FollowUpStatus) => <Tag color={followUpStatusColors[status]}>{followUpStatusLabels[status]}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, row) => (
        <div className="flex justify-end">
          <Button disabled={row.status === 'closed'} icon={<PhoneOutlined />} onClick={() => setModalRow(row)} size="small">
            Record outcome
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      {apiMessage ? <InlineBanner tone={apiTone}>{apiMessage}</InlineBanner> : null}

      <div className="flex flex-wrap gap-4">
        <StatCard label="Avg CSAT" palette={advisorPalette} value={satisfaction?.avgCsat != null ? satisfaction.avgCsat.toFixed(1) : 'N/A'} enterDelay={1} />
        <StatCard label="NPS" palette={advisorPalette} tone="blue" value={satisfaction?.nps != null ? Math.round(satisfaction.nps) : 'N/A'} enterDelay={2} />
        <StatCard label="Contacted" palette={advisorPalette} tone="emerald" value={satisfaction?.contactedCount ?? 0} enterDelay={3} />
      </div>

      <Card
        bordered={false}
        className="bo-card-hover bo-enter rounded-2xl"
        style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 20 }}>
          <Select onChange={setStatusFilter} options={followUpStatusFilterOptions} style={{ width: 180 }} value={statusFilter} />
          <Button icon={<ReloadOutlined />} loading={generating} onClick={handleGenerate} type="primary">
            Generate
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={followUps}
          loading={loading}
          pagination={{ pageSize: 8, showTotal: (total) => `${total} follow-ups` }}
          rowKey="id"
          scroll={{ x: 780 }}
          className="bo-table"
        />
      </Card>

      <RecordOutcomeModal followUp={modalRow} onCancel={() => setModalRow(null)} onSave={handleSaveOutcome} open={Boolean(modalRow)} saving={saving} />
    </div>
  )
}

// ============= DEFERRED WORK =============

type DeferredWorkRow = {
  id: string
  vehicleLabel: string
  description: string
  estimatedPrice: number
  declineReason: string
  remindAt: string
  status: DeferredWorkStatus
}

function mapDeferredWork(item: ApiDeferredWork): DeferredWorkRow {
  const vehicle = asVehicleRef(item.vehicleId)

  return {
    id: item._id || item.id || crypto.randomUUID(),
    vehicleLabel: vehicle ? `${vehicleName(vehicle)} - ${vehiclePlate(vehicle)}` : 'Not updated',
    description: item.description || 'Not updated',
    estimatedPrice: item.estimatedPrice || 0,
    declineReason: item.declineReason || 'Not provided',
    remindAt: item.remindAt || '',
    status: item.status || 'open',
  }
}

function DeferredWorkPanel({ token }: { token: string | null }) {
  const [items, setItems] = useState<DeferredWorkRow[]>([])
  const [totalValue, setTotalValue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string>()
  const { message: apiMessage, tone: apiTone, showError, showSuccess, clear: clearApiMessage } = useApiMessage()

  useEffect(() => {
    if (!token) return
    const authToken = token
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const response = await fetchDeferredWork(authToken, '?status=open')
        if (!cancelled) {
          setItems((response.deferredWork || []).map(mapDeferredWork))
          setTotalValue(response.totalEstimatedValue || 0)
        }
      } catch (err) {
        if (!cancelled) showError(err instanceof Error ? err.message : 'Unable to load deferred work from the API')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [token])

  async function handleResolve(row: DeferredWorkRow, status: 'converted' | 'dismissed') {
    if (!token) return
    setBusyId(row.id)
    clearApiMessage()
    try {
      await resolveDeferredWork(token, row.id, status)
      setItems((current) => current.filter((item) => item.id !== row.id))
      setTotalValue((current) => Math.max(0, current - row.estimatedPrice))
      showSuccess(status === 'converted' ? 'Marked as converted.' : 'Dismissed.')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to update the item')
    } finally {
      setBusyId(undefined)
    }
  }

  const columns: ColumnsType<DeferredWorkRow> = [
    {
      title: 'Vehicle',
      dataIndex: 'vehicleLabel',
      key: 'vehicleLabel',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Estimated price',
      dataIndex: 'estimatedPrice',
      key: 'estimatedPrice',
      render: (value: number) => formatMoney(value),
    },
    {
      title: 'Decline reason',
      dataIndex: 'declineReason',
      key: 'declineReason',
    },
    {
      title: 'Remind date',
      dataIndex: 'remindAt',
      key: 'remindAt',
      render: (value: string) => (value ? formatApiDate(value) : 'Not set'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, row) => (
        <div className="flex justify-end gap-2">
          <Button loading={busyId === row.id} onClick={() => handleResolve(row, 'converted')} size="small" type="primary">
            Convert
          </Button>
          <Button danger loading={busyId === row.id} onClick={() => handleResolve(row, 'dismissed')} size="small">
            Dismiss
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      {apiMessage ? <InlineBanner tone={apiTone}>{apiMessage}</InlineBanner> : null}

      <StatCard label="Pipeline value" note="Open deferred work" palette={advisorPalette} value={formatMoney(totalValue)} />

      <Card
        bordered={false}
        className="bo-card-hover bo-enter rounded-2xl"
        style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}
      >
        <Table
          columns={columns}
          dataSource={items}
          loading={loading}
          pagination={{ pageSize: 8, showTotal: (total) => `${total} items` }}
          rowKey="id"
          scroll={{ x: 960 }}
          className="bo-table"
        />
      </Card>
    </div>
  )
}

// ============= PAGE =============

export function CustomerCarePage() {
  const { token } = useAuth()

  return (
    <ServiceAdvisorShell title="Customer care">
      <Tabs
        defaultActiveKey="reminders"
        items={[
          { key: 'reminders', label: 'Reminders', children: <RemindersPanel token={token} /> },
          { key: 'followUps', label: 'Follow-ups', children: <FollowUpsPanel token={token} /> },
          { key: 'deferredWork', label: 'Deferred work', children: <DeferredWorkPanel token={token} /> },
        ]}
      />
    </ServiceAdvisorShell>
  )
}
