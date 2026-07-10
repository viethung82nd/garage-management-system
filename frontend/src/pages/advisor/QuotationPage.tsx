import { useEffect, useMemo, useState } from 'react'
import {
  createQuotation,
  fetchWorkshopServices,
  sendQuotation,
  type ApiQuotation,
  type ApiService,
  type QuotationLineKind,
} from '../../shared/api/workshop'
import { useAuth } from '../../shared/auth'
import { Icon, type IconName } from '../../shared/ui/base'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

type QuotationLine = {
  id: string
  description: string
  kind: QuotationLineKind
  quantity: number
  unitPrice: number
}

type QuotationHeader = {
  code: string
  customerName: string
  customerPhone: string
  vehiclePlate: string
  vehicleName: string
  repairOrderId: string
}

const kindLabels: Record<QuotationLineKind, string> = {
  labor: 'Công',
  part: 'Phụ tùng',
  service: 'Dịch vụ',
}

const kindClasses: Record<QuotationLineKind, string> = {
  labor: 'bg-amber-100 text-amber-800',
  part: 'bg-[#e4e2e2] text-[#1b1c1c]',
  service: 'bg-[#fff1f1] text-[#ba0013]',
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(value)) + 'đ'
}

function newQuotationCode() {
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const rand = String(Math.floor(Math.random() * 9000) + 1000)
  return `QT-${stamp}-${rand}`
}

function makeLine(partial: Partial<QuotationLine> = {}): QuotationLine {
  return {
    description: partial.description ?? '',
    id: partial.id ?? crypto.randomUUID(),
    kind: partial.kind ?? 'service',
    quantity: partial.quantity ?? 1,
    unitPrice: partial.unitPrice ?? 0,
  }
}

function servicePrice(service: ApiService) {
  return service.basePrice ?? service.price ?? 0
}

function SummaryTile({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <section className="border border-[#efeded] bg-white p-5 shadow-[0_18px_40px_rgba(27,28,28,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.14em] text-[#6a6767]">{label}</p>
          <p className="mt-2 text-2xl font-black text-[#171717]">{value}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center bg-[#fff1f1] text-[#ba0013]">
          <Icon name={icon} />
        </span>
      </div>
    </section>
  )
}

function HeaderField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string
  onChange: (value: string) => void
  placeholder?: string
  value: string
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">{label}</span>
      <input
        className="mt-2 min-h-11 w-full border border-[#d8d5d5] bg-[#fbf9f8] px-3 text-sm font-semibold text-[#1b1c1c] outline-none focus:border-[#ba0013] focus:ring-4 focus:ring-[#ba0013]/10"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  )
}

export function QuotationPage() {
  const { token } = useAuth()
  const [header, setHeader] = useState<QuotationHeader>({
    code: newQuotationCode(),
    customerName: '',
    customerPhone: '',
    repairOrderId: '',
    vehicleName: '',
    vehiclePlate: '',
  })
  const [lines, setLines] = useState<QuotationLine[]>([makeLine({ description: 'Thay dầu động cơ', kind: 'service', unitPrice: 350000 })])
  const [discountPercent, setDiscountPercent] = useState(0)
  const [taxPercent, setTaxPercent] = useState(10)
  const [validDays, setValidDays] = useState(7)
  const [note, setNote] = useState('Báo giá đã bao gồm công tháo lắp. Giá có thể thay đổi nếu phát sinh hạng mục ngoài dự kiến.')
  const [services, setServices] = useState<ApiService[]>([])
  const [pickedServiceId, setPickedServiceId] = useState('')
  const [apiMessage, setApiMessage] = useState<string>()
  const [status, setStatus] = useState<'draft' | 'sent'>('draft')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    const authToken = token
    let cancelled = false

    async function loadServices() {
      try {
        const catalog = await fetchWorkshopServices(authToken)
        if (!cancelled) setServices(Array.isArray(catalog) ? catalog : [])
      } catch (err) {
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Không tải được danh mục dịch vụ từ API')
      }
    }

    void loadServices()
    return () => {
      cancelled = true
    }
  }, [token])

  const partsTotal = useMemo(() => lines.filter((line) => line.kind === 'part').reduce((sum, line) => sum + line.quantity * line.unitPrice, 0), [lines])
  const laborTotal = useMemo(() => lines.filter((line) => line.kind !== 'part').reduce((sum, line) => sum + line.quantity * line.unitPrice, 0), [lines])
  const subtotal = partsTotal + laborTotal
  const discountAmount = (subtotal * discountPercent) / 100
  const taxableBase = subtotal - discountAmount
  const taxAmount = (taxableBase * taxPercent) / 100
  const grandTotal = taxableBase + taxAmount

  function updateHeader(field: keyof QuotationHeader, value: string) {
    setStatus('draft')
    setHeader((current) => ({ ...current, [field]: value }))
  }

  function updateLine(id: string, patch: Partial<QuotationLine>) {
    setStatus('draft')
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  function removeLine(id: string) {
    setStatus('draft')
    setLines((current) => current.filter((line) => line.id !== id))
  }

  function addManualLine() {
    setStatus('draft')
    setLines((current) => [...current, makeLine()])
  }

  function addServiceLine() {
    const service = services.find((item) => (item._id || item.id) === pickedServiceId)
    if (!service) return
    setStatus('draft')
    setLines((current) => [
      ...current,
      makeLine({ description: service.name || 'Dịch vụ', kind: 'service', unitPrice: servicePrice(service) }),
    ])
    setPickedServiceId('')
  }

  function buildPayload(nextStatus: 'draft' | 'sent'): ApiQuotation {
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + validDays)
    return {
      code: header.code,
      customerName: header.customerName,
      customerPhone: header.customerPhone,
      discountPercent,
      lines: lines.map((line) => ({ description: line.description, kind: line.kind, quantity: line.quantity, unitPrice: line.unitPrice })),
      note,
      repairOrderId: header.repairOrderId || undefined,
      status: nextStatus,
      taxPercent,
      validUntil: validUntil.toISOString(),
      vehicleName: header.vehicleName,
      vehiclePlate: header.vehiclePlate,
    }
  }

  async function persist(nextStatus: 'draft' | 'sent') {
    if (!token) return
    if (!lines.length) {
      setApiMessage('Cần ít nhất một hạng mục trước khi lưu hoặc gửi báo giá.')
      return
    }

    setSaving(true)
    setApiMessage(undefined)
    try {
      const created = await createQuotation(token, buildPayload(nextStatus))
      const quotation = (created && typeof created === 'object' && 'quotation' in created ? created.quotation : created) as ApiQuotation | undefined
      const id = quotation?._id || quotation?.id
      if (nextStatus === 'sent' && id) await sendQuotation(token, id)
      setStatus(nextStatus)
      setApiMessage(nextStatus === 'sent' ? 'Đã gửi báo giá cho khách hàng qua API.' : 'Đã lưu nháp báo giá qua API.')
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Không lưu được báo giá. Kiểm tra lại kết nối API.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ServiceAdvisorShell active="quotation" title="Lập & gửi báo giá">
      <div className="space-y-7">
        <section className="relative overflow-hidden border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
          <div className="absolute right-8 top-8 hidden text-[#ba0013]/10 lg:block">
            <Icon className="h-32 w-32" name="invoice" />
          </div>
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#ba0013]">Create &amp; Send Quotation</p>
              <h2 className="mt-3 text-4xl font-black leading-tight text-[#171717] md:text-5xl">Lập báo giá và gửi cho khách xác nhận</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#6a6767]">
                Service Advisor tổng hợp hạng mục dịch vụ, phụ tùng và công, tính chiết khấu, VAT rồi gửi báo giá để khách hàng
                xác nhận trước khi bắt đầu sửa chữa.
              </p>
            </div>
            <div className="border border-[#efeded] bg-[#fbf9f8] p-5">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Trạng thái</p>
              <p className="mt-2 text-2xl font-black text-[#ba0013]">{status === 'sent' ? 'Đã gửi khách' : 'Đang soạn'}</p>
              <p className="mt-1 text-sm font-semibold text-[#6a6767]">Mã: {header.code}</p>
            </div>
          </div>
        </section>

        {apiMessage ? <div className="border border-[#e7bdb8] bg-[#fffafa] px-5 py-4 text-sm font-bold text-[#ba0013]">{apiMessage}</div> : null}

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryTile icon="wrench" label="Dịch vụ & công" value={formatMoney(laborTotal)} />
          <SummaryTile icon="cart" label="Phụ tùng" value={formatMoney(partsTotal)} />
          <SummaryTile icon="cash" label="Tổng gửi khách" value={formatMoney(grandTotal)} />
        </section>

        <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-7">
            <section className="border border-[#efeded] bg-white p-6">
              <h3 className="text-xl font-black text-[#171717]">Thông tin khách hàng &amp; xe</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <HeaderField label="Khách hàng" onChange={(value) => updateHeader('customerName', value)} placeholder="Nguyễn Văn A" value={header.customerName} />
                <HeaderField label="Số điện thoại" onChange={(value) => updateHeader('customerPhone', value)} placeholder="09xx xxx xxx" value={header.customerPhone} />
                <HeaderField label="Biển số" onChange={(value) => updateHeader('vehiclePlate', value)} placeholder="51K-882.88" value={header.vehiclePlate} />
                <HeaderField label="Dòng xe" onChange={(value) => updateHeader('vehicleName', value)} placeholder="BMW M4 Competition" value={header.vehicleName} />
                <HeaderField label="Mã lệnh sửa (tuỳ chọn)" onChange={(value) => updateHeader('repairOrderId', value)} placeholder="RO-2026-0882" value={header.repairOrderId} />
                <HeaderField label="Mã báo giá" onChange={(value) => updateHeader('code', value)} value={header.code} />
              </div>
            </section>

            <section className="border border-[#efeded] bg-white p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-black text-[#171717]">Hạng mục báo giá</h3>
                  <p className="mt-1 text-sm font-semibold text-[#6a6767]">{lines.length} hạng mục</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex min-h-11 items-center border border-[#d8d5d5] bg-[#fbf9f8]">
                    <select
                      className="min-h-11 w-full min-w-40 bg-transparent px-3 text-sm font-semibold text-[#1b1c1c] outline-none"
                      onChange={(event) => setPickedServiceId(event.target.value)}
                      value={pickedServiceId}
                    >
                      <option value="">Chọn từ danh mục dịch vụ…</option>
                      {services.map((service) => (
                        <option key={service._id || service.id} value={service._id || service.id}>
                          {service.name} — {formatMoney(servicePrice(service))}
                        </option>
                      ))}
                    </select>
                    <button
                      className="flex min-h-11 items-center gap-1 border-l border-[#d8d5d5] px-3 text-sm font-black text-[#ba0013] disabled:text-[#c3bfbf]"
                      disabled={!pickedServiceId}
                      onClick={addServiceLine}
                      type="button"
                    >
                      <Icon name="plus" />
                    </button>
                  </div>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#d8d5d5] px-4 text-sm font-black text-[#1b1c1c] transition hover:border-[#ba0013] hover:text-[#ba0013]"
                    onClick={addManualLine}
                    type="button"
                  >
                    <Icon name="plus" />
                    Thêm dòng
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="hidden grid-cols-[1.6fr_0.9fr_0.6fr_1fr_1fr_auto] gap-3 px-1 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#6a6767] lg:grid">
                  <span>Hạng mục</span>
                  <span>Loại</span>
                  <span>SL</span>
                  <span>Đơn giá</span>
                  <span className="text-right">Thành tiền</span>
                  <span />
                </div>

                {lines.length ? (
                  lines.map((line) => (
                    <div className="grid grid-cols-2 gap-3 border border-[#efeded] bg-[#fbf9f8] p-3 lg:grid-cols-[1.6fr_0.9fr_0.6fr_1fr_1fr_auto] lg:items-center lg:border-0 lg:bg-transparent lg:p-1" key={line.id}>
                      <input
                        className="col-span-2 min-h-11 w-full border border-[#d8d5d5] bg-white px-3 text-sm font-semibold text-[#1b1c1c] outline-none focus:border-[#ba0013] lg:col-span-1"
                        onChange={(event) => updateLine(line.id, { description: event.target.value })}
                        placeholder="Tên hạng mục"
                        value={line.description}
                      />
                      <select
                        className="min-h-11 w-full border border-[#d8d5d5] bg-white px-2 text-sm font-semibold text-[#1b1c1c] outline-none focus:border-[#ba0013]"
                        onChange={(event) => updateLine(line.id, { kind: event.target.value as QuotationLineKind })}
                        value={line.kind}
                      >
                        <option value="service">Dịch vụ</option>
                        <option value="part">Phụ tùng</option>
                        <option value="labor">Công</option>
                      </select>
                      <input
                        className="min-h-11 w-full border border-[#d8d5d5] bg-white px-2 text-sm font-semibold text-[#1b1c1c] outline-none focus:border-[#ba0013]"
                        min={1}
                        onChange={(event) => updateLine(line.id, { quantity: Math.max(1, Number(event.target.value) || 1) })}
                        type="number"
                        value={line.quantity}
                      />
                      <input
                        className="min-h-11 w-full border border-[#d8d5d5] bg-white px-2 text-sm font-semibold text-[#1b1c1c] outline-none focus:border-[#ba0013]"
                        min={0}
                        onChange={(event) => updateLine(line.id, { unitPrice: Math.max(0, Number(event.target.value) || 0) })}
                        type="number"
                        value={line.unitPrice}
                      />
                      <div className="flex items-center justify-between gap-2 lg:justify-end">
                        <span className={`px-2 py-1 text-[10px] font-black uppercase lg:hidden ${kindClasses[line.kind]}`}>{kindLabels[line.kind]}</span>
                        <span className="text-right text-sm font-black text-[#171717]">{formatMoney(line.quantity * line.unitPrice)}</span>
                      </div>
                      <button
                        aria-label="Xoá hạng mục"
                        className="flex min-h-9 items-center justify-center border border-[#d8d5d5] px-3 text-sm font-black text-[#6a6767] transition hover:border-[#ba0013] hover:text-[#ba0013]"
                        onClick={() => removeLine(line.id)}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="border border-dashed border-[#d8d5d5] bg-[#fbf9f8] p-6 text-center text-sm font-bold text-[#6a6767]">
                    Chưa có hạng mục. Thêm dịch vụ từ danh mục hoặc bấm “Thêm dòng”.
                  </div>
                )}
              </div>
            </section>

            <section className="border border-[#efeded] bg-white p-6">
              <h3 className="text-xl font-black text-[#171717]">Ghi chú &amp; điều khoản</h3>
              <textarea
                className="mt-4 min-h-28 w-full border border-[#d8d5d5] bg-[#fbf9f8] p-4 text-sm text-[#1b1c1c] outline-none focus:border-[#ba0013] focus:ring-4 focus:ring-[#ba0013]/10"
                onChange={(event) => setNote(event.target.value)}
                value={note}
              />
            </section>
          </div>

          <aside className="sticky top-28 space-y-6">
            <section className="bg-[#1b1c1c] p-6 text-white shadow-[0_18px_45px_rgba(15,14,14,0.18)]">
              <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-[#ffb4ab]">Tổng kết báo giá</p>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/65">Dịch vụ &amp; công</span>
                  <span className="font-black">{formatMoney(laborTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/65">Phụ tùng</span>
                  <span className="font-black">{formatMoney(partsTotal)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-white/65">Tạm tính</span>
                  <span className="font-black">{formatMoney(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/65">Chiết khấu (%)</span>
                  <input
                    className="min-h-9 w-20 border border-white/15 bg-white/10 px-2 text-right text-sm font-black text-white outline-none focus:border-[#ffb4ab]"
                    max={100}
                    min={0}
                    onChange={(event) => { setStatus('draft'); setDiscountPercent(Math.min(100, Math.max(0, Number(event.target.value) || 0))) }}
                    type="number"
                    value={discountPercent}
                  />
                </div>
                <div className="flex items-center justify-between text-white/65">
                  <span>Giảm giá</span>
                  <span className="font-black text-[#ffb4ab]">-{formatMoney(discountAmount)}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/65">VAT (%)</span>
                  <input
                    className="min-h-9 w-20 border border-white/15 bg-white/10 px-2 text-right text-sm font-black text-white outline-none focus:border-[#ffb4ab]"
                    max={100}
                    min={0}
                    onChange={(event) => { setStatus('draft'); setTaxPercent(Math.min(100, Math.max(0, Number(event.target.value) || 0))) }}
                    type="number"
                    value={taxPercent}
                  />
                </div>
                <div className="flex items-center justify-between text-white/65">
                  <span>Thuế VAT</span>
                  <span className="font-black">{formatMoney(taxAmount)}</span>
                </div>
              </div>

              <div className="mt-5 border-t border-white/10 pt-5">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white/55">Tổng cộng gửi khách</p>
                <p className="mt-2 text-3xl font-black text-[#ffb4ab]">{formatMoney(grandTotal)}</p>
              </div>

              <label className="mt-5 block">
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-white/55">Hiệu lực báo giá (ngày)</span>
                <input
                  className="mt-2 min-h-10 w-full border border-white/15 bg-white/10 px-3 text-sm font-black text-white outline-none focus:border-[#ffb4ab]"
                  min={1}
                  onChange={(event) => { setStatus('draft'); setValidDays(Math.max(1, Number(event.target.value) || 1)) }}
                  type="number"
                  value={validDays}
                />
              </label>
            </section>

            <section className="border border-[#efeded] bg-white p-6">
              <h3 className="text-lg font-black text-[#171717]">Thao tác</h3>
              <div className="mt-4 space-y-3">
                <button
                  className="flex min-h-12 w-full items-center justify-center gap-3 bg-[#ba0013] px-5 text-sm font-black uppercase text-white transition hover:bg-[#94000f] disabled:opacity-60"
                  disabled={saving || !lines.length}
                  onClick={() => persist('sent')}
                  type="button"
                >
                  <Icon name="invoice" />
                  {saving ? 'Đang xử lý…' : 'Gửi báo giá cho khách'}
                </button>
                <button
                  className="flex min-h-12 w-full items-center justify-center gap-3 border border-[#ba0013] px-5 text-sm font-black uppercase text-[#ba0013] transition hover:bg-[#fff1f1] disabled:opacity-60"
                  disabled={saving || !lines.length}
                  onClick={() => persist('draft')}
                  type="button"
                >
                  <Icon name="check" />
                  Lưu nháp
                </button>
                <button
                  className="flex min-h-12 w-full items-center justify-center gap-3 border border-[#d8d5d5] px-5 text-sm font-black uppercase text-[#555151] transition hover:border-[#ba0013] hover:text-[#ba0013]"
                  onClick={() => window.print()}
                  type="button"
                >
                  <Icon name="download" />
                  Xuất / In báo giá
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </ServiceAdvisorShell>
  )
}
