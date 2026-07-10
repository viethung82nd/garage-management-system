import { useEffect, useMemo, useState } from 'react'
import {
  fetchWorkshopRepairOrders,
  formatApiDate,
  orderId,
  personName,
  submitQualityCheck,
  unwrapArray,
  vehicleName,
  vehiclePlate,
  type ApiRepairOrder,
  type QualityCheckResult,
} from '../../shared/api/workshop'
import { useAuth } from '../../shared/auth'
import { Icon, type IconName } from '../../shared/ui/base'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

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
}

const checklistSeed = [
  'Hạng mục sửa chữa đúng yêu cầu',
  'Chạy thử (road test) đạt',
  'Không còn đèn cảnh báo trên taplo',
  'Không rò rỉ dầu / nước làm mát',
  'Phụ tùng thay thế đúng chủng loại',
  'Siết lực & kiểm tra an toàn',
  'Vệ sinh khoang máy & nội thất',
  'Đủ ảnh nghiệm thu bàn giao',
]

const resultMeta: Record<QualityCheckResult, { label: string; active: string }> = {
  fail: { active: 'bg-[#fff1f1] text-[#ba0013] border-[#ba0013]', label: 'Chưa đạt' },
  na: { active: 'bg-[#e4e2e2] text-[#1b1c1c] border-[#b8b4b4]', label: 'Bỏ qua' },
  pass: { active: 'bg-green-50 text-green-700 border-green-300', label: 'Đạt' },
}

function seedChecklist(): CheckItem[] {
  return checklistSeed.map((label) => ({ id: crypto.randomUUID(), label, note: '', result: 'pass' as QualityCheckResult }))
}

function mapOrder(order: ApiRepairOrder): OrderView {
  const vehicle = order.vehicleId || order.vehicle
  return {
    code: orderId(order),
    completedAt: formatApiDate(order.completedAt || order.updatedAt),
    customer: personName(order.customer, 'Chưa có khách hàng'),
    id: order._id || order.id || crypto.randomUUID(),
    plate: vehiclePlate(vehicle),
    technician: personName(order.technicianId || order.technician, 'Chưa rõ KTV'),
    vehicle: vehicleName(vehicle),
  }
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

export function QualityVerificationPage() {
  const { token } = useAuth()
  const [orders, setOrders] = useState<OrderView[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [checklistByOrder, setChecklistByOrder] = useState<Record<string, CheckItem[]>>({})
  const [reworkNote, setReworkNote] = useState('')
  const [verdictByOrder, setVerdictByOrder] = useState<Record<string, 'passed' | 'rework'>>({})
  const [apiMessage, setApiMessage] = useState<string>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    const authToken = token
    let cancelled = false

    async function loadOrders() {
      setApiMessage(undefined)
      try {
        const response = await fetchWorkshopRepairOrders(authToken, '?status=completed')
        const list = unwrapArray<ApiRepairOrder>(response, ['repairOrders', 'orders']).map(mapOrder)
        if (cancelled) return
        setOrders(list)
        setSelectedId((current) => current || list[0]?.id || '')
        setChecklistByOrder((current) => {
          const next = { ...current }
          list.forEach((order) => {
            if (!next[order.id]) next[order.id] = seedChecklist()
          })
          return next
        })
      } catch (err) {
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Không tải được danh sách lệnh chờ nghiệm thu từ API')
      }
    }

    void loadOrders()
    return () => {
      cancelled = true
    }
  }, [token])

  const selectedOrder = orders.find((order) => order.id === selectedId) ?? orders[0]
  const checklist = (selectedOrder && checklistByOrder[selectedOrder.id]) || []
  const passCount = checklist.filter((item) => item.result === 'pass').length
  const failCount = checklist.filter((item) => item.result === 'fail').length
  const allDecided = checklist.length > 0 && failCount === 0
  const awaitingCount = orders.filter((order) => !verdictByOrder[order.id]).length
  const passedCount = useMemo(() => Object.values(verdictByOrder).filter((verdict) => verdict === 'passed').length, [verdictByOrder])

  function setResult(itemId: string, result: QualityCheckResult) {
    if (!selectedOrder) return
    setChecklistByOrder((current) => ({
      ...current,
      [selectedOrder.id]: (current[selectedOrder.id] || []).map((item) => (item.id === itemId ? { ...item, result } : item)),
    }))
  }

  function setItemNote(itemId: string, note: string) {
    if (!selectedOrder) return
    setChecklistByOrder((current) => ({
      ...current,
      [selectedOrder.id]: (current[selectedOrder.id] || []).map((item) => (item.id === itemId ? { ...item, note } : item)),
    }))
  }

  async function submitVerdict(passed: boolean) {
    if (!selectedOrder || !token) return

    setSaving(true)
    setApiMessage(undefined)
    try {
      await submitQualityCheck(token, selectedOrder.id, {
        items: checklist.map((item) => ({ label: item.label, note: item.note, result: item.result })),
        note: reworkNote,
        passed,
        reworkReason: passed ? undefined : reworkNote,
      })
      setVerdictByOrder((current) => ({ ...current, [selectedOrder.id]: passed ? 'passed' : 'rework' }))
      setApiMessage(passed ? 'Đã nghiệm thu đạt và chuyển sang bàn giao.' : 'Đã trả lệnh về kỹ thuật viên để sửa lại.')
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Không lưu được kết quả nghiệm thu. Kiểm tra lại kết nối API.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ServiceAdvisorShell active="quality-check" title="Nghiệm thu chất lượng">
      <div className="space-y-7">
        <section className="relative overflow-hidden border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
          <div className="absolute right-8 top-8 hidden text-[#ba0013]/10 lg:block">
            <Icon className="h-32 w-32" name="check" />
          </div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#ba0013]">Quality Verification</p>
          <h2 className="mt-3 text-4xl font-black leading-tight text-[#171717] md:text-5xl">Nghiệm thu chất lượng trước khi bàn giao</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#6a6767]">
            Service Advisor kiểm tra lại từng hạng mục kỹ thuật viên đã sửa, chạy thử và xác nhận đạt chất lượng trước khi bàn giao
            xe cho khách. Nếu chưa đạt, trả lệnh về xưởng để sửa lại.
          </p>
        </section>

        {apiMessage ? <div className="border border-[#e7bdb8] bg-[#fffafa] px-5 py-4 text-sm font-bold text-[#ba0013]">{apiMessage}</div> : null}

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard icon="clipboard" label="Chờ nghiệm thu" tone="text-[#ba0013]" value={`${awaitingCount} lệnh`} />
          <StatCard icon="check" label="Đã đạt hôm nay" tone="text-green-700" value={`${passedCount} lệnh`} />
          <StatCard icon="alert" label="Hạng mục chưa đạt" tone="text-[#171717]" value={`${failCount} mục`} />
        </section>

        <div className="grid items-start gap-7 xl:grid-cols-[340px_minmax(0,1fr)]">
          <section className="space-y-3">
            <div className="border border-[#efeded] bg-white p-5">
              <h3 className="text-lg font-black text-[#171717]">Lệnh chờ nghiệm thu</h3>
              <p className="mt-1 text-sm font-semibold text-[#6a6767]">{orders.length} lệnh đã hoàn tất sửa chữa</p>
            </div>

            {orders.length ? (
              orders.map((order) => {
                const active = order.id === selectedOrder?.id
                const verdict = verdictByOrder[order.id]
                return (
                  <button
                    className={active ? 'w-full border-l-4 border-[#ba0013] bg-[#fffafa] p-5 text-left shadow-[0_10px_30px_rgba(27,28,28,0.05)]' : 'w-full border border-[#efeded] bg-white p-5 text-left transition hover:border-[#ba0013] hover:bg-[#fffafa]'}
                    key={order.id}
                    onClick={() => setSelectedId(order.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#6a6767]">{order.code}</span>
                      {verdict ? (
                        <span className={`px-2 py-1 text-[10px] font-black uppercase ${verdict === 'passed' ? 'bg-green-50 text-green-700' : 'bg-[#fff1f1] text-[#ba0013]'}`}>
                          {verdict === 'passed' ? 'Đã đạt' : 'Trả lại'}
                        </span>
                      ) : (
                        <span className="bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-700">Chờ QC</span>
                      )}
                    </div>
                    <p className="mt-2 font-black text-[#171717]">{order.vehicle}</p>
                    <p className="mt-1 text-sm font-semibold text-[#6a6767]">{order.plate} · KTV {order.technician}</p>
                  </button>
                )
              })
            ) : (
              <div className="border border-[#efeded] bg-white p-6 text-sm font-bold text-[#6a6767]">Chưa có lệnh nào chờ nghiệm thu từ API.</div>
            )}
          </section>

          {selectedOrder ? (
            <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-7">
                <section className="border border-[#efeded] bg-white p-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Lệnh</p>
                      <p className="mt-1 font-black text-[#171717]">{selectedOrder.code}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Xe</p>
                      <p className="mt-1 font-black text-[#171717]">{selectedOrder.vehicle}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Khách hàng</p>
                      <p className="mt-1 font-black text-[#171717]">{selectedOrder.customer}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Hoàn tất</p>
                      <p className="mt-1 font-black text-[#171717]">{selectedOrder.completedAt}</p>
                    </div>
                  </div>
                </section>

                <section className="border border-[#efeded] bg-white">
                  <div className="flex items-center justify-between border-b border-[#efeded] px-6 py-5">
                    <div>
                      <h3 className="text-lg font-black text-[#171717]">Checklist nghiệm thu</h3>
                      <p className="mt-1 text-sm font-semibold text-[#6a6767]">Đánh giá từng hạng mục trước khi kết luận.</p>
                    </div>
                    <span className="bg-[#fff1f1] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#ba0013]">{passCount}/{checklist.length} đạt</span>
                  </div>
                  <div className="divide-y divide-[#efeded]">
                    {checklist.map((item) => (
                      <article className={item.result === 'fail' ? 'border-l-4 border-[#ba0013] bg-[#fffafa] p-5' : 'p-5'} key={item.id}>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <p className="font-black text-[#171717]">{item.label}</p>
                          <div className="flex flex-wrap gap-2">
                            {(['pass', 'fail', 'na'] as QualityCheckResult[]).map((result) => {
                              const active = item.result === result
                              const meta = resultMeta[result]
                              return (
                                <button
                                  className={`border px-4 py-2 text-xs font-black uppercase tracking-[0.1em] transition ${active ? meta.active : 'border-[#d8d5d5] text-[#6a6767] hover:border-[#ba0013] hover:text-[#ba0013]'}`}
                                  key={result}
                                  onClick={() => setResult(item.id, result)}
                                  type="button"
                                >
                                  {meta.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        {item.result === 'fail' ? (
                          <input
                            className="mt-4 min-h-11 w-full border border-[#d8d5d5] bg-white px-3 text-sm font-semibold text-[#1b1c1c] outline-none focus:border-[#ba0013]"
                            onChange={(event) => setItemNote(item.id, event.target.value)}
                            placeholder="Mô tả lỗi cần KTV xử lý lại"
                            value={item.note}
                          />
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="sticky top-28 space-y-6">
                <section className="bg-[#1b1c1c] p-6 text-white shadow-[0_18px_45px_rgba(15,14,14,0.18)]">
                  <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-[#ffb4ab]">Kết quả nghiệm thu</p>
                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-white/65">Hạng mục đạt</span>
                      <span className="font-black">{passCount}/{checklist.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/65">Chưa đạt</span>
                      <span className="font-black text-[#ffb4ab]">{failCount}</span>
                    </div>
                  </div>
                  <div className="mt-5 border-t border-white/10 pt-5">
                    <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white/55">Kết luận</p>
                    <p className="mt-2 text-2xl font-black text-[#ffb4ab]">{allDecided ? 'Đủ điều kiện bàn giao' : 'Còn hạng mục chưa đạt'}</p>
                  </div>
                </section>

                <section className="border border-[#efeded] bg-white p-6">
                  <h3 className="text-lg font-black text-[#171717]">Ghi chú nghiệm thu</h3>
                  <textarea
                    className="mt-3 min-h-24 w-full border border-[#d8d5d5] bg-[#fbf9f8] p-4 text-sm text-[#1b1c1c] outline-none focus:border-[#ba0013] focus:ring-4 focus:ring-[#ba0013]/10"
                    onChange={(event) => setReworkNote(event.target.value)}
                    placeholder="Ghi chú kết quả hoặc lý do trả lại KTV..."
                    value={reworkNote}
                  />
                  <div className="mt-4 space-y-3">
                    <button
                      className="flex min-h-12 w-full items-center justify-center gap-3 bg-[#ba0013] px-5 text-sm font-black uppercase text-white transition hover:bg-[#94000f] disabled:opacity-60"
                      disabled={saving || !allDecided}
                      onClick={() => submitVerdict(true)}
                      type="button"
                    >
                      <Icon name="check" />
                      Đạt · chuyển bàn giao
                    </button>
                    <button
                      className="flex min-h-12 w-full items-center justify-center gap-3 border border-[#ba0013] px-5 text-sm font-black uppercase text-[#ba0013] transition hover:bg-[#fff1f1] disabled:opacity-60"
                      disabled={saving}
                      onClick={() => submitVerdict(false)}
                      type="button"
                    >
                      <Icon name="wrench" />
                      Trả lại KTV sửa lại
                    </button>
                  </div>
                  {!allDecided ? <p className="mt-3 text-xs font-bold text-[#ba0013]">Còn hạng mục chưa đạt — chỉ có thể trả lại KTV.</p> : null}
                </section>
              </aside>
            </div>
          ) : (
            <div className="border border-[#efeded] bg-white p-6 text-sm font-bold text-[#6a6767]">Chọn một lệnh sửa chữa để nghiệm thu.</div>
          )}
        </div>
      </div>
    </ServiceAdvisorShell>
  )
}
