import { CheckOutlined, FileTextOutlined, PictureOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Empty, Input, InputNumber, Modal, Select, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { fetchAdditionalServiceProposals, personName, unwrapArray, updateAdditionalServiceProposal, type ApiAdditionalServiceProposal, type ApprovalChannel, type ApprovalEvidence } from '../../shared/api/workshop'
import { getUserInitials, useAuth } from '../../shared/auth'
import { InlineBanner, StatCard, advisorPalette, useApiMessage } from '../../widgets/backoffice-shell'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

type ProposalStatus = 'pending' | 'sent' | 'approved' | 'rejected'

type ExtraServiceProposal = {
  id: string
  affectedPart: string
  customerImpact: string
  estimateMinutes: number
  evidenceCount: number
  laborCost: number
  partsCost: number
  priority: 'high' | 'medium' | 'low'
  reason: string
  serviceName: string
  status: ProposalStatus
  technician: string
}

const statusLabels: Record<ProposalStatus, string> = {
  approved: 'Approved',
  pending: 'Awaiting review',
  rejected: 'Rejected',
  sent: 'Sent to customer',
}

const statusColors: Record<ProposalStatus, string> = {
  approved: 'success',
  pending: 'red',
  rejected: 'default',
  sent: 'gold',
}

const priorityLabels: Record<ExtraServiceProposal['priority'], string> = {
  high: 'High priority',
  low: 'Monitor',
  medium: 'Recommended',
}

const priorityColors: Record<ExtraServiceProposal['priority'], string> = {
  high: 'red',
  low: 'default',
  medium: 'gold',
}

function mapProposal(proposal: ApiAdditionalServiceProposal): ExtraServiceProposal {
  return {
    affectedPart: proposal.affectedPart || 'Not updated',
    customerImpact: proposal.customerImpact || '',
    estimateMinutes: proposal.estimateMinutes || 0,
    evidenceCount: proposal.evidenceCount || 0,
    id: proposal._id || proposal.id || crypto.randomUUID(),
    laborCost: proposal.laborCost || 0,
    partsCost: proposal.partsCost || 0,
    priority: proposal.priority || 'medium',
    reason: proposal.reason || 'No reason provided.',
    serviceName: proposal.serviceName || 'Additional service',
    status: proposal.status || 'pending',
    technician: personName(proposal.technician, 'Technician'),
  }
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}

function statusAccent(status: ProposalStatus) {
  switch (status) {
    case 'pending':
      return advisorPalette.red
    case 'sent':
      return advisorPalette.amber
    case 'approved':
      return advisorPalette.green
    case 'rejected':
    default:
      return advisorPalette.border
  }
}

function ProposalRow({ proposal, selected, onSelect }: { proposal: ExtraServiceProposal; selected: boolean; onSelect: () => void }) {
  // A pending proposal has no SA-set price yet — show the technician's time
  // estimate instead of a misleading "0 ₫". Once the SA has priced it (sent
  // or approved), the real total is meaningful.
  const isPriced = proposal.status !== 'pending'
  const accent = statusAccent(proposal.status)
  return (
    <button
      className="bo-card-hover"
      onClick={onSelect}
      type="button"
      style={{
        background: selected ? advisorPalette.panelAlt : advisorPalette.panel,
        border: `1px solid ${selected ? accent : advisorPalette.border}`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 14,
        cursor: 'pointer',
        padding: '14px 16px',
        textAlign: 'left',
        width: '100%',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div style={{ minWidth: 0 }}>
          <div style={{ color: advisorPalette.ink, fontSize: 15, fontWeight: 700 }}>{proposal.serviceName}</div>
          <div style={{ color: advisorPalette.textMuted, fontSize: 13, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proposal.reason}</div>
        </div>
        <Tag color={statusColors[proposal.status]} style={{ marginRight: 0 }}>{statusLabels[proposal.status]}</Tag>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5" style={{ color: advisorPalette.textMuted, fontSize: 12, fontWeight: 600 }}>
          <Avatar size={18} style={{ background: advisorPalette.ink, fontSize: 9 }}>{getUserInitials(proposal.technician)}</Avatar>
          {proposal.technician}
        </span>
        {isPriced ? (
          <span style={{ color: advisorPalette.ink, fontSize: 14, fontWeight: 700 }}>{formatMoney(proposal.laborCost + proposal.partsCost)}</span>
        ) : (
          <span style={{ color: advisorPalette.textMuted, fontSize: 12, fontWeight: 600 }}>+{proposal.estimateMinutes} min · not priced yet</span>
        )}
      </div>
    </button>
  )
}

export function AdditionalServiceSuggestionPage() {
  const { token } = useAuth()
  const [proposals, setProposals] = useState<ExtraServiceProposal[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [editedLaborCost, setEditedLaborCost] = useState(0)
  const [editedPartsCost, setEditedPartsCost] = useState(0)
  const { message: apiMessage, tone: apiTone, showError, showSuccess, clear: clearApiMessage } = useApiMessage()
  const [saving, setSaving] = useState(false)
  const [approvalOpen, setApprovalOpen] = useState(false)

  useEffect(() => {
    if (!token) return
    const authToken = token

    let cancelled = false

    async function loadProposals() {
      clearApiMessage()
      try {
        const response = await fetchAdditionalServiceProposals(authToken)
        const nextProposals = unwrapArray<ApiAdditionalServiceProposal>(response, ['proposals']).map(mapProposal)
        if (!cancelled) {
          setProposals(nextProposals)
          setSelectedId((current) => (current && nextProposals.some((item) => item.id === current) ? current : nextProposals.find((item) => item.status === 'pending')?.id || nextProposals[0]?.id || ''))
        }
      } catch (err) {
        if (!cancelled) showError(err instanceof Error ? err.message : 'Unable to load additional service proposals from the API')
      }
    }

    void loadProposals()

    return () => {
      cancelled = true
    }
  }, [token])

  const selectedProposal = proposals.find((proposal) => proposal.id === selectedId)

  // Reset the editable price to the technician's estimate whenever the
  // selected proposal changes — the SA's edit is per-proposal, not sticky.
  useEffect(() => {
    setEditedLaborCost(selectedProposal?.laborCost || 0)
    setEditedPartsCost(selectedProposal?.partsCost || 0)
  }, [selectedProposal?.id])

  const pendingCount = proposals.filter((proposal) => proposal.status === 'pending').length
  const sentCount = proposals.filter((proposal) => proposal.status === 'sent').length
  // Total of what's actively quoted to customers awaiting their decision —
  // pending proposals have no SA-set price yet, so they contribute nothing here.
  const totalQuotedValue = useMemo(
    () => proposals.filter((proposal) => proposal.status === 'sent').reduce((sum, proposal) => sum + proposal.partsCost + proposal.laborCost, 0),
    [proposals],
  )
  const isResolved = selectedProposal?.status === 'approved' || selectedProposal?.status === 'rejected'

  async function updateStatus(status: ProposalStatus, approval?: ApprovalEvidence) {
    if (!selectedProposal || !token) return
    if (isResolved) {
      showError(`This proposal was already ${selectedProposal.status} and can no longer be changed.`)
      return
    }

    setSaving(true)
    clearApiMessage()

    try {
      // The technician's labor/parts cost is only an estimate — this is the
      // price the SA actually confirms, whether sending the quote to the
      // customer or approving the line straight onto the work order.
      const updated = await updateAdditionalServiceProposal(token, selectedProposal.id, status, {
        laborCost: editedLaborCost,
        partsCost: editedPartsCost,
        approval,
      })
      const mapped = mapProposal(updated)
      setProposals((current) => current.map((proposal) => (proposal.id === selectedProposal.id ? { ...proposal, ...mapped, status } : proposal)))
      showSuccess(
        status === 'approved'
          ? 'Approved and added to the work order.'
          : status === 'rejected'
            ? 'Proposal rejected.'
            : updated.hasEmailOnFile !== false
              ? 'Quote sent to the customer.'
              : 'Quote marked as sent, but this customer has no email on file — they can only see it by logging in.',
      )
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to update the proposal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ServiceAdvisorShell title="Additional service proposals">
      {apiMessage ? <InlineBanner tone={apiTone}>{apiMessage}</InlineBanner> : null}

      <div className="flex flex-wrap gap-4">
        <StatCard label="Pending review" palette={advisorPalette} value={pendingCount} enterDelay={1} />
        <StatCard label="Sent to customer" palette={advisorPalette} value={sentCount} enterDelay={2} />
        <StatCard label="Quoted to customers" palette={advisorPalette} value={formatMoney(totalQuotedValue)} enterDelay={3} />
      </div>

      <div className="grid items-start gap-5 *:min-w-0 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card
          bordered={false}
          className="bo-card-hover bo-enter rounded-2xl"
          style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}
          styles={{ body: { padding: 18 } }}
          title="Proposals from technicians"
        >
          {proposals.length ? (
            <div className="flex flex-col gap-3">
              {proposals.map((proposal) => (
                <ProposalRow key={proposal.id} onSelect={() => setSelectedId(proposal.id)} proposal={proposal} selected={proposal.id === selectedId} />
              ))}
            </div>
          ) : (
            <Empty description="No additional service proposals from the API yet." image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>

        {selectedProposal ? (
          <div className="flex flex-col gap-5" style={{ position: 'sticky', top: 96 }}>
            <Card bordered={false} className="bo-enter rounded-2xl" style={{ background: advisorPalette.ink, boxShadow: advisorPalette.shadow }} styles={{ body: { padding: 22 } }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p style={{ color: '#ffb4ab', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Proposal</p>
                  <h2 style={{ color: 'white', fontSize: 20, fontWeight: 700, marginTop: 6 }}>{selectedProposal.serviceName}</h2>
                </div>
                <Tag color={priorityColors[selectedProposal.priority]} style={{ marginRight: 0 }}>{priorityLabels[selectedProposal.priority]}</Tag>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 10 }}>{selectedProposal.reason}</p>
              {selectedProposal.customerImpact ? (
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 6 }}>Customer impact: {selectedProposal.customerImpact}</p>
              ) : null}

              <div className="flex items-center justify-between" style={{ marginTop: 20 }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Price</p>
                  <p style={{ color: '#ffb4ab', fontSize: 24, fontWeight: 700, marginTop: 4 }}>
                    {selectedProposal.status === 'pending' ? 'Not set yet' : formatMoney(selectedProposal.laborCost + selectedProposal.partsCost)}
                  </p>
                </div>
                <div className="text-right">
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Technician's time estimate</p>
                  <p style={{ color: 'white', fontSize: 16, fontWeight: 700, marginTop: 4 }}>+{selectedProposal.estimateMinutes} min</p>
                </div>
              </div>

              {selectedProposal.evidenceCount > 0 ? (
                <div className="mt-4 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 600 }}>
                  <PictureOutlined /> {selectedProposal.evidenceCount} photo(s) attached
                </div>
              ) : null}
            </Card>

            <Card bordered={false} className="bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }} title="Service advisor actions">
              {isResolved ? (
                <p style={{ color: advisorPalette.textMuted, fontSize: 13 }}>
                  This proposal was already {selectedProposal.status === 'approved' ? 'approved and added to the work order' : 'rejected'}. This decision is final.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <p style={{ color: advisorPalette.textMuted, fontSize: 12, fontWeight: 600, margin: 0 }}>
                    The technician only flags the work needed — set the price before sending it to the customer or approving it.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Labour</div>
                      <InputNumber min={0} onChange={(value) => setEditedLaborCost(Math.max(0, Number(value) || 0))} style={{ width: '100%' }} value={editedLaborCost} />
                    </div>
                    <div>
                      <div style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Parts</div>
                      <InputNumber min={0} onChange={(value) => setEditedPartsCost(Math.max(0, Number(value) || 0))} style={{ width: '100%' }} value={editedPartsCost} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between" style={{ background: advisorPalette.panelAlt, borderRadius: 12, padding: '10px 14px' }}>
                    <span style={{ color: advisorPalette.textMuted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Price to quote</span>
                    <span style={{ color: advisorPalette.ink, fontSize: 16, fontWeight: 700 }}>{formatMoney(editedLaborCost + editedPartsCost)}</span>
                  </div>

                  <Button block disabled={saving} icon={<FileTextOutlined />} onClick={() => updateStatus('sent')} size="large" type="primary">
                    Send quote to customer
                  </Button>
                  <Button block disabled={saving} icon={<CheckOutlined />} onClick={() => setApprovalOpen(true)}>
                    Approve into work order
                  </Button>
                  <Button block danger disabled={saving} onClick={() => updateStatus('rejected')} type="text">
                    Reject proposal
                  </Button>
                </div>
              )}
            </Card>
          </div>
        ) : (
          <Card bordered={false} className="bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}>
            <Empty description="Select a proposal to review it." image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </Card>
        )}
      </div>

      <CustomerAuthorisationModal
        amount={editedLaborCost + editedPartsCost}
        onCancel={() => setApprovalOpen(false)}
        onConfirm={async (evidence) => {
          await updateStatus('approved', evidence)
          setApprovalOpen(false)
        }}
        open={approvalOpen}
        saving={saving}
        serviceName={selectedProposal?.serviceName ?? ''}
      />
    </ServiceAdvisorShell>
  )
}

const CHANNEL_OPTIONS: { label: string; value: ApprovalChannel }[] = [
  { label: 'In person (at the desk)', value: 'inPerson' },
  { label: 'Phone call', value: 'phone' },
  { label: 'Zalo', value: 'zalo' },
  { label: 'SMS', value: 'sms' },
  { label: 'Email', value: 'email' },
]

/**
 * Captures proof that the CUSTOMER authorised extra work before it is billed.
 *
 * Approving a proposal charges the customer beyond the estimate they already
 * agreed to, so the backend refuses to do it on an advisor's click alone — it
 * requires who authorised it and through which channel. This dialog is where
 * the advisor records that conversation. Customers with an account approve it
 * themselves in the customer portal and never reach this screen.
 */
function CustomerAuthorisationModal({
  amount,
  onCancel,
  onConfirm,
  open,
  saving,
  serviceName,
}: {
  amount: number
  onCancel: () => void
  onConfirm: (evidence: ApprovalEvidence) => void | Promise<void>
  open: boolean
  saving: boolean
  serviceName: string
}) {
  const [channel, setChannel] = useState<ApprovalChannel>('phone')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)

  // Reset each time the dialog opens so one approval's details can't bleed
  // into the next.
  useEffect(() => {
    if (open) {
      setChannel('phone')
      setName('')
      setContact('')
      setNote('')
      setTouched(false)
    }
  }, [open])

  const nameError = touched && !name.trim() ? 'Enter the name of the person who authorised this.' : ''

  return (
    <Modal
      cancelText="Cancel"
      confirmLoading={saving}
      okText="Record authorisation & approve"
      onCancel={onCancel}
      onOk={() => {
        setTouched(true)
        if (!name.trim()) return
        void onConfirm({
          channel,
          decidedByName: name.trim(),
          contactValue: contact.trim() || undefined,
          note: note.trim() || undefined,
        })
      }}
      open={open}
      title="Record the customer's authorisation"
    >
      <p style={{ color: advisorPalette.textMuted, fontSize: 13, marginBottom: 16 }}>
        You are about to add <strong style={{ color: advisorPalette.ink }}>{serviceName}</strong> ({formatMoney(amount)}) to
        this work order. Extra work may only be billed once the customer has agreed, so record how you obtained that
        agreement.
      </p>

      <div className="flex flex-col gap-3">
        <label>
          <div style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>
            How was it obtained? <span aria-hidden="true">*</span>
          </div>
          <Select onChange={setChannel} options={CHANNEL_OPTIONS} style={{ width: '100%' }} value={channel} />
        </label>

        <label>
          <div style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>
            Who authorised it? <span aria-hidden="true">*</span>
          </div>
          <Input
            onBlur={() => setTouched(true)}
            onChange={(event) => setName(event.target.value)}
            placeholder="Customer's full name"
            status={nameError ? 'error' : undefined}
            value={name}
          />
          {nameError ? (
            <div role="alert" style={{ color: '#d4380d', fontSize: 12, marginTop: 4 }}>
              {nameError}
            </div>
          ) : null}
        </label>

        <label>
          <div style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>
            Phone or email contacted
          </div>
          <Input
            onChange={(event) => setContact(event.target.value)}
            placeholder="e.g. 0901234567"
            value={contact}
          />
        </label>

        <label>
          <div style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>
            Note (optional)
          </div>
          <Input.TextArea
            autoSize={{ maxRows: 4, minRows: 2 }}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Anything the customer said worth recording"
            value={note}
          />
        </label>
      </div>
    </Modal>
  )
}
