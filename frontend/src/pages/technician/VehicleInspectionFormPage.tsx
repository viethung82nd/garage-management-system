import { useEffect, useMemo, useState } from 'react'
import {
  fetchWorkshopRepairOrders,
  orderId,
  personName,
  submitInspectionResult,
  unwrapArray,
  vehicleName,
  vehiclePlate,
  type ApiRepairOrder,
  type InspectionItemStatus,
} from '../../shared/api/workshop'
import { useAuth } from '../../shared/auth'
import { Icon, type IconName } from '../../shared/ui/base'
import { TechnicianShell } from '../../widgets/technician-shell'

type InspectionItem = {
  id: string
  category: string
  label: string
  status: InspectionItemStatus
  note: string
  laborCost: number
  partsCost: number
}

type ChecklistSeed = {
  category: string
  icon: IconName
  items: string[]
}

const checklistSeed: ChecklistSeed[] = [
  { category: 'Động cơ', icon: 'wrench', items: ['Dầu động cơ & rò rỉ', 'Dây curoa & pu-li', 'Hệ thống làm mát'] },
  { category: 'Phanh', icon: 'lift', items: ['Má phanh trước', 'Má phanh sau', 'Dầu phanh & đường ống'] },
  { category: 'Gầm & treo', icon: 'car', items: ['Giảm xóc', 'Rotuyn & thanh cân bằng', 'Lốp & áp suất'] },
  { category: 'Điện & ắc quy', icon: 'bolt', items: ['Ắc quy & sạc', 'Đèn & tín hiệu', 'Máy phát'] },
  { category: 'Dung dịch & lọc', icon: 'clipboard', items: ['Nước làm mát', 'Dầu hộp số', 'Lọc gió & lọc dầu'] },
]

const statusMeta: Record<InspectionItemStatus, { label: string; active: string; idle: string }> = {
  monitor: { active: 'bg-amber-100 text-amber-800 border-amber-300', idle: 'border-[#d8d5d5] text-[#6a6767]', label: 'Theo dõi' },
  ok: { active: 'bg-green-50 text-green-700 border-green-300', idle: 'border-[#d8d5d5] text-[#6a6767]', label: 'Đạt' },
  repair: { active: 'bg-[#fff1f1] text-[#ba0013] border-[#ba0013]', idle: 'border-[#d8d5d5] text-[#6a6767]', label: 'Cần sửa' },
}

const fuelLevels = ['Trống', '1/4', '1/2', '3/4', 'Đầy']

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(value)) + 'đ'
}

function seedItems(): InspectionItem[] {
  return checklistSeed.flatMap((group) =>
    group.items.map((label) => ({
      category: group.category,
      id: crypto.randomUUID(),
      label,
      laborCost: 0,
      note: '',
      partsCost: 0,
      status: 'ok' as InspectionItemStatus,
    })),
  )
}

function StatCard({ icon, label, tone, value }: { icon: IconName; label: string; tone: string; value: string }) {
  return (
    <section className="border border-[#efeded] bg-white p-5 shadow-[0_18px_40px_rgba(27,28,28,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.14em] text-[#6a6767]">{label}</p>
          <p className={`mt-2 text-2xl font-black ${tone}`}>{value}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center bg-[#fff1f1] text-[#ba0013]">
          <Icon name={icon} />
        </span>
      </div>
    </section>
  )
}

export function VehicleInspectionFormPage() {
  const { token, user } = useAuth()
  const [repairOrder, setRepairOrder] = useState<ApiRepairOrder>()
  const [items, setItems] = useState<InspectionItem[]>(() => seedItems())
  const [odometer, setOdometer] = useState('')
  const [fuelLevel, setFuelLevel] = useState('1/2')
  const [overallNote, setOverallNote] = useState('')
  const [apiMessage, setApiMessage] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!token) return
    const authToken = token
    let cancelled = false

    async function loadAssignedOrder() {
      setApiMessage(undefined)
      try {
        const userId = user?._id || user?.id
        const response = await fetchWorkshopRepairOrders(authToken, userId ? '?technicianId=' + encodeURIComponent(userId) : '')
        const orders = unwrapArray<ApiRepairOrder>(response, ['repairOrders', 'orders'])
        if (!cancelled) setRepairOrder(orders[0])
      } catch (err) {
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Không tải được lệnh sửa chữa được giao từ API')
      }
    }

    void loadAssignedOrder()
    return () => {
      cancelled = true
    }
  }, [token, user?._id, user?.id])

  function updateItem(id: string, patch: Partial<InspectionItem>) {
    setSubmitted(false)
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function setStatus(id: string, status: InspectionItemStatus) {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item
        // Khi chuyển về "Đạt" thì xoá chi phí ước tính cho gọn.
        return status === 'ok' ? { ...item, laborCost: 0, note: item.note, partsCost: 0, status } : { ...item, status }
      }),
    )
    setSubmitted(false)
  }

  const repairItems = useMemo(() => items.filter((item) => item.status === 'repair'), [items])
  const monitorCount = items.filter((item) => item.status === 'monitor').length
  const totalEstimate = repairItems.reduce((sum, item) => sum + item.laborCost + item.partsCost, 0)
  const groups = useMemo(() => checklistSeed.map((seed) => ({ ...seed, list: items.filter((item) => item.category === seed.category) })), [items])

  const repairVehicle = repairOrder?.vehicleId || repairOrder?.vehicle
  const repairOrderLabel = repairOrder ? orderId(repairOrder) : 'Chưa có lệnh'
  const vehicleLabel = repairOrder ? vehicleName(repairVehicle) + ' - ' + vehiclePlate(repairVehicle) : 'Chưa có xe được giao'
  const customerLabel = repairOrder ? personName(repairOrder.customer, 'Chưa có khách hàng') : 'Chưa có khách hàng'

  async function submitInspection() {
    if (!token) return
    const repairOrderIdValue = repairOrder?._id || repairOrder?.id
    if (!repairOrderIdValue) {
      setApiMessage('Chưa có lệnh sửa chữa được giao để gửi kết quả.')
      return
    }

    setSaving(true)
    setApiMessage(undefined)
    try {
      await submitInspectionResult(token, repairOrderIdValue, {
        estimatedCost: totalEstimate,
        fuelLevel,
        items: items.map((item) => ({
          category: item.category,
          label: item.label,
          laborCost: item.laborCost,
          note: item.note,
          partsCost: item.partsCost,
          status: item.status,
        })),
        odometer: Number(odometer) || undefined,
        overallNote,
      })
      setSubmitted(true)
      setApiMessage('Đã gửi kết quả kiểm tra và chi phí ước tính cho cố vấn dịch vụ.')
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Không gửi được kết quả kiểm tra. Kiểm tra lại kết nối API.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <TechnicianShell active="inspection-form" eyebrow="Vehicle Inspection Form" notificationCount={1} title="Phiếu kiểm tra xe">
      <div className="space-y-7">
        {apiMessage ? <div className="border border-[#e7bdb8] bg-[#fffafa] px-5 py-4 text-sm font-bold text-[#ba0013]">{apiMessage}</div> : null}

        <section className="relative overflow-hidden border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
          <div className="absolute right-8 top-8 hidden text-[#ba0013]/10 lg:block">
            <Icon className="h-32 w-32" name="clipboard" />
          </div>
          <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_320px] xl:items-center">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#ba0013]">Phiếu kiểm tra {repairOrderLabel}</p>
              <h2 className="mt-3 text-4xl font-black leading-tight text-[#171717] md:text-5xl">{vehicleLabel}</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#6a6767]">
                Kỹ thuật viên đánh giá từng hạng mục, ghi nhận tình trạng và ước tính chi phí sửa chữa. Kết quả được gửi cho cố vấn
                dịch vụ để lập báo giá cho khách hàng.
              </p>
            </div>
            <div className="border border-[#efeded] bg-[#fbf9f8] p-5">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Khách hàng</p>
              <p className="mt-2 text-lg font-black text-[#171717]">{customerLabel}</p>
              <p className="mt-3 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Trạng thái phiếu</p>
              <p className="mt-1 text-2xl font-black text-[#ba0013]">{submitted ? 'Đã gửi SA' : 'Đang kiểm tra'}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard icon="alert" label="Hạng mục cần sửa" tone="text-[#ba0013]" value={`${repairItems.length} mục`} />
          <StatCard icon="info" label="Cần theo dõi" tone="text-amber-700" value={`${monitorCount} mục`} />
          <StatCard icon="cash" label="Chi phí ước tính" tone="text-[#171717]" value={formatMoney(totalEstimate)} />
        </section>

        <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-7">
            <section className="border border-[#efeded] bg-white p-6">
              <h3 className="text-xl font-black text-[#171717]">Thông tin ban đầu</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Số km (odo)</span>
                  <input
                    className="mt-2 min-h-11 w-full border border-[#d8d5d5] bg-[#fbf9f8] px-3 text-sm font-semibold text-[#1b1c1c] outline-none focus:border-[#ba0013] focus:ring-4 focus:ring-[#ba0013]/10"
                    min={0}
                    onChange={(event) => setOdometer(event.target.value)}
                    placeholder="Ví dụ: 45200"
                    type="number"
                    value={odometer}
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Mức nhiên liệu</span>
                  <select
                    className="mt-2 min-h-11 w-full border border-[#d8d5d5] bg-[#fbf9f8] px-3 text-sm font-semibold text-[#1b1c1c] outline-none focus:border-[#ba0013]"
                    onChange={(event) => setFuelLevel(event.target.value)}
                    value={fuelLevel}
                  >
                    {fuelLevels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            {groups.map((group) => (
              <section className="border border-[#efeded] bg-white" key={group.category}>
                <div className="flex items-center gap-3 border-b border-[#efeded] px-6 py-4">
                  <span className="flex h-9 w-9 items-center justify-center bg-[#fff1f1] text-[#ba0013]">
                    <Icon name={group.icon} />
                  </span>
                  <h3 className="text-lg font-black text-[#171717]">{group.category}</h3>
                </div>
                <div className="divide-y divide-[#efeded]">
                  {group.list.map((item) => (
                    <article className={item.status === 'repair' ? 'border-l-4 border-[#ba0013] bg-[#fffafa] p-5' : 'p-5'} key={item.id}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <p className="font-black text-[#171717]">{item.label}</p>
                        <div className="flex flex-wrap gap-2">
                          {(['ok', 'monitor', 'repair'] as InspectionItemStatus[]).map((status) => {
                            const active = item.status === status
                            const meta = statusMeta[status]
                            return (
                              <button
                                className={`border px-4 py-2 text-xs font-black uppercase tracking-[0.1em] transition ${active ? meta.active : meta.idle + ' hover:border-[#ba0013] hover:text-[#ba0013]'}`}
                                key={status}
                                onClick={() => setStatus(item.id, status)}
                                type="button"
                              >
                                {meta.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {item.status !== 'ok' ? (
                        <div className="mt-4 grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr]">
                          <input
                            className="min-h-11 w-full border border-[#d8d5d5] bg-white px-3 text-sm font-semibold text-[#1b1c1c] outline-none focus:border-[#ba0013]"
                            onChange={(event) => updateItem(item.id, { note: event.target.value })}
                            placeholder="Mô tả tình trạng / khuyến nghị"
                            value={item.note}
                          />
                          {item.status === 'repair' ? (
                            <>
                              <label className="flex items-center border border-[#d8d5d5] bg-white px-3">
                                <span className="mr-2 font-mono text-[10px] font-black uppercase text-[#6a6767]">Công</span>
                                <input
                                  className="min-h-11 w-full bg-transparent text-right text-sm font-semibold text-[#1b1c1c] outline-none"
                                  min={0}
                                  onChange={(event) => updateItem(item.id, { laborCost: Math.max(0, Number(event.target.value) || 0) })}
                                  type="number"
                                  value={item.laborCost}
                                />
                              </label>
                              <label className="flex items-center border border-[#d8d5d5] bg-white px-3">
                                <span className="mr-2 font-mono text-[10px] font-black uppercase text-[#6a6767]">Phụ tùng</span>
                                <input
                                  className="min-h-11 w-full bg-transparent text-right text-sm font-semibold text-[#1b1c1c] outline-none"
                                  min={0}
                                  onChange={(event) => updateItem(item.id, { partsCost: Math.max(0, Number(event.target.value) || 0) })}
                                  type="number"
                                  value={item.partsCost}
                                />
                              </label>
                            </>
                          ) : (
                            <div className="lg:col-span-2 flex items-center px-1 text-sm font-semibold text-amber-700">Đề nghị theo dõi ở lần bảo dưỡng sau.</div>
                          )}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="sticky top-28 space-y-6">
            <section className="bg-[#1b1c1c] p-6 text-white shadow-[0_18px_45px_rgba(15,14,14,0.18)]">
              <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-[#ffb4ab]">Tổng kết kiểm tra</p>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/65">Tổng hạng mục</span>
                  <span className="font-black">{items.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/65">Cần sửa</span>
                  <span className="font-black text-[#ffb4ab]">{repairItems.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/65">Theo dõi</span>
                  <span className="font-black">{monitorCount}</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-white/65">Chi phí ước tính</span>
                  <span className="text-lg font-black text-[#ffb4ab]">{formatMoney(totalEstimate)}</span>
                </div>
              </div>
            </section>

            <section className="border border-[#efeded] bg-white p-6">
              <h3 className="text-lg font-black text-[#171717]">Kết luận của kỹ thuật viên</h3>
              <textarea
                className="mt-3 min-h-28 w-full border border-[#d8d5d5] bg-[#fbf9f8] p-4 text-sm text-[#1b1c1c] outline-none focus:border-[#ba0013] focus:ring-4 focus:ring-[#ba0013]/10"
                onChange={(event) => setOverallNote(event.target.value)}
                placeholder="Nhận định tổng quan về tình trạng xe..."
                value={overallNote}
              />
              <button
                className="mt-4 flex min-h-12 w-full items-center justify-center gap-3 bg-[#ba0013] px-5 text-sm font-black uppercase text-white transition hover:bg-[#94000f] disabled:opacity-60"
                disabled={saving}
                onClick={submitInspection}
                type="button"
              >
                <Icon name="check" />
                {saving ? 'Đang gửi…' : 'Gửi kết quả cho SA'}
              </button>
            </section>
          </aside>
        </div>
      </div>
    </TechnicianShell>
  )
}
