import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../shared/ui/base'
import { Field, SelectField, TextAreaField } from '../../widgets/vehicle-reception/ui/FormFields'
import { PanelTitle, ReceptionPanel } from '../../widgets/vehicle-reception/ui/ReceptionPanel'

function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e4e2e2] bg-white/90 backdrop-blur-xl">
      <nav className="flex h-20 w-full items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link className="text-2xl font-black tracking-tight text-[#ba0013]" to="/admin/dashboard">
            Garage Master
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <Link className="font-semibold text-[#5f5e5e] transition hover:text-[#ba0013]" to="/admin/dashboard">
              Dashboard
            </Link>
            <Link className="font-semibold text-[#5f5e5e] transition hover:text-[#ba0013]" to="/advisor/bookings">
              Schedule
            </Link>
            <Link className="font-semibold text-[#5f5e5e] transition hover:text-[#ba0013]" to="/admin/reports">
              Reports
            </Link>
            <Link className="font-semibold text-[#5f5e5e] transition hover:text-[#ba0013]" to="/admin/settings">
              Settings
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link className="hidden bg-[#ba0013] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#93000d] sm:inline-flex" to="/advisor/reception">
            Create Order
          </Link>
          <button aria-label="Thông báo" className="text-[#5f5e5e] transition hover:text-[#ba0013]" type="button">
            <Icon name="bell" />
          </button>
          <button aria-label="Tài khoản" className="text-[#5f5e5e] transition hover:text-[#ba0013]" type="button">
            <Icon name="person" />
          </button>
        </div>
      </nav>
    </header>
  )
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

export function VehicleReceptionPage() {
  const [plateStatus, setPlateStatus] = useState<'idle' | 'checking' | 'found'>('idle')

  function checkPlate() {
    setPlateStatus('checking')
    window.setTimeout(() => setPlateStatus('found'), 800)
  }

  const searchLabel =
    plateStatus === 'checking' ? 'Đang kiểm tra...' : plateStatus === 'found' ? 'Đã tìm thấy xe' : 'Kiểm tra hệ thống'

  return (
    <div className="min-h-screen bg-[#fbf9f8] text-[#1b1c1c]">
      <TopNav />

      <main className="w-full px-6 py-12">
        <section className="mb-12 border-l-8 border-[#ba0013] pl-6">
          <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.24em] text-[#ba0013]">Service Operations</p>
          <h1 className="text-4xl font-black tracking-tight text-[#1b1c1c] md:text-5xl">Biểu mẫu tiếp nhận xe</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#5f5e5e]">
            Nhập thông tin khách hàng và phương tiện để khởi tạo hồ sơ dịch vụ chính xác.
          </p>
        </section>

        <form className="space-y-16">
          <section className="relative overflow-hidden border border-[#e4e2e2] bg-white p-8 shadow-sm">
            <div className="absolute bottom-0 left-0 top-0 w-1 bg-[#ba0013]" />
            <div className="flex flex-col gap-6 md:flex-row md:items-end">
              <label className="flex-1 space-y-2">
                <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f5e5e]">
                  Biển số xe (License Plate)
                </span>
                <span className="relative block">
                  <input
                    className="w-full border border-[#e7bdb8] bg-white p-4 pr-12 text-2xl font-black uppercase text-[#1b1c1c] placeholder:text-[#c8c6c5] outline-none transition focus:border-[#ba0013] focus:ring-4 focus:ring-[#ba0013]/10"
                    placeholder="29A-123.45"
                    type="text"
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
          </section>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-12 lg:col-span-8">
              <ReceptionPanel>
                <PanelTitle icon="person" title="Thông tin khách hàng" />
                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="Họ và tên" placeholder="Nguyễn Văn A" />
                  <Field label="Số điện thoại" placeholder="090 123 4567" type="tel" />
                  <Field label="Email" placeholder="customer@example.com" type="email" />
                  <Field label="Địa chỉ" placeholder="123 Street, District 1, HCMC" />
                </div>
              </ReceptionPanel>

              <ReceptionPanel>
                <PanelTitle icon="car" title="Thông tin phương tiện" />
                <div className="grid gap-6 md:grid-cols-3">
                  <Field className="md:col-span-2" label="Dòng xe / hiệu xe (Make/Model)" placeholder="Mercedes-Benz C300" />
                  <SelectField label="Năm sản xuất" />
                  <Field label="Số KM hiện tại" placeholder="12,500 km" />
                  <Field label="Số khung (VIN)" placeholder="WDD1234567..." />
                  <Field label="Số máy" placeholder="ENG-987654" />
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
                    placeholder="Vui lòng mô tả tình trạng xe hoặc các gói dịch vụ cần thực hiện..."
                    rows={6}
                  />
                  <label className="space-y-2">
                    <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#e7bdb8]">Ngày hẹn trả xe</span>
                    <input className="w-full border-0 bg-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#ba0013]" type="date" />
                  </label>
                  <label className="space-y-2">
                    <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#e7bdb8]">Giờ hẹn trả xe</span>
                    <input className="w-full border-0 bg-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#ba0013]" type="time" />
                  </label>
                </div>
                <div className="mt-12 border-t border-white/10 pt-8">
                  <div className="mb-4 flex items-center gap-2 font-black uppercase text-[#e31e24]">
                    <Icon name="alert" />
                    Xác nhận tiếp nhận
                  </div>
                  <button
                    className="flex min-h-[68px] w-full items-center justify-center gap-4 bg-[#ba0013] px-8 text-2xl font-black uppercase text-white shadow-[0_18px_32px_rgba(186,0,19,0.22)] transition hover:bg-[#e31e24]"
                    type="submit"
                  >
                    Lưu biểu mẫu
                    <Icon name="check" />
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </form>

        <section className="mt-20 grid gap-6 md:grid-cols-3">
          <InfoCard icon="check" title="Kiểm định chính hãng">
            Tất cả xe tiếp nhận đều được quét lỗi bằng thiết bị chuyên dụng chuẩn Châu Âu.
          </InfoCard>
          <InfoCard icon="calendar" title="Đúng tiến độ">
            Hệ thống dự báo thời gian hoàn thành dựa trên khối lượng công việc hiện tại.
          </InfoCard>
          <InfoCard icon="info" title="Bảo hành dịch vụ">
            Cam kết linh kiện chính hãng và bảo hành lên đến 24 tháng cho mọi gói sửa chữa.
          </InfoCard>
        </section>
      </main>

      <footer className="mt-20 bg-[#1b1c1c] py-12 text-white">
        <div className="flex w-full flex-col items-center justify-between gap-8 px-6 md:flex-row">
          <div>
            <p className="text-2xl font-black uppercase text-[#e31e24]">Garage Master</p>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.16em] text-[#c8c6c5]">© 2026 Precision Automotive Care</p>
          </div>
          <div className="flex gap-8 text-sm font-black uppercase">
            <a className="hover:text-[#e31e24]" href="#">Điều khoản</a>
            <a className="hover:text-[#e31e24]" href="#">Bảo mật</a>
            <a className="hover:text-[#e31e24]" href="#">Đăng xuất</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
