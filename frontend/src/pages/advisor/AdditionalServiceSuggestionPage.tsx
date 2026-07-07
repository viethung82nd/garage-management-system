import { useMemo, useState } from 'react'
import { Icon, type IconName } from '../../shared/ui/base'
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

const initialProposals: ExtraServiceProposal[] = [
  {
    affectedPart: 'Cụm phanh trước',
    customerImpact: 'Nếu tiếp tục sử dụng có thể gây rung vô lăng và tăng quãng đường phanh.',
    estimateMinutes: 75,
    evidenceCount: 4,
    id: 'brake-pad-front',
    laborCost: 650000,
    partsCost: 2450000,
    priority: 'high',
    reason: 'Má phanh trước mòn không đều, đĩa phanh có rãnh sâu ở mép ngoài.',
    serviceName: 'Thay má phanh trước & láng đĩa phanh',
    status: 'pending',
    technician: 'Nguyễn Minh',
  },
  {
    affectedPart: 'Lọc gió động cơ',
    customerImpact: 'Hiệu suất nạp khí giảm, xe hao nhiên liệu hơn khi chạy đô thị.',
    estimateMinutes: 20,
    evidenceCount: 2,
    id: 'air-filter',
    laborCost: 120000,
    partsCost: 480000,
    priority: 'medium',
    reason: 'Lọc gió bẩn, có nhiều bụi mịn và lá khô bám ở khe lọc.',
    serviceName: 'Thay lọc gió động cơ',
    status: 'sent',
    technician: 'Lê Lan Chi',
  },
  {
    affectedPart: 'Gầm xe bên phải',
    customerImpact: 'Cần kiểm tra thêm để tránh tiếng kêu khi qua gờ giảm tốc.',
    estimateMinutes: 45,
    evidenceCount: 3,
    id: 'suspension-bushing',
    laborCost: 420000,
    partsCost: 980000,
    priority: 'low',
    reason: 'Cao su càng A có dấu hiệu nứt nhẹ, chưa cần thay ngay nhưng nên báo khách.',
    serviceName: 'Kiểm tra và thay cao su càng A phải',
    status: 'pending',
    technician: 'Trần Quang Huy',
  },
]

const evidenceTiles = [
  { label: 'Ảnh má phanh', tone: 'bg-[#1b1c1c]' },
  { label: 'Ảnh đĩa phanh', tone: 'bg-[#ba0013]' },
  { label: 'Ảnh lọc gió', tone: 'bg-[#5f5e5e]' },
]

const statusLabels: Record<ProposalStatus, string> = {
  approved: 'Đã duyệt',
  pending: 'Chờ SA xử lý',
  rejected: 'Đã từ chối',
  sent: 'Đã gửi khách',
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value) + 'đ'
}

function statusClasses(status: ProposalStatus) {
  return {
    approved: 'border-green-200 bg-green-50 text-green-700',
    pending: 'border-[#ba0013] bg-[#fff1f1] text-[#ba0013]',
    rejected: 'border-[#d8d5d5] bg-[#fbf9f8] text-[#6a6767]',
    sent: 'border-amber-200 bg-amber-50 text-amber-700',
  }[status]
}

function priorityLabel(priority: ExtraServiceProposal['priority']) {
  return {
    high: 'Ưu tiên cao',
    low: 'Theo dõi',
    medium: 'Nên làm',
  }[priority]
}

function priorityClasses(priority: ExtraServiceProposal['priority']) {
  return {
    high: 'bg-[#ba0013] text-white',
    low: 'bg-[#e4e2e2] text-[#1b1c1c]',
    medium: 'bg-amber-100 text-amber-800',
  }[priority]
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

function ProposalCard({
  active,
  onSelect,
  proposal,
}: {
  active: boolean
  onSelect: () => void
  proposal: ExtraServiceProposal
}) {
  const total = proposal.laborCost + proposal.partsCost

  return (
    <button
      className={
        active
          ? 'w-full border-l-4 border-[#ba0013] bg-[#fffafa] p-5 text-left shadow-[0_10px_30px_rgba(27,28,28,0.05)]'
          : 'w-full border border-[#efeded] bg-white p-5 text-left transition hover:border-[#ba0013] hover:bg-[#fffafa]'
      }
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${priorityClasses(proposal.priority)}`}>
              {priorityLabel(proposal.priority)}
            </span>
            <span className={`border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClasses(proposal.status)}`}>
              {statusLabels[proposal.status]}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-black text-[#171717]">{proposal.serviceName}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#6a6767]">{proposal.reason}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#6a6767]">Tạm tính</p>
          <p className="mt-2 text-xl font-black text-[#ba0013]">{formatMoney(total)}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="bg-[#fbf9f8] p-3">
          <p className="font-mono text-[10px] font-black uppercase text-[#6a6767]">KTV đề xuất</p>
          <p className="mt-1 text-sm font-black text-[#171717]">{proposal.technician}</p>
        </div>
        <div className="bg-[#fbf9f8] p-3">
          <p className="font-mono text-[10px] font-black uppercase text-[#6a6767]">Thời gian</p>
          <p className="mt-1 text-sm font-black text-[#171717]">+{proposal.estimateMinutes} phút</p>
        </div>
        <div className="bg-[#fbf9f8] p-3">
          <p className="font-mono text-[10px] font-black uppercase text-[#6a6767]">Ảnh bằng chứng</p>
          <p className="mt-1 text-sm font-black text-[#171717]">{proposal.evidenceCount} ảnh</p>
        </div>
      </div>
    </button>
  )
}

function ProposalDetail({
  onStatusChange,
  proposal,
}: {
  onStatusChange: (status: ProposalStatus) => void
  proposal: ExtraServiceProposal
}) {
  const total = proposal.laborCost + proposal.partsCost

  return (
    <aside className="sticky top-28 space-y-6">
      <section className="bg-[#1b1c1c] p-6 text-white shadow-[0_18px_45px_rgba(15,14,14,0.18)]">
        <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-[#ffb4ab]">Chi tiết đề xuất</p>
        <h2 className="mt-3 text-2xl font-black">{proposal.serviceName}</h2>
        <p className="mt-3 text-sm leading-6 text-white/65">{proposal.customerImpact}</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="bg-white/10 p-4">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white/55">Phụ tùng</p>
            <p className="mt-2 text-xl font-black">{formatMoney(proposal.partsCost)}</p>
          </div>
          <div className="bg-white/10 p-4">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white/55">Công</p>
            <p className="mt-2 text-xl font-black">{formatMoney(proposal.laborCost)}</p>
          </div>
        </div>

        <div className="mt-5 border-t border-white/10 pt-5">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white/55">Tổng gửi khách</p>
          <p className="mt-2 text-3xl font-black text-[#ffb4ab]">{formatMoney(total)}</p>
        </div>
      </section>

      <section className="border border-[#efeded] bg-white p-6">
        <h3 className="text-lg font-black text-[#171717]">Ảnh & bằng chứng từ KTV</h3>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {evidenceTiles.map((tile, index) => (
            <div className={`aspect-square ${tile.tone} p-3 text-white`} key={tile.label}>
              <div className="flex h-full flex-col justify-between">
                <Icon name="car" />
                <span className="text-xs font-black">{tile.label}</span>
                <span className="font-mono text-[10px]">#{index + 1}</span>
              </div>
            </div>
          ))}
        </div>
        <textarea
          className="mt-4 min-h-28 w-full border border-[#d8d5d5] bg-[#fbf9f8] p-4 text-sm text-[#1b1c1c] outline-none focus:border-[#ba0013] focus:ring-4 focus:ring-[#ba0013]/10"
          defaultValue={`KTV ${proposal.technician} đề xuất do: ${proposal.reason}`}
        />
      </section>

      <section className="border border-[#efeded] bg-white p-6">
        <h3 className="text-lg font-black text-[#171717]">Thao tác của Service Advisor</h3>
        <div className="mt-4 space-y-3">
          <button
            className="flex min-h-12 w-full items-center justify-center gap-3 bg-[#ba0013] px-5 text-sm font-black uppercase text-white transition hover:bg-[#94000f]"
            onClick={() => onStatusChange('sent')}
            type="button"
          >
            <Icon name="invoice" />
            Gửi báo giá cho khách
          </button>
          <button
            className="flex min-h-12 w-full items-center justify-center gap-3 border border-[#ba0013] px-5 text-sm font-black uppercase text-[#ba0013] transition hover:bg-[#fff1f1]"
            onClick={() => onStatusChange('approved')}
            type="button"
          >
            <Icon name="check" />
            Duyệt bổ sung vào lệnh
          </button>
          <button
            className="flex min-h-12 w-full items-center justify-center gap-3 border border-[#d8d5d5] px-5 text-sm font-black uppercase text-[#555151] transition hover:border-[#ba0013] hover:text-[#ba0013]"
            onClick={() => onStatusChange('rejected')}
            type="button"
          >
            Từ chối đề xuất
          </button>
        </div>
      </section>
    </aside>
  )
}

export function AdditionalServiceSuggestionPage() {
  const [proposals, setProposals] = useState(initialProposals)
  const [selectedId, setSelectedId] = useState(initialProposals[0].id)

  const selectedProposal = proposals.find((proposal) => proposal.id === selectedId) ?? proposals[0]
  const pendingCount = proposals.filter((proposal) => proposal.status === 'pending').length
  const sentCount = proposals.filter((proposal) => proposal.status === 'sent').length
  const totalPendingValue = useMemo(
    () => proposals.filter((proposal) => proposal.status === 'pending').reduce((sum, proposal) => sum + proposal.partsCost + proposal.laborCost, 0),
    [proposals],
  )

  function updateStatus(status: ProposalStatus) {
    setProposals((current) => current.map((proposal) => (proposal.id === selectedProposal.id ? { ...proposal, status } : proposal)))
  }

  return (
    <ServiceAdvisorShell active="additional-services" title="Đề xuất dịch vụ phát sinh">
      <div className="space-y-7">
        <section className="relative overflow-hidden border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
          <div className="absolute right-8 top-8 hidden text-[#ba0013]/10 lg:block">
            <Icon className="h-32 w-32" name="plus" />
          </div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#ba0013]">Additional Service Flow</p>
          <h2 className="mt-3 text-4xl font-black leading-tight text-[#171717] md:text-5xl">Xử lý dịch vụ phát sinh trong lúc sửa</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#6a6767]">
            Service Advisor xem đề xuất từ kỹ thuật viên, kiểm tra ảnh bằng chứng, ước tính chi phí và quyết định gửi báo giá cho khách hoặc bổ sung vào lệnh sửa chữa.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard icon="alert" label="Chờ xử lý" value={`${pendingCount} đề xuất`} />
          <SummaryCard icon="invoice" label="Đã gửi khách" value={`${sentCount} báo giá`} />
          <SummaryCard icon="cash" label="Giá trị chờ duyệt" value={formatMoney(totalPendingValue)} />
        </section>

        <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="space-y-4">
            <div className="flex flex-col gap-3 border border-[#efeded] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-black text-[#171717]">Danh sách đề xuất từ kỹ thuật viên</h3>
                <p className="mt-1 text-sm font-semibold text-[#6a6767]">RO-2026-0882 - BMW M4 Competition - 51K-882.88</p>
              </div>
              <button className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#d8d5d5] px-4 text-sm font-black text-[#1b1c1c] transition hover:border-[#ba0013] hover:text-[#ba0013]" type="button">
                <Icon name="download" />
                Xuất báo giá
              </button>
            </div>

            {proposals.map((proposal) => (
              <ProposalCard
                active={proposal.id === selectedProposal.id}
                key={proposal.id}
                onSelect={() => setSelectedId(proposal.id)}
                proposal={proposal}
              />
            ))}
          </section>

          <ProposalDetail onStatusChange={updateStatus} proposal={selectedProposal} />
        </div>
      </div>
    </ServiceAdvisorShell>
  )
}
