import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../shared/auth'
import { Icon, type IconName } from '../../shared/ui/base'

type InspectionStatus = 'done' | 'active' | 'waiting'

type InspectionItem = {
  id: string
  description: string
  label: string
  status: InspectionStatus
}

type PhotoCategory = {
  id: string
  icon: IconName
  label: string
  required: number
}

type UploadedPhoto = {
  id: string
  categoryId: string
  name: string
  note: string
  previewUrl: string
  size: string
}

const inspectionItems: InspectionItem[] = [
  {
    description: 'Chụp đủ 4 góc thân xe trước khi vào xưởng.',
    id: 'exterior',
    label: 'Ngoại thất & vết trầy xước',
    status: 'active',
  },
  {
    description: 'Ghi nhận mức dầu, nước làm mát và tình trạng khoang máy.',
    id: 'engine',
    label: 'Khoang máy',
    status: 'waiting',
  },
  {
    description: 'Chụp odo, đèn cảnh báo và nội thất trước ghế lái.',
    id: 'interior',
    label: 'Nội thất & đồng hồ',
    status: 'done',
  },
  {
    description: 'Chụp lốp, mâm, đĩa phanh và gầm xe nếu có dấu hiệu bất thường.',
    id: 'undercarriage',
    label: 'Gầm xe & bánh xe',
    status: 'waiting',
  },
]

const photoCategories: PhotoCategory[] = [
  { icon: 'car', id: 'exterior', label: 'Ngoại thất', required: 4 },
  { icon: 'wrench', id: 'engine', label: 'Khoang máy', required: 2 },
  { icon: 'clipboard', id: 'interior', label: 'Nội thất / ODO', required: 2 },
  { icon: 'lift', id: 'undercarriage', label: 'Gầm xe', required: 3 },
]

const statusLabels: Record<InspectionStatus, string> = {
  active: 'Đang kiểm tra',
  done: 'Đã xong',
  waiting: 'Chờ xử lý',
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function TechnicianShell({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-[#fbf9f8] text-[#1b1c1c]">
      <aside className="hidden min-h-screen w-64 border-r border-[#efeded] bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 border-b border-[#efeded] px-7">
          <div className="flex h-11 w-11 items-center justify-center bg-[#ba0013] text-white">
            <Icon name="wrench" />
          </div>
          <div>
            <p className="text-lg font-black leading-none text-[#171717]">Kapa Workshop</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-[#8a8686]">Technician</p>
          </div>
        </div>

        <div className="border-b border-[#efeded] px-7 py-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a8686]">Kỹ thuật viên</p>
          <p className="mt-2 text-sm font-black text-[#1b1c1c]">Nguyễn Minh</p>
          <p className="mt-1 text-xs text-[#6a6767]">Cầu nâng 03 - Ca sáng</p>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          <Link className="flex min-h-12 items-center gap-3 border-l-4 border-[#ba0013] bg-[#fff1f1] px-4 text-sm font-black text-[#ba0013]" to="/technician/tasks">
            <Icon name="clipboard" />
            Phiếu kiểm tra
          </Link>
          <Link className="flex min-h-12 items-center gap-3 px-4 text-sm font-bold text-[#555151] transition hover:bg-[#fbf9f8] hover:text-[#ba0013]" to="/technician/work-orders">
            <Icon name="wrench" />
            Lệnh được giao
          </Link>
          <Link className="flex min-h-12 items-center gap-3 px-4 text-sm font-bold text-[#555151] transition hover:bg-[#fbf9f8] hover:text-[#ba0013]" to="/technician/repair-notes">
            <Icon name="invoice" />
            Ghi chú sửa chữa
          </Link>
          <span
            aria-disabled="true"
            className="flex min-h-12 cursor-not-allowed items-center gap-3 px-4 text-sm font-bold text-[#c8c6c5]"
            title="Tính năng đang được phát triển"
          >
            <Icon name="sliders" />
            Yêu cầu phụ tùng
            <span className="ml-auto text-[10px] font-black uppercase tracking-[0.08em] text-[#c8c6c5]">Sắp ra mắt</span>
          </span>
        </nav>

        <div className="border-t border-[#efeded] p-5">
          <button className="flex min-h-11 w-full items-center gap-3 px-2 text-sm font-bold text-[#555151] hover:text-[#ba0013]" onClick={logout} type="button">
            <Icon name="logout" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-[#efeded] bg-white/90 backdrop-blur-xl">
          <div className="flex min-h-20 items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-[#ba0013]">Technician Inspection</p>
              <h1 className="text-2xl font-black text-[#171717] sm:text-3xl">Upload ảnh xe trong phiếu kiểm tra</h1>
            </div>
            <div className="hidden items-center gap-4 sm:flex">
              <button aria-label="Thông báo" className="relative flex h-11 w-11 items-center justify-center border border-[#dedada] text-[#1b1c1c] transition hover:border-[#ba0013] hover:text-[#ba0013]" type="button">
                <Icon name="bell" />
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center bg-[#ba0013] px-1 text-[10px] font-black text-white">1</span>
              </button>
              <div className="flex h-11 w-11 items-center justify-center bg-[#1b1c1c] text-sm font-black text-white">NM</div>
            </div>
          </div>
        </header>

        <main className="w-full px-5 py-7 sm:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: InspectionStatus }) {
  const className = {
    active: 'bg-[#fff1f1] text-[#ba0013] border-[#ba0013]',
    done: 'bg-green-50 text-green-700 border-green-200',
    waiting: 'bg-[#fbf9f8] text-[#6a6767] border-[#d8d5d5]',
  }[status]

  return <span className={`border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${className}`}>{statusLabels[status]}</span>
}

function InspectionChecklist() {
  return (
    <section className="border border-[#efeded] bg-white shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
      <div className="border-b border-[#efeded] px-6 py-5">
        <h2 className="text-lg font-black text-[#171717]">Checklist kiểm tra</h2>
        <p className="mt-1 text-sm font-semibold text-[#6a6767]">Ảnh cần gắn đúng hạng mục để cố vấn và khách hàng dễ đối chiếu.</p>
      </div>
      <div className="divide-y divide-[#efeded]">
        {inspectionItems.map((item) => (
          <article className={item.status === 'active' ? 'border-l-4 border-[#ba0013] bg-[#fffafa] p-5' : 'p-5'} key={item.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <span className={item.status === 'done' ? 'mt-1 text-green-700' : item.status === 'active' ? 'mt-1 text-[#ba0013]' : 'mt-1 text-[#8a8686]'}>
                  <Icon name={item.status === 'done' ? 'check' : 'clipboard'} />
                </span>
                <div>
                  <p className="font-black text-[#171717]">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-[#6a6767]">{item.description}</p>
                </div>
              </div>
              <StatusBadge status={item.status} />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function TechnicianInspectionPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState(photoCategories[0].id)
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [note, setNote] = useState('Cản trước có vết xước nhẹ bên phải. Cần chụp thêm gầm xe sau khi nâng.')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleUpload(files: FileList | null) {
    if (!files?.length) {
      return
    }

    const uploadedPhotos = Array.from(files).map((file) => ({
      categoryId: selectedCategoryId,
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      name: file.name,
      note: '',
      previewUrl: URL.createObjectURL(file),
      size: formatFileSize(file.size),
    }))

    setPhotos((current) => [...uploadedPhotos, ...current])

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  function removePhoto(id: string) {
    setPhotos((current) => current.filter((photo) => photo.id !== id))
  }

  function categoryCount(categoryId: string) {
    return photos.filter((photo) => photo.categoryId === categoryId).length
  }

  const selectedCategory = photoCategories.find((category) => category.id === selectedCategoryId) ?? photoCategories[0]
  const uploadedCount = photos.length
  const requiredCount = photoCategories.reduce((sum, category) => sum + category.required, 0)

  return (
    <TechnicianShell>
      <div className="space-y-7">
        <section className="relative overflow-hidden border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
          <div className="grid gap-6 xl:grid-cols-[1fr_320px] xl:items-center">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#ba0013]">Phiếu kiểm tra RO-2026-0882</p>
              <h2 className="mt-3 text-4xl font-black leading-tight text-[#171717] md:text-5xl">BMW M4 Competition - 51K-882.88</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#6a6767]">
                Kỹ thuật viên chụp ảnh xe theo từng hạng mục trước khi bắt đầu sửa chữa. Ảnh dùng để minh bạch tình trạng xe với cố vấn và khách hàng.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 border border-[#efeded] bg-[#fbf9f8] p-5">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Ảnh đã tải</p>
                <p className="mt-2 text-3xl font-black text-[#ba0013]">{uploadedCount}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#6a6767]">Tối thiểu</p>
                <p className="mt-2 text-3xl font-black text-[#171717]">{requiredCount}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-7">
            <section className="border border-[#efeded] bg-white p-6 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-[#ba0013]">Upload ảnh kiểm tra</p>
                  <h3 className="mt-2 text-2xl font-black text-[#171717]">Chọn hạng mục rồi tải ảnh</h3>
                  <p className="mt-2 max-w-2xl text-sm font-semibold text-[#6a6767]">Hỗ trợ chọn nhiều ảnh cùng lúc. Ảnh mới sẽ hiển thị ngay để kiểm tra trước khi lưu phiếu.</p>
                </div>
                <button
                  className="inline-flex min-h-12 items-center justify-center gap-3 bg-[#ba0013] px-6 text-sm font-black uppercase text-white transition hover:bg-[#94000f]"
                  onClick={() => inputRef.current?.click()}
                  type="button"
                >
                  <Icon name="plus" />
                  Tải ảnh xe
                </button>
                <input accept="image/*" className="hidden" multiple onChange={(event) => handleUpload(event.target.files)} ref={inputRef} type="file" />
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {photoCategories.map((category) => {
                  const active = category.id === selectedCategoryId
                  const count = categoryCount(category.id)

                  return (
                    <button
                      className={active ? 'border-l-4 border-[#ba0013] bg-[#fffafa] p-4 text-left' : 'border border-[#efeded] bg-[#fbf9f8] p-4 text-left transition hover:border-[#ba0013]'}
                      key={category.id}
                      onClick={() => setSelectedCategoryId(category.id)}
                      type="button"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className={active ? 'text-[#ba0013]' : 'text-[#555151]'}>
                          <Icon name={category.icon} />
                        </span>
                        <span className="font-mono text-[10px] font-black uppercase text-[#6a6767]">{count}/{category.required}</span>
                      </span>
                      <span className="mt-3 block font-black text-[#171717]">{category.label}</span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 border border-dashed border-[#e7bdb8] bg-[#fffafa] p-6">
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                  <span className="flex h-14 w-14 items-center justify-center bg-[#ba0013] text-white">
                    <Icon name="plus" />
                  </span>
                  <div>
                    <p className="font-black text-[#171717]">Đang gắn ảnh vào: {selectedCategory.label}</p>
                    <p className="mt-1 text-sm font-semibold text-[#6a6767]">Bấm “Tải ảnh xe” hoặc chọn hạng mục khác trước khi upload.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="border border-[#efeded] bg-white shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
              <div className="flex items-center justify-between border-b border-[#efeded] px-6 py-5">
                <div>
                  <h3 className="text-lg font-black text-[#171717]">Ảnh đã tải lên</h3>
                  <p className="mt-1 text-sm font-semibold text-[#6a6767]">Xem nhanh, kiểm tra hạng mục và xóa ảnh sai trước khi lưu.</p>
                </div>
                <span className="bg-[#fff1f1] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#ba0013]">{uploadedCount} ảnh</span>
              </div>

              {photos.length ? (
                <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
                  {photos.map((photo) => {
                    const category = photoCategories.find((item) => item.id === photo.categoryId)

                    return (
                      <article className="overflow-hidden border border-[#efeded] bg-[#fbf9f8]" key={photo.id}>
                        <img alt={photo.name} className="aspect-[4/3] w-full object-cover" src={photo.previewUrl} />
                        <div className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="line-clamp-1 font-black text-[#171717]">{photo.name}</p>
                              <p className="mt-1 text-xs font-semibold text-[#6a6767]">{category?.label} - {photo.size}</p>
                            </div>
                            <button aria-label="Xóa ảnh" className="text-[#ba0013] transition hover:text-[#94000f]" onClick={() => removePhoto(photo.id)} type="button">
                              <Icon name="logout" />
                            </button>
                          </div>
                          <input className="w-full border border-[#d8d5d5] bg-white px-3 py-2 text-sm outline-none focus:border-[#ba0013]" placeholder="Ghi chú ảnh..." />
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="p-10 text-center">
                  <Icon className="mx-auto h-12 w-12 text-[#ba0013]" name="car" />
                  <p className="mt-4 text-lg font-black text-[#171717]">Chưa có ảnh kiểm tra</p>
                  <p className="mt-2 text-sm font-semibold text-[#6a6767]">Tải ảnh ngoại thất, khoang máy, nội thất hoặc gầm xe để hoàn thiện phiếu.</p>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-7">
            <InspectionChecklist />

            <section className="bg-[#1b1c1c] p-6 text-white shadow-[0_18px_45px_rgba(15,14,14,0.18)]">
              <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-[#ffb4ab]">Ghi chú kỹ thuật viên</p>
              <textarea
                className="mt-4 min-h-36 w-full border-0 bg-white/10 p-4 text-sm text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-[#ba0013]"
                onChange={(event) => setNote(event.target.value)}
                value={note}
              />
              <button className="mt-5 flex min-h-12 w-full items-center justify-center gap-3 bg-[#ba0013] px-5 text-sm font-black uppercase text-white transition hover:bg-[#e31e24]" type="button">
                <Icon name="check" />
                Lưu phiếu kiểm tra
              </button>
            </section>
          </aside>
        </div>
      </div>
    </TechnicianShell>
  )
}


