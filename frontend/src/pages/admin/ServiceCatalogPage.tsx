import { useEffect, useMemo, useState } from 'react'
import {
  createWorkshopService,
  deleteWorkshopService,
  fetchWorkshopServices,
  updateWorkshopService,
  type ApiService,
} from '../../shared/api/workshop'
import { useAuth } from '../../shared/auth'
import { Icon, type IconName } from '../../shared/ui/base'
import { AdminShell } from '../../widgets/admin-shell'

type ServiceRow = {
  id: string
  name: string
  category: string
  basePrice: number
  estimatedDuration: number
}

type ServiceForm = {
  name: string
  category: string
  basePrice: string
  estimatedDuration: string
}

const emptyForm: ServiceForm = { basePrice: '', category: '', estimatedDuration: '', name: '' }

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(value)) + 'đ'
}

function mapService(service: ApiService): ServiceRow {
  return {
    basePrice: service.basePrice ?? service.price ?? 0,
    category: service.category || 'Chưa phân loại',
    estimatedDuration: service.estimatedDuration ?? 0,
    id: service._id || service.id || crypto.randomUUID(),
    name: service.name || 'Dịch vụ chưa đặt tên',
  }
}

function StatCard({ icon, label, value }: { icon: IconName; label: string; value: string }) {
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

function FormField({
  label,
  onChange,
  placeholder,
  suffix,
  type = 'text',
  value,
}: {
  label: string
  onChange: (value: string) => void
  placeholder?: string
  suffix?: string
  type?: string
  value: string
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">{label}</span>
      <div className="mt-2 flex items-center border border-[#d8d5d5] bg-[#fbf9f8] focus-within:border-[#ba0013]">
        <input
          className="min-h-11 w-full bg-transparent px-3 text-sm font-semibold text-[#1b1c1c] outline-none"
          min={type === 'number' ? 0 : undefined}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />
        {suffix ? <span className="px-3 font-mono text-[10px] font-black uppercase text-[#6a6767]">{suffix}</span> : null}
      </div>
    </label>
  )
}

export function ServiceCatalogPage() {
  const { token } = useAuth()
  const [services, setServices] = useState<ServiceRow[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<ServiceForm>(emptyForm)
  const [apiMessage, setApiMessage] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function loadServices() {
    if (!token) return
    setLoading(true)
    setApiMessage(undefined)
    try {
      const catalog = await fetchWorkshopServices(token)
      setServices((Array.isArray(catalog) ? catalog : []).map(mapService))
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Không tải được danh mục dịch vụ từ API')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadServices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const categories = useMemo(() => Array.from(new Set(services.map((service) => service.category))).sort(), [services])
  const filtered = useMemo(
    () =>
      services.filter((service) => {
        const matchesSearch = service.name.toLowerCase().includes(search.trim().toLowerCase())
        const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter
        return matchesSearch && matchesCategory
      }),
    [services, search, categoryFilter],
  )
  const avgPrice = services.length ? services.reduce((sum, service) => sum + service.basePrice, 0) / services.length : 0

  function openCreate() {
    setEditingId('new')
    setForm(emptyForm)
    setApiMessage(undefined)
  }

  function openEdit(service: ServiceRow) {
    setEditingId(service.id)
    setForm({
      basePrice: String(service.basePrice),
      category: service.category,
      estimatedDuration: String(service.estimatedDuration),
      name: service.name,
    })
    setApiMessage(undefined)
  }

  function closeForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function saveService() {
    if (!token) return
    if (!form.name.trim()) {
      setApiMessage('Vui lòng nhập tên dịch vụ.')
      return
    }

    const payload: ApiService = {
      basePrice: Number(form.basePrice) || 0,
      category: form.category.trim() || 'Chưa phân loại',
      estimatedDuration: Number(form.estimatedDuration) || 0,
      name: form.name.trim(),
    }

    setSaving(true)
    setApiMessage(undefined)
    try {
      if (editingId && editingId !== 'new') {
        await updateWorkshopService(token, editingId, payload)
        setApiMessage('Đã cập nhật dịch vụ qua API.')
      } else {
        await createWorkshopService(token, payload)
        setApiMessage('Đã thêm dịch vụ mới qua API.')
      }
      closeForm()
      await loadServices()
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Không lưu được dịch vụ. Kiểm tra lại kết nối API.')
    } finally {
      setSaving(false)
    }
  }

  async function removeService(service: ServiceRow) {
    if (!token) return
    setSaving(true)
    setApiMessage(undefined)
    try {
      await deleteWorkshopService(token, service.id)
      if (editingId === service.id) closeForm()
      setApiMessage('Đã xoá dịch vụ khỏi danh mục.')
      await loadServices()
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Không xoá được dịch vụ.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell active="services" title="Quản lý danh mục dịch vụ">
      <div className="space-y-7">
        <section className="relative overflow-hidden border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
          <div className="absolute right-8 top-8 hidden text-[#ba0013]/10 lg:block">
            <Icon className="h-32 w-32" name="wrench" />
          </div>
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#ba0013]">Service Catalog</p>
              <h2 className="mt-3 text-4xl font-black leading-tight text-[#171717] md:text-5xl">Quản lý dịch vụ &amp; bảng giá</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#6a6767]">
                Admin cấu hình danh mục dịch vụ, giá công và thời lượng chuẩn để cố vấn dịch vụ dùng khi tạo lệnh sửa chữa và lập
                báo giá.
              </p>
            </div>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-3 bg-[#ba0013] px-6 text-sm font-black uppercase text-white transition hover:bg-[#94000f]"
              onClick={openCreate}
              type="button"
            >
              <Icon name="plus" />
              Thêm dịch vụ
            </button>
          </div>
        </section>

        {apiMessage ? <div className="border border-[#e7bdb8] bg-[#fffafa] px-5 py-4 text-sm font-bold text-[#ba0013]">{apiMessage}</div> : null}

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard icon="wrench" label="Tổng dịch vụ" value={`${services.length}`} />
          <StatCard icon="grid" label="Nhóm dịch vụ" value={`${categories.length}`} />
          <StatCard icon="cash" label="Giá công trung bình" value={formatMoney(avgPrice)} />
        </section>

        <div className={`grid items-start gap-7 ${editingId ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
          <section className="border border-[#efeded] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#efeded] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 border border-[#d8d5d5] bg-[#fbf9f8] px-3 lg:w-72">
                <Icon className="text-[#6a6767]" name="search" />
                <input
                  className="min-h-10 w-full bg-transparent text-sm font-semibold text-[#1b1c1c] outline-none"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo tên dịch vụ..."
                  value={search}
                />
              </div>
              <select
                className="min-h-10 border border-[#d8d5d5] bg-[#fbf9f8] px-3 text-sm font-semibold text-[#1b1c1c] outline-none focus:border-[#ba0013]"
                onChange={(event) => setCategoryFilter(event.target.value)}
                value={categoryFilter}
              >
                <option value="all">Tất cả nhóm</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden grid-cols-[1.6fr_1fr_1fr_0.8fr_auto] gap-3 border-b border-[#efeded] px-6 py-3 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#6a6767] lg:grid">
              <span>Dịch vụ</span>
              <span>Nhóm</span>
              <span>Giá công</span>
              <span>Thời lượng</span>
              <span className="text-right">Thao tác</span>
            </div>

            <div className="divide-y divide-[#efeded]">
              {loading ? (
                <div className="px-6 py-8 text-sm font-bold text-[#6a6767]">Đang tải danh mục dịch vụ…</div>
              ) : filtered.length ? (
                filtered.map((service) => (
                  <div
                    className={`grid grid-cols-2 items-center gap-3 px-6 py-4 lg:grid-cols-[1.6fr_1fr_1fr_0.8fr_auto] ${editingId === service.id ? 'bg-[#fffafa]' : ''}`}
                    key={service.id}
                  >
                    <p className="col-span-2 font-black text-[#171717] lg:col-span-1">{service.name}</p>
                    <span className="w-fit bg-[#fff1f1] px-2 py-1 text-[10px] font-black uppercase text-[#ba0013]">{service.category}</span>
                    <p className="text-sm font-black text-[#171717]">{formatMoney(service.basePrice)}</p>
                    <p className="text-sm font-semibold text-[#6a6767]">{service.estimatedDuration} phút</p>
                    <div className="col-span-2 flex justify-end gap-2 lg:col-span-1">
                      <button
                        aria-label="Sửa"
                        className="flex h-9 w-9 items-center justify-center border border-[#d8d5d5] text-[#555151] transition hover:border-[#ba0013] hover:text-[#ba0013]"
                        onClick={() => openEdit(service)}
                        type="button"
                      >
                        <Icon className="h-4 w-4" name="sliders" />
                      </button>
                      <button
                        aria-label="Xoá"
                        className="flex h-9 w-9 items-center justify-center border border-[#d8d5d5] text-[#555151] transition hover:border-[#ba0013] hover:text-[#ba0013] disabled:opacity-50"
                        disabled={saving}
                        onClick={() => removeService(service)}
                        type="button"
                      >
                        <Icon className="h-4 w-4" name="logout" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-sm font-bold text-[#6a6767]">Không có dịch vụ nào khớp bộ lọc. Bấm “Thêm dịch vụ” để tạo mới.</div>
              )}
            </div>
          </section>

          {editingId ? (
            <aside className="sticky top-28 space-y-4 border border-[#efeded] bg-white p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-[#171717]">{editingId === 'new' ? 'Thêm dịch vụ mới' : 'Sửa dịch vụ'}</h3>
                <button aria-label="Đóng" className="text-[#6a6767] hover:text-[#ba0013]" onClick={closeForm} type="button">
                  ×
                </button>
              </div>

              <FormField label="Tên dịch vụ" onChange={(value) => setForm((current) => ({ ...current, name: value }))} placeholder="Thay dầu động cơ" value={form.name} />
              <FormField label="Nhóm dịch vụ" onChange={(value) => setForm((current) => ({ ...current, category: value }))} placeholder="Bảo dưỡng định kỳ" value={form.category} />
              <FormField label="Giá công" onChange={(value) => setForm((current) => ({ ...current, basePrice: value }))} placeholder="350000" suffix="đ" type="number" value={form.basePrice} />
              <FormField label="Thời lượng chuẩn" onChange={(value) => setForm((current) => ({ ...current, estimatedDuration: value }))} placeholder="45" suffix="phút" type="number" value={form.estimatedDuration} />

              <button
                className="flex min-h-12 w-full items-center justify-center gap-3 bg-[#ba0013] px-5 text-sm font-black uppercase text-white transition hover:bg-[#94000f] disabled:opacity-60"
                disabled={saving}
                onClick={saveService}
                type="button"
              >
                <Icon name="check" />
                {saving ? 'Đang lưu…' : editingId === 'new' ? 'Tạo dịch vụ' : 'Lưu thay đổi'}
              </button>
            </aside>
          ) : null}
        </div>
      </div>
    </AdminShell>
  )
}
