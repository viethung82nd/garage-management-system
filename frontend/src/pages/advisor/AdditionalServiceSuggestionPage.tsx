import { CheckOutlined, FileTextOutlined, PictureOutlined } from '@ant-design/icons'
import { Button, Card, Empty, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { fetchAdditionalServiceProposals, personName, unwrapArray, updateAdditionalServiceProposal, type ApiAdditionalServiceProposal } from '../../shared/api/workshop'
import { useAuth } from '../../shared/auth'
import { StatCard, advisorPalette } from '../../widgets/backoffice-shell'
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
  pending: 'Awaiting SA review',
  rejected: 'Rejected',
  sent: 'Sent to customer',
}

const statusColors: Record<ProposalStatus, string> = {
  approved: 'green',
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
    customerImpact: proposal.customerImpact || 'No customer-impact notes yet.',
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

function ProposalCard({ active, onSelect, proposal }: { active: boolean; onSelect: () => void; proposal: ExtraServiceProposal }) {
  const total = proposal.laborCost + proposal.partsCost

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
            <Tag color={priorityColors[proposal.priority]}>{priorityLabels[proposal.priority]}</Tag>
            <Tag color={statusColors[proposal.status]}>{statusLabels[proposal.status]}</Tag>
          </div>
          <h3 style={{ color: advisorPalette.ink, fontSize: 18, fontWeight: 700, marginTop: 12 }}>{proposal.serviceName}</h3>
          <p style={{ color: advisorPalette.textMuted, fontSize: 13, fontWeight: 600, marginTop: 6 }}>{proposal.reason}</p>
        </div>
        <div className="text-right">
          <p style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Estimate</p>
          <p style={{ color: advisorPalette.red, fontSize: 18, fontWeight: 700, marginTop: 6 }}>{formatMoney(total)}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div style={{ background: advisorPalette.panelAlt, borderRadius: 14, padding: 12 }}>
          <p style={{ color: advisorPalette.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Suggested by</p>
          <p style={{ color: advisorPalette.ink, fontSize: 13, fontWeight: 700, marginTop: 4 }}>{proposal.technician}</p>
        </div>
        <div style={{ background: advisorPalette.panelAlt, borderRadius: 14, padding: 12 }}>
          <p style={{ color: advisorPalette.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Extra time</p>
          <p style={{ color: advisorPalette.ink, fontSize: 13, fontWeight: 700, marginTop: 4 }}>+{proposal.estimateMinutes} min</p>
        </div>
        <div style={{ alignItems: 'center', background: advisorPalette.panelAlt, borderRadius: 14, display: 'flex', gap: 6, padding: 12 }}>
          <PictureOutlined style={{ color: advisorPalette.textMuted }} />
          <p style={{ color: advisorPalette.ink, fontSize: 13, fontWeight: 700 }}>{proposal.evidenceCount} photo(s)</p>
        </div>
      </div>
    </button>
  )
}

function ProposalDetail({ disabled, onStatusChange, proposal }: { disabled: boolean; onStatusChange: (status: ProposalStatus) => void; proposal: ExtraServiceProposal }) {
  const total = proposal.laborCost + proposal.partsCost

  return (
    <div className="flex flex-col gap-5" style={{ position: 'sticky', top: 96 }}>
      <Card bordered={false} className="rounded-[32px]" style={{ background: advisorPalette.ink, boxShadow: advisorPalette.shadow }}>
        <p style={{ color: '#ffb4ab', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Proposal detail</p>
        <h2 style={{ color: 'white', fontSize: 22, fontWeight: 700, marginTop: 10 }}>{proposal.serviceName}</h2>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 10 }}>{proposal.customerImpact}</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14 }}>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Parts</p>
            <p style={{ color: 'white', fontSize: 18, fontWeight: 700, marginTop: 6 }}>{formatMoney(proposal.partsCost)}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14 }}>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Labor</p>
            <p style={{ color: 'white', fontSize: 18, fontWeight: 700, marginTop: 6 }}>{formatMoney(proposal.laborCost)}</p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 16, paddingTop: 16 }}>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Total to customer</p>
          <p style={{ color: '#ffb4ab', fontSize: 28, fontWeight: 700, marginTop: 8 }}>{formatMoney(total)}</p>
        </div>
      </Card>

      <Card bordered={false} className="rounded-[32px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title="Evidence from the technician">
        <div className="flex items-center gap-2" style={{ color: advisorPalette.textMuted, fontSize: 13, fontWeight: 600 }}>
          <PictureOutlined />
          {proposal.evidenceCount} photo(s) attached
        </div>
      </Card>

      <Card bordered={false} className="rounded-[32px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title="Service advisor actions">
        <div className="flex flex-col gap-3">
          <Button block disabled={disabled} icon={<FileTextOutlined />} onClick={() => onStatusChange('sent')} type="primary">
            Send quote to customer
          </Button>
          <Button block disabled={disabled} icon={<CheckOutlined />} onClick={() => onStatusChange('approved')}>
            Approve into work order
          </Button>
          <Button block disabled={disabled} onClick={() => onStatusChange('rejected')}>
            Reject proposal
          </Button>
        </div>
      </Card>
    </div>
  )
}

export function AdditionalServiceSuggestionPage() {
  const { token } = useAuth()
  const [proposals, setProposals] = useState<ExtraServiceProposal[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [apiMessage, setApiMessage] = useState<string>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    const authToken = token

    let cancelled = false

    async function loadProposals() {
      setApiMessage(undefined)
      try {
        const response = await fetchAdditionalServiceProposals(authToken)
        const nextProposals = unwrapArray<ApiAdditionalServiceProposal>(response, ['proposals']).map(mapProposal)
        if (!cancelled) {
          setProposals(nextProposals)
          setSelectedId((current) => current || nextProposals[0]?.id || '')
        }
      } catch (err) {
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Unable to load additional service proposals from the API')
      }
    }

    void loadProposals()

    return () => {
      cancelled = true
    }
  }, [token])

  const selectedProposal = proposals.find((proposal) => proposal.id === selectedId) ?? proposals[0]
  const pendingCount = proposals.filter((proposal) => proposal.status === 'pending').length
  const sentCount = proposals.filter((proposal) => proposal.status === 'sent').length
  const totalPendingValue = useMemo(
    () => proposals.filter((proposal) => proposal.status === 'pending').reduce((sum, proposal) => sum + proposal.partsCost + proposal.laborCost, 0),
    [proposals],
  )

  async function updateStatus(status: ProposalStatus) {
    if (!selectedProposal || !token) return

    setSaving(true)
    setApiMessage(undefined)

    try {
      const updated = await updateAdditionalServiceProposal(token, selectedProposal.id, status)
      const mapped = mapProposal(updated)
      setProposals((current) => current.map((proposal) => (proposal.id === selectedProposal.id ? { ...proposal, ...mapped, status } : proposal)))
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Unable to update the proposal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ServiceAdvisorShell title="Additional service proposals">
      {apiMessage ? (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 18, color: '#991b1b', padding: '12px 16px' }}>
          {apiMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4">
        <StatCard label="Pending review" palette={advisorPalette} value={pendingCount} />
        <StatCard label="Sent to customer" palette={advisorPalette} value={sentCount} />
        <StatCard label="Pending value" palette={advisorPalette} value={formatMoney(totalPendingValue)} />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4">
          <Card bordered={false} className="rounded-[28px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title="Proposals from technicians">
            <div className="flex flex-col gap-4">
              {proposals.length ? (
                proposals.map((proposal) => (
                  <ProposalCard active={proposal.id === selectedProposal?.id} key={proposal.id} onSelect={() => setSelectedId(proposal.id)} proposal={proposal} />
                ))
              ) : (
                <Empty description="No additional service proposals from the API yet." />
              )}
            </div>
          </Card>
        </div>

        {selectedProposal ? (
          <ProposalDetail disabled={saving} onStatusChange={updateStatus} proposal={selectedProposal} />
        ) : (
          <Card bordered={false} className="rounded-[28px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }}>
            Select a proposal to review it.
          </Card>
        )}
      </div>
    </ServiceAdvisorShell>
  )
}
