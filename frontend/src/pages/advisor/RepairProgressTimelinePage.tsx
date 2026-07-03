import { useMemo, useState } from 'react'
import { Icon, type IconName } from '../../shared/ui/base'
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

const timelines: RepairTimeline[] = [
  {
    advisor: 'Minh Anh',
    customer: 'Alex Nguyễn',
    id: 'RO-2026-0882',
    plate: '51K-882.88',
    priority: 'high',
    progress: 62,
    promisedAt: '16:30',
    statusText: 'Đang sửa chữa',
    technician: 'Nguyễn Minh',
    vehicle: 'BMW M4 Competition',
    stages: [
      {
        customerVisible: true,
        description: 'Xe đã tiếp nhận tại quầy SA, đối chiếu biển số, tình trạng ngoại thất và yêu cầu khách hàng.',
        evidence: 'Phiếu nhận xe, ảnh 4 góc, thông tin ODO',
        id: 'received',
        owner: 'Minh Anh',
        status: 'done',
        time: '08:35',
        title: 'Tiếp nhận xe',
      },
      {
        customerVisible: true,
        description: 'Lệnh sửa chữa đã được tạo từ hồ sơ tiếp nhận và chuyển vào xưởng chính.',
        evidence: 'RO-2026-0882, 2 hạng mục dịch vụ',
        id: 'created',
        owner: 'Minh Anh',
        status: 'done',
        time: '08:48',
        title: 'Tạo lệnh sửa chữa',
      },
      {
        customerVisible: false,
        description: 'Kỹ thuật viên Nguyễn Minh nhận lệnh tại cầu nâng 01, bắt đầu kiểm tra phanh trước.',
        evidence: 'Phân công KTV, thời gian bắt đầu 09:12',
        id: 'assigned',
        owner: 'Nguyễn Minh',
        status: 'done',
        time: '09:12',
        title: 'Phân công KTV',
      },
      {
        customerVisible: true,
        description: 'Đã phát hiện má phanh trước mòn không đều. KTV đang đo thêm độ đảo đĩa phanh trước khi đề xuất phát sinh.',
        evidence: '3 ảnh kỹ thuật, chỉ số má phanh 2.8 mm',
        id: 'diagnosis',
        owner: 'Nguyễn Minh',
        status: 'active',
        time: '10:05',
        title: 'Chẩn đoán chi tiết',
      },
      {
        customerVisible: true,
        description: 'Chờ SA xác nhận báo giá phát sinh nếu cần thay đĩa phanh hoặc xử lý bề mặt đĩa.',
        evidence: 'Báo giá dự kiến chưa gửi khách',
        id: 'approval',
        owner: 'Minh Anh',
        status: 'upcoming',
        time: '11:20',
        title: 'Xác nhận phát sinh',
      },
      {
        customerVisible: true,
        description: 'Sau khi khách duyệt, xưởng lắp phụ tùng và chạy thử trước khi bàn giao.',
        evidence: 'Ảnh sau sửa, biên bản chạy thử',
        id: 'quality-check',
        owner: 'Nguyễn Minh',
        status: 'upcoming',
        time: '15:30',
        title: 'Kiểm tra chất lượng',
      },
    ],
  },
  {
    advisor: 'Minh Anh',
    customer: 'Sarah Trần',
    id: 'RO-2026-0885',
    plate: '30F-686.01',
    priority: 'medium',
    progress: 35,
    promisedAt: '17:00',
    statusText: 'Chờ phụ tùng',
    technician: 'Trần Quang Huy',
    vehicle: 'Audi RS6 Avant',
    stages: [
      {
        customerVisible: true,
        description: 'Xe đã tiếp nhận, khách yêu cầu kiểm tra toàn bộ hệ thống phanh.',
        evidence: 'Phiếu tiếp nhận và ảnh ngoại thất',
        id: 'received',
        owner: 'Minh Anh',
        status: 'done',
        time: '09:15',
        title: 'Tiếp nhận xe',
      },
      {
        customerVisible: true,
        description: 'Lệnh sửa chữa đã tạo và gán cho KTV chuyên phanh, gầm, treo.',
        evidence: 'RO-2026-0885',
        id: 'created',
        owner: 'Minh Anh',
        status: 'done',
        time: '09:35',
        title: 'Tạo lệnh sửa chữa',
      },
      {
        customerVisible: false,
        description: 'KTV đang chờ kho xác nhận má phanh đúng mã xe trước khi tháo cụm phanh.',
        evidence: 'Yêu cầu phụ tùng #PR-1208',
        id: 'parts',
        owner: 'Kho phụ tùng',
        status: 'blocked',
        time: '10:20',
        title: 'Chờ phụ tùng',
      },
      {
        customerVisible: true,
        description: 'SA sẽ cập nhật lại khách sau khi kho phản hồi thời gian có phụ tùng.',
        evidence: 'Tin nhắn hẹn phản hồi trước 11:30',
        id: 'customer-update',
        owner: 'Minh Anh',
        status: 'active',
        time: '11:00',
        title: 'Cập nhật khách hàng',
      },
    ],
  },
  {
    advisor: 'Minh Anh',
    customer: 'David Lê',
    id: 'RO-2026-0889',
    plate: '29A-404.95',
    priority: 'low',
    progress: 88,
    promisedAt: '14:30',
    statusText: 'Sắp bàn giao',
    technician: 'Lê Lan Chi',
    vehicle: 'Toyota GR Supra',
    stages: [
      {
        customerVisible: true,
        description: 'Khách chờ tại lounge, xe được đưa vào khu bảo dưỡng nhanh.',
        evidence: 'Phiếu nhận xe nhanh',
        id: 'received',
        owner: 'Minh Anh',
        status: 'done',
        time: '13:05',
        title: 'Tiếp nhận nhanh',
      },
      {
        customerVisible: false,
        description: 'Thay dầu động cơ, lọc dầu và kiểm tra mức dung dịch cơ bản.',
        evidence: 'Mobil 1 ESP X3 0W-40, lọc OEM',
        id: 'service',
        owner: 'Lê Lan Chi',
        status: 'done',
        time: '13:35',
        title: 'Bảo dưỡng nhanh',
      },
      {
        customerVisible: true,
        description: 'KTV đang kiểm tra lần cuối khoang máy, reset nhắc bảo dưỡng và chụp ảnh sau sửa.',
        evidence: 'Checklist QC 5/6 mục',
        id: 'qc',
        owner: 'Lê Lan Chi',
        status: 'active',
        time: '14:10',
        title: 'Kiểm tra chất lượng',
      },
      {
        customerVisible: true,
        description: 'SA chuẩn bị hóa đơn và gọi khách ra nhận xe sau khi QC hoàn tất.',
        evidence: 'Hóa đơn nháp INV-0889',
        id: 'handover',
        owner: 'Minh Anh',
        status: 'upcoming',
        time: '14:25',
        title: 'Chuẩn bị bàn giao',
      },
    ],
  },
]

const timeMarkers = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00']

const statusLabels: Record<TimelineStatus, string> = {
  active: 'Đang diễn ra',
  blocked: 'Đang vướng',
  done: 'Đã xong',
  upcoming: 'Sắp tới',
}

function priorityLabel(priority: Priority) {
  return {
    high: 'Gấp',
    low: 'Thường',
    medium: 'Nên theo dõi',
  }[priority]
}

function priorityClass(priority: Priority) {
  return {
    high: 'bg-[#ba0013] text-white',
    low: 'bg-[#e4e2e2] text-[#1b1c1c]',
    medium: 'bg-amber-100 text-amber-800',
  }[priority]
}

function statusClass(status: TimelineStatus) {
  return {
    active: 'border-[#ba0013] bg-[#fff1f1] text-[#ba0013]',
    blocked: 'border-amber-300 bg-amber-50 text-amber-800',
    done: 'border-green-200 bg-green-50 text-green-700',
    upcoming: 'border-[#d8d5d5] bg-[#fbf9f8] text-[#6a6767]',
  }[status]
}

function statusDotClass(status: TimelineStatus) {
  return {
    active: 'border-[#ba0013] bg-[#ba0013] text-white shadow-[0_0_0_8px_rgba(186,0,19,0.12)]',
    blocked: 'border-amber-500 bg-amber-500 text-white shadow-[0_0_0_8px_rgba(245,158,11,0.14)]',
    done: 'border-green-600 bg-green-600 text-white',
    upcoming: 'border-[#d8d5d5] bg-white text-[#8a8686]',
  }[status]
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

function OrderCard({ active, onSelect, timeline }: { active: boolean; onSelect: () => void; timeline: RepairTimeline }) {
  const activeStage = timeline.stages.find((stage) => stage.status === 'active')
  const blockedStage = timeline.stages.find((stage) => stage.status === 'blocked')

  return (
    <button
      className={active ? 'w-full border-l-4 border-[#ba0013] bg-[#fffafa] p-5 text-left shadow-[0_10px_30px_rgba(27,28,28,0.05)]' : 'w-full border border-[#efeded] bg-white p-5 text-left transition hover:border-[#ba0013] hover:bg-[#fffafa]'}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${priorityClass(timeline.priority)}`}>{priorityLabel(timeline.priority)}</span>
            <span className="border border-[#d8d5d5] bg-[#fbf9f8] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#6a6767]">{timeline.statusText}</span>
          </div>
          <h3 className="mt-3 text-lg font-black text-[#171717]">{timeline.vehicle}</h3>
          <p className="mt-1 font-mono text-xs font-bold text-[#ba0013]">{timeline.id} - {timeline.plate}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#6a6767]">Hẹn giao</p>
          <p className="mt-2 text-xl font-black text-[#171717]">{timeline.promisedAt}</p>
        </div>
      </div>
      <div className="mt-4 h-2 bg-[#efeded]">
        <div className="h-full bg-[#ba0013]" style={{ width: `${timeline.progress}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[#6a6767]">
        <span className="bg-[#fbf9f8] px-3 py-2">Khách: {timeline.customer}</span>
        <span className="bg-[#fbf9f8] px-3 py-2">KTV: {timeline.technician}</span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#6a6767]">
        {blockedStage ? `Vướng: ${blockedStage.title}` : activeStage ? `Đang ở bước: ${activeStage.title}` : 'Không có bước đang diễn ra'}
      </p>
    </button>
  )
}

function TimelineRail({ onSelectStage, selectedStageId, stages }: { onSelectStage: (stageId: string) => void; selectedStageId: string; stages: TimelineStage[] }) {
  return (
    <section className="overflow-hidden border border-[#efeded] bg-white shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
      <div className="flex flex-col gap-3 border-b border-[#efeded] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-black text-[#171717]">Timeline tiến độ theo thời gian</h3>
          <p className="mt-1 text-sm font-semibold text-[#6a6767]">Mỗi mốc thể hiện trạng thái thực tế trong xưởng và những gì khách hàng có thể xem.</p>
        </div>
        <span className="bg-[#fff1f1] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#ba0013]">03/07/2026</span>
      </div>

      <div className="overflow-x-auto p-6">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-9 border-b border-[#efeded] pb-3">
            {timeMarkers.map((marker) => (
              <div className="font-mono text-[11px] font-black uppercase tracking-[0.12em] text-[#8a8686]" key={marker}>{marker}</div>
            ))}
          </div>

          <div className="relative mt-8 min-h-[260px]">
            <div className="absolute left-0 right-0 top-10 h-1 bg-[#efeded]" />
            <div className="grid grid-cols-6 gap-4">
              {stages.map((stage, index) => {
                const selected = stage.id === selectedStageId

                return (
                  <button
                    className="relative pt-20 text-left"
                    key={stage.id}
                    onClick={() => onSelectStage(stage.id)}
                    type="button"
                  >
                    <span className={`absolute left-4 top-[28px] z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${statusDotClass(stage.status)}`}>
                      {stage.status === 'done' ? <Icon className="h-4 w-4" name="check" /> : index + 1}
                    </span>
                    <article className={selected ? 'min-h-40 border-l-4 border-[#ba0013] bg-[#fffafa] p-4 shadow-[0_10px_28px_rgba(27,28,28,0.08)]' : 'min-h-40 border border-[#efeded] bg-[#fbf9f8] p-4 transition hover:border-[#ba0013]'}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-mono text-xs font-black text-[#ba0013]">{stage.time}</p>
                        <span className={`border px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${statusClass(stage.status)}`}>{statusLabels[stage.status]}</span>
                      </div>
                      <h4 className="mt-3 text-base font-black leading-5 text-[#171717]">{stage.title}</h4>
                      <p className="mt-2 line-clamp-3 text-xs font-semibold leading-5 text-[#6a6767]">{stage.description}</p>
                    </article>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function StageDetail({ stage, timeline }: { stage: TimelineStage; timeline: RepairTimeline }) {
  return (
    <aside className="sticky top-28 space-y-7">
      <section className="bg-[#1b1c1c] p-6 text-white shadow-[0_18px_45px_rgba(15,14,14,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-[#ffb4ab]">Mốc đang chọn</p>
            <h3 className="mt-3 text-2xl font-black">{stage.title}</h3>
          </div>
          <span className={`border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass(stage.status)}`}>{statusLabels[stage.status]}</span>
        </div>
        <p className="mt-4 text-sm leading-6 text-white/70">{stage.description}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="bg-white/10 p-4">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white/55">Thời điểm</p>
            <p className="mt-2 text-xl font-black">{stage.time}</p>
          </div>
          <div className="bg-white/10 p-4">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white/55">Phụ trách</p>
            <p className="mt-2 text-xl font-black">{stage.owner}</p>
          </div>
        </div>
      </section>

      <section className="border border-[#efeded] bg-white p-6 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
        <h3 className="text-lg font-black text-[#171717]">Thông tin SA cần theo dõi</h3>
        <div className="mt-5 space-y-3">
          <div className="bg-[#fbf9f8] p-4">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#6a6767]">Khách hàng</p>
            <p className="mt-2 font-black text-[#171717]">{timeline.customer}</p>
            <p className="mt-1 text-sm font-semibold text-[#6a6767]">{timeline.vehicle} - {timeline.plate}</p>
          </div>
          <div className="bg-[#fbf9f8] p-4">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#6a6767]">Bằng chứng</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#171717]">{stage.evidence}</p>
          </div>
          <div className="bg-[#fbf9f8] p-4">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#6a6767]">Hiển thị cho khách</p>
            <p className={stage.customerVisible ? 'mt-2 font-black text-green-700' : 'mt-2 font-black text-[#ba0013]'}>{stage.customerVisible ? 'Có, khách có thể xem mốc này' : 'Không, chỉ nội bộ xưởng'}</p>
          </div>
        </div>
      </section>

      <section className="border border-[#efeded] bg-white p-6 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
        <h3 className="text-lg font-black text-[#171717]">Thao tác nhanh</h3>
        <div className="mt-4 space-y-3">
          <button className="flex min-h-12 w-full items-center justify-center gap-3 bg-[#ba0013] px-5 text-sm font-black uppercase text-white transition hover:bg-[#94000f]" type="button">
            <Icon name="bell" />
            Gửi cập nhật cho khách
          </button>
          <button className="flex min-h-12 w-full items-center justify-center gap-3 border border-[#d8d5d5] px-5 text-sm font-black uppercase text-[#1b1c1c] transition hover:border-[#ba0013] hover:text-[#ba0013]" type="button">
            <Icon name="plus" />
            Thêm mốc tiến độ
          </button>
          <button className="flex min-h-12 w-full items-center justify-center gap-3 border border-green-600 px-5 text-sm font-black uppercase text-green-700 transition hover:bg-green-50" type="button">
            <Icon name="check" />
            Xác nhận hoàn tất mốc
          </button>
        </div>
      </section>
    </aside>
  )
}

export function RepairProgressTimelinePage() {
  const [selectedTimelineId, setSelectedTimelineId] = useState(timelines[0].id)
  const selectedTimeline = timelines.find((timeline) => timeline.id === selectedTimelineId) ?? timelines[0]
  const [selectedStageId, setSelectedStageId] = useState(selectedTimeline.stages.find((stage) => stage.status === 'active')?.id ?? selectedTimeline.stages[0].id)

  const selectedStage = selectedTimeline.stages.find((stage) => stage.id === selectedStageId) ?? selectedTimeline.stages[0]
  const activeOrders = timelines.filter((timeline) => timeline.stages.some((stage) => stage.status === 'active')).length
  const blockedOrders = timelines.filter((timeline) => timeline.stages.some((stage) => stage.status === 'blocked')).length
  const customerVisibleStages = selectedTimeline.stages.filter((stage) => stage.customerVisible).length

  const nextCustomerUpdate = useMemo(() => {
    const active = selectedTimeline.stages.find((stage) => stage.status === 'active')
    const blocked = selectedTimeline.stages.find((stage) => stage.status === 'blocked')
    return blocked?.title ?? active?.title ?? 'Không có cập nhật mới'
  }, [selectedTimeline])

  function selectTimeline(id: string) {
    const timeline = timelines.find((item) => item.id === id)
    if (!timeline) {
      return
    }

    setSelectedTimelineId(id)
    setSelectedStageId(timeline.stages.find((stage) => stage.status === 'active')?.id ?? timeline.stages[0].id)
  }

  return (
    <ServiceAdvisorShell active="repair-timeline" title="Timeline tiến độ sửa chữa">
      <div className="space-y-7">
        <section className="relative overflow-hidden border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
          <div className="absolute right-8 top-8 hidden text-[#ba0013]/10 lg:block">
            <Icon className="h-32 w-32" name="map" />
          </div>
          <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_340px] xl:items-center">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#ba0013]">Repair Progress Timeline</p>
              <h2 className="mt-3 text-4xl font-black leading-tight text-[#171717] md:text-5xl">Theo dõi tiến độ sửa chữa trực quan theo thời gian</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#6a6767]">
                Service Advisor xem toàn bộ mốc xử lý của từng lệnh, biết bước nào đang diễn ra, bước nào bị vướng và mốc nào có thể gửi cho khách hàng.
              </p>
            </div>
            <div className="border border-[#efeded] bg-[#fbf9f8] p-5">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Lệnh đang xem</p>
              <p className="mt-2 text-3xl font-black text-[#ba0013]">{selectedTimeline.progress}%</p>
              <div className="mt-4 h-3 bg-[#e4e2e2]">
                <div className="h-full bg-[#ba0013]" style={{ width: `${selectedTimeline.progress}%` }} />
              </div>
              <p className="mt-3 text-sm font-semibold text-[#6a6767]">{selectedTimeline.id} - hẹn giao {selectedTimeline.promisedAt}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <SummaryCard icon="wrench" label="Lệnh đang sửa" value={String(activeOrders).padStart(2, '0')} />
          <SummaryCard icon="alert" label="Lệnh bị vướng" value={String(blockedOrders).padStart(2, '0')} />
          <SummaryCard icon="bell" label="Cần cập nhật" value={nextCustomerUpdate} />
          <SummaryCard icon="users" label="Mốc khách thấy" value={`${customerVisibleStages}/${selectedTimeline.stages.length}`} />
        </section>

        <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_410px]">
          <div className="space-y-7">
            <section className="grid gap-4 lg:grid-cols-3">
              {timelines.map((timeline) => (
                <OrderCard active={timeline.id === selectedTimeline.id} key={timeline.id} onSelect={() => selectTimeline(timeline.id)} timeline={timeline} />
              ))}
            </section>

            <TimelineRail onSelectStage={setSelectedStageId} selectedStageId={selectedStage.id} stages={selectedTimeline.stages} />

            <section className="grid gap-4 md:grid-cols-3">
              <div className="border border-[#efeded] bg-white p-5">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#6a6767]">Cố vấn phụ trách</p>
                <p className="mt-2 text-lg font-black text-[#171717]">{selectedTimeline.advisor}</p>
              </div>
              <div className="border border-[#efeded] bg-white p-5">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#6a6767]">Kỹ thuật viên</p>
                <p className="mt-2 text-lg font-black text-[#171717]">{selectedTimeline.technician}</p>
              </div>
              <div className="border border-[#efeded] bg-white p-5">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#6a6767]">Trạng thái</p>
                <p className="mt-2 text-lg font-black text-[#ba0013]">{selectedTimeline.statusText}</p>
              </div>
            </section>
          </div>

          <StageDetail stage={selectedStage} timeline={selectedTimeline} />
        </div>
      </div>
    </ServiceAdvisorShell>
  )
}
