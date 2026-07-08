import { useEffect, useMemo, useState } from 'react'
import { createVehicleReception, fetchVehicleHistory } from '../../shared/api/workshop'
import { useAuth } from '../../shared/auth'
import { Icon } from '../../shared/ui/base'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'
import { Field, SelectField, TextAreaField } from '../../widgets/vehicle-reception/ui/FormFields'
import { PanelTitle, ReceptionPanel } from '../../widgets/vehicle-reception/ui/ReceptionPanel'

type PlateStatus = 'idle' | 'checking' | 'found' | 'not-found'

type ReceptionForm = {
  address: string
  appointmentDate: string
  appointmentTime: string
  customerEmail: string
  customerName: string
  engineNo: string
  issueDescription: string
  mileage: string
  model: string
  phone: string
  plate: string
  vin: string
  year: string
}

type HistorySuggestion = {
  id: string
  address: string
  customerEmail: string
  customerName: string
  engineNo: string
  lastVisit: string
  mileage: string
  model: string
  phone: string
  plate: string
  recommendedServices: string[]
  riskNote: string
  vin: string
  year: string
}

const emptyForm: ReceptionForm = {
  address: '',
  appointmentDate: '',
  appointmentTime: '',
  customerEmail: '',
  customerName: '',
  engineNo: '',
  issueDescription: '',
  mileage: '',
  model: '',
  phone: '',
  plate: '',
  vin: '',
  year: '2026',
}

function mapHistorySuggestion(item: any): HistorySuggestion {
  const vehicle = item.vehicleId || item.vehicle || item
  const customer = item.customerId || item.customer || vehicle.customerId || {}

  return {
    address: customer.address || item.address || '',
    customerEmail: customer.email || item.customerEmail || '',
    customerName: customer.fullName || item.customerName || 'Khách hàng',
    engineNo: vehicle.engineNumber || item.engineNo || '',
    id: item._id || item.id || vehicle._id || crypto.randomUUID(),
    lastVisit: item.lastVisit || item.updatedAt || item.createdAt || 'Chưa cập nhật',
    mileage: item.mileage || vehicle.mileage || '',
    model: [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || vehicle.model || item.model || '',
    phone: customer.phone || item.phone || '',
    plate: vehicle.licensePlate || vehicle.plate || item.plate || '',
    recommendedServices: item.recommendedServices || item.services?.map((service: any) => service.name || service.serviceId?.name).filter(Boolean) || [],
    riskNote: item.riskNote || item.note || 'Không có ghi chú rủi ro.',
    vin: vehicle.vin || vehicle.chassisNumber || item.vin || '',
    year: String(vehicle.year || item.year || ''),
  }
}

function normalizePlate(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: 'check' | 'calendar' | 'info'
  title: string
  children: string
}) {
  return (
    <article className="border border-[#e4e2e2] bg-[#efeded] p-6 transition hover:border-[#ba0013]">
      <Icon className="mb-4 h-10 w-10 text-[#ba0013]" name={icon} />
      <h3 className="mb-3 text-2xl font-black text-[#1b1c1c]">{title}</h3>
      <p className="leading-7 text-[#5f5e5e]">{children}</p>
    </article>
  )
}

function HistorySuggestionPanel({
  appliedSuggestionId,
  onApply,
  suggestions,
}: {
  appliedSuggestionId?: string
  onApply: (suggestion: HistorySuggestion) => void
  suggestions: HistorySuggestion[]
}) {
  return (
    <section className="border border-[#efeded] bg-white p-6 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-[#ba0013]">Gợi ý từ lịch sử</p>
          <h3 className="mt-2 text-2xl font-black text-[#171717]">Hồ sơ xe đã từng tiếp nhận</h3>
          <p className="mt-2 text-sm font-semibold text-[#6a6767]">Chọn hồ sơ phù hợp để điền nhanh khách hàng, xe và gợi ý dịch vụ.</p>
        </div>
        <span className="hidden h-11 w-11 items-center justify-center bg-[#fff1f1] text-[#ba0013] sm:flex">
          <Icon name="clipboard" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-3">
        {suggestions.map((suggestion) => {
          const applied = appliedSuggestionId === suggestion.id

          return (
            <article className={applied ? 'border-l-4 border-[#ba0013] bg-[#fffafa] p-4' : 'border border-[#efeded] bg-[#fbf9f8] p-4'} key={suggestion.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-[#171717]">{suggestion.plate}</p>
                  <p className="mt-1 text-sm font-semibold text-[#6a6767]">{suggestion.model}</p>
                </div>
                {applied ? <span className="bg-[#ba0013] px-2 py-1 text-[10px] font-black uppercase text-white">Đã điền</span> : null}
              </div>
              <p className="mt-3 text-sm font-bold text-[#1b1c1c]">{suggestion.customerName}</p>
              <p className="mt-1 text-xs font-semibold text-[#6a6767]">Lần gần nhất: {suggestion.lastVisit}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestion.recommendedServices.slice(0, 2).map((service) => (
                  <span className="bg-white px-2 py-1 text-[11px] font-bold text-[#ba0013]" key={service}>{service}</span>
                ))}
              </div>
              <button
                className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 bg-[#1b1c1c] px-4 text-sm font-black text-white transition hover:bg-[#ba0013]"
                onClick={() => onApply(suggestion)}
                type="button"
              >
                <Icon name="check" />
                Điền nhanh từ lịch sử
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export function VehicleReceptionPage() {
  const { token } = useAuth()
  const [form, setForm] = useState<ReceptionForm>(emptyForm)
  const [historySuggestions, setHistorySuggestions] = useState<HistorySuggestion[]>([])
  const [apiMessage, setApiMessage] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [plateStatus, setPlateStatus] = useState<PlateStatus>('idle')
  const [appliedSuggestionId, setAppliedSuggestionId] = useState<string>()

  useEffect(() => {
    if (!token) return
    const authToken = token

    let cancelled = false

    async function loadHistory() {
      setApiMessage(undefined)
      try {
        const response = await fetchVehicleHistory(authToken)
        const rawSuggestions = Array.isArray(response) ? response : response.suggestions || []
        if (!cancelled) setHistorySuggestions(rawSuggestions.map(mapHistorySuggestion))
      } catch (err) {
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Không tải được lịch sử tiếp nhận từ API')
      }
    }

    void loadHistory()

    return () => {
      cancelled = true
    }
  }, [token])
  const matchingSuggestions = useMemo(() => {
    const normalizedPlate = normalizePlate(form.plate)
    if (!normalizedPlate) {
      return historySuggestions
    }

    return historySuggestions.filter((suggestion) => normalizePlate(suggestion.plate).includes(normalizedPlate))
  }, [form.plate, historySuggestions])

  const activeSuggestion = historySuggestions.find((suggestion) => suggestion.id === appliedSuggestionId)

  function updateField<Key extends keyof ReceptionForm>(key: Key, value: ReceptionForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
    if (key === 'plate') {
      setPlateStatus('idle')
      setAppliedSuggestionId(undefined)
    }
  }

  function applySuggestion(suggestion: HistorySuggestion) {
    setAppliedSuggestionId(suggestion.id)
    setPlateStatus('found')
    setForm((current) => ({
      ...current,
      address: suggestion.address,
      customerEmail: suggestion.customerEmail,
      customerName: suggestion.customerName,
      engineNo: suggestion.engineNo,
      issueDescription: `${suggestion.riskNote}\nGợi ý dịch vụ: ${suggestion.recommendedServices.join(', ')}.`,
      mileage: suggestion.mileage,
      model: suggestion.model,
      phone: suggestion.phone,
      plate: suggestion.plate,
      vin: suggestion.vin,
      year: suggestion.year,
    }))
  }

  async function checkPlate() {
    if (!token) return

    setPlateStatus('checking')
    setApiMessage(undefined)

    try {
      const response = await fetchVehicleHistory(token, form.plate)
      const rawSuggestions = Array.isArray(response) ? response : response.suggestions || []
      const nextSuggestions = rawSuggestions.map(mapHistorySuggestion)
      setHistorySuggestions(nextSuggestions)

      const exactMatch = nextSuggestions.find((suggestion) => normalizePlate(suggestion.plate) === normalizePlate(form.plate))
      const fallbackMatch = nextSuggestions[0]
      const suggestion = exactMatch ?? fallbackMatch

      if (suggestion) {
        applySuggestion(suggestion)
      } else {
        setAppliedSuggestionId(undefined)
        setPlateStatus('not-found')
      }
    } catch (err) {
      setAppliedSuggestionId(undefined)
      setPlateStatus('not-found')
      setApiMessage(err instanceof Error ? err.message : 'Không tra cứu được lịch sử xe từ API')
    }
  }

  async function submitReception() {
    if (!token) return

    setSaving(true)
    setApiMessage(undefined)

    try {
      await createVehicleReception(token, { ...form, historySuggestionId: appliedSuggestionId || '' })
      setApiMessage('Đã lưu phiếu tiếp nhận qua API.')
      setForm(emptyForm)
      setAppliedSuggestionId(undefined)
      setPlateStatus('idle')
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Không lưu được phiếu tiếp nhận')
    } finally {
      setSaving(false)
    }
  }

  const searchLabel = {
    checking: 'Đang kiểm tra...',
    found: 'Đã tìm thấy lịch sử',
    idle: 'Kiểm tra lịch sử',
    'not-found': 'Không có lịch sử',
  }[plateStatus]

  return (
    <ServiceAdvisorShell active="reception" title="Biểu mẫu tiếp nhận xe">
      <div className="space-y-8">
        <section className="border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
          <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.24em] text-[#ba0013]">Service Reception</p>
          <h2 className="text-4xl font-black tracking-tight text-[#1b1c1c] md:text-5xl">Tiếp nhận xe mới</h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5f5e5e]">
            Nhập biển số để tra cứu lịch sử, điền nhanh hồ sơ khách hàng và gợi ý dịch vụ phù hợp.
          </p>
        </section>

        {apiMessage ? <div className="border border-[#e7bdb8] bg-[#fffafa] px-5 py-4 text-sm font-bold text-[#ba0013]">{apiMessage}</div> : null}

        <form className="space-y-8" onSubmit={(event) => { event.preventDefault(); void submitReception() }}>
          <section className="relative overflow-hidden border border-[#e4e2e2] bg-white p-8 shadow-sm">
            <div className="absolute bottom-0 left-0 top-0 w-1 bg-[#ba0013]" />
            <div className="flex flex-col gap-6 md:flex-row md:items-end">
              <label className="flex-1 space-y-2">
                <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f5e5e]">Biển số xe</span>
                <span className="relative block">
                  <input
                    className="w-full border border-[#e7bdb8] bg-white p-4 pr-12 text-2xl font-black uppercase text-[#1b1c1c] placeholder:text-[#c8c6c5] outline-none transition focus:border-[#ba0013] focus:ring-4 focus:ring-[#ba0013]/10"
                    onChange={(event) => updateField('plate', event.target.value.toUpperCase())}
                    placeholder="29A-123.45"
                    type="text"
                    value={form.plate}
                  />
                  <Icon className="absolute right-4 top-1/2 -translate-y-1/2 text-[#ba0013]" name="car" />
                </span>
              </label>
              <button
                className="inline-flex min-h-[58px] items-center justify-center gap-3 bg-[#1b1c1c] px-10 text-sm font-black uppercase text-white transition hover:bg-[#ba0013] disabled:opacity-70"
                disabled={plateStatus === 'checking'}
                onClick={checkPlate}
                type="button"
              >
                <Icon className={plateStatus === 'checking' ? 'animate-spin' : ''} name={plateStatus === 'found' ? 'check' : 'search'} />
                {searchLabel}
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="bg-[#fbf9f8] p-4">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Kết quả lịch sử</p>
                <p className="mt-2 text-lg font-black text-[#171717]">{matchingSuggestions.length} hồ sơ phù hợp</p>
              </div>
              <div className="bg-[#fbf9f8] p-4">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Dịch vụ gợi ý</p>
                <p className="mt-2 text-sm font-bold text-[#ba0013]">{activeSuggestion?.recommendedServices[0] ?? 'Chọn hồ sơ để xem gợi ý'}</p>
              </div>
              <div className="bg-[#fff1f1] p-4">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#ba0013]">Cảnh báo lịch sử</p>
                <p className="mt-2 text-sm font-bold text-[#1b1c1c]">{activeSuggestion?.riskNote ?? 'Chưa có cảnh báo'}</p>
              </div>
            </div>
          </section>

          <HistorySuggestionPanel appliedSuggestionId={appliedSuggestionId} onApply={applySuggestion} suggestions={matchingSuggestions} />

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-8 lg:col-span-8">
              <ReceptionPanel>
                <PanelTitle icon="person" title="Thông tin khách hàng" />
                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="Họ và tên" onChange={(value) => updateField('customerName', value)} placeholder="Nguyễn Văn A" value={form.customerName} />
                  <Field label="Số điện thoại" onChange={(value) => updateField('phone', value)} placeholder="090 123 4567" type="tel" value={form.phone} />
                  <Field label="Email" onChange={(value) => updateField('customerEmail', value)} placeholder="customer@example.com" type="email" value={form.customerEmail} />
                  <Field label="Địa chỉ" onChange={(value) => updateField('address', value)} placeholder="123 Nguyễn Văn Linh, Quận 7" value={form.address} />
                </div>
              </ReceptionPanel>

              <ReceptionPanel>
                <PanelTitle icon="car" title="Thông tin phương tiện" />
                <div className="grid gap-6 md:grid-cols-3">
                  <Field className="md:col-span-2" label="Dòng xe / hiệu xe" onChange={(value) => updateField('model', value)} placeholder="BMW M4 Competition" value={form.model} />
                  <SelectField label="Năm sản xuất" onChange={(value) => updateField('year', value)} value={form.year} />
                  <Field label="Số km hiện tại" onChange={(value) => updateField('mileage', value)} placeholder="18,240 km" value={form.mileage} />
                  <Field label="Số khung (VIN)" onChange={(value) => updateField('vin', value)} placeholder="WBS33AZ08PCM44882" value={form.vin} />
                  <Field label="Số máy" onChange={(value) => updateField('engineNo', value)} placeholder="ENG-987654" value={form.engineNo} />
                </div>
              </ReceptionPanel>
            </div>

            <aside className="lg:col-span-4">
              <section className="flex h-full flex-col bg-[#1b1c1c] p-8 text-white shadow-[0_18px_45px_rgba(15,14,14,0.18)]">
                <PanelTitle dark icon="calendar" title="Yêu cầu & lịch hẹn" />
                <div className="flex-1 space-y-8">
                  <TextAreaField
                    dark
                    label="Mô tả vấn đề / yêu cầu dịch vụ"
                    onChange={(value) => updateField('issueDescription', value)}
                    placeholder="Mô tả tình trạng xe hoặc các gói dịch vụ cần thực hiện..."
                    rows={7}
                    value={form.issueDescription}
                  />
                  <label className="space-y-2">
                    <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#e7bdb8]">Ngày hẹn trả xe</span>
                    <input className="w-full border-0 bg-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#ba0013]" onChange={(event) => updateField('appointmentDate', event.target.value)} type="date" value={form.appointmentDate} />
                  </label>
                  <label className="space-y-2">
                    <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#e7bdb8]">Giờ hẹn trả xe</span>
                    <input className="w-full border-0 bg-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#ba0013]" onChange={(event) => updateField('appointmentTime', event.target.value)} type="time" value={form.appointmentTime} />
                  </label>
                </div>
                <div className="mt-12 border-t border-white/10 pt-8">
                  <div className="mb-4 flex items-center gap-2 font-black uppercase text-[#e31e24]">
                    <Icon name="alert" />
                    Xác nhận tiếp nhận
                  </div>
                  <button
                    className="flex min-h-[68px] w-full items-center justify-center gap-4 bg-[#ba0013] px-8 text-xl font-black uppercase text-white shadow-[0_18px_32px_rgba(186,0,19,0.22)] transition hover:bg-[#e31e24]"
                    disabled={saving}
                    type="submit"
                  >
                    {saving ? 'Đang lưu...' : 'Lưu biểu mẫu'}
                    <Icon name="check" />
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </form>

        <section className="grid gap-6 md:grid-cols-3">
          <InfoCard icon="check" title="Điền nhanh chính xác">
            Hồ sơ cũ giúp giảm nhập liệu lại và hạn chế sai số điện thoại, VIN hoặc biển số.
          </InfoCard>
          <InfoCard icon="calendar" title="Gợi ý dịch vụ phù hợp">
            Lịch sử sửa chữa được dùng để nhắc các hạng mục nên kiểm tra trong lần tiếp nhận này.
          </InfoCard>
          <InfoCard icon="info" title="Cảnh báo trước khi báo giá">
            Các ghi chú rủi ro từ lần sửa trước được đưa vào mô tả để cố vấn không bỏ sót.
          </InfoCard>
        </section>
      </div>
    </ServiceAdvisorShell>
  )
}
