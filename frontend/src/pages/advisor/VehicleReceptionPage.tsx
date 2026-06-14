import { useState } from 'react'
import { Icon } from '../../shared/ui/base'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'
import { Field, SelectField, TextAreaField } from '../../widgets/vehicle-reception/ui/FormFields'
import { PanelTitle, ReceptionPanel } from '../../widgets/vehicle-reception/ui/ReceptionPanel'

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
    <ServiceAdvisorShell active="reception" title="Biểu mẫu tiếp nhận xe">
      <div className="space-y-12">
        <section className="border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
          <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.24em] text-[#ba0013]">Service Reception</p>
          <h2 className="text-4xl font-black tracking-tight text-[#1b1c1c] md:text-5xl">Tiếp nhận xe mới</h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5f5e5e]">
            Nhập biển số, tạo hồ sơ khách hàng và phương tiện trước khi chuyển sang lệnh sửa chữa.
          </p>
        </section>

        <form className="space-y-12">
          <section className="relative overflow-hidden border border-[#e4e2e2] bg-white p-8 shadow-sm">
            <div className="absolute bottom-0 left-0 top-0 w-1 bg-[#ba0013]" />
            <div className="flex flex-col gap-6 md:flex-row md:items-end">
              <label className="flex-1 space-y-2">
                <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f5e5e]">
                  Biển số xe
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
            <div className="space-y-8 lg:col-span-8">
              <ReceptionPanel>
                <PanelTitle icon="person" title="Thông tin khách hàng" />
                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="Họ và tên" placeholder="Nguyễn Văn A" />
                  <Field label="Số điện thoại" placeholder="090 123 4567" type="tel" />
                  <Field label="Email" placeholder="customer@example.com" type="email" />
                  <Field label="Địa chỉ" placeholder="123 Nguyễn Văn Linh, Quận 7" />
                </div>
              </ReceptionPanel>

              <ReceptionPanel>
                <PanelTitle icon="car" title="Thông tin phương tiện" />
                <div className="grid gap-6 md:grid-cols-3">
                  <Field className="md:col-span-2" label="Dòng xe / hiệu xe" placeholder="BMW M4 Competition" />
                  <SelectField label="Năm sản xuất" />
                  <Field label="Số km hiện tại" placeholder="18,240 km" />
                  <Field label="Số khung (VIN)" placeholder="WBS33AZ08PCM44882" />
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
                    placeholder="Mô tả tình trạng xe hoặc các gói dịch vụ cần thực hiện..."
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
                    className="flex min-h-[68px] w-full items-center justify-center gap-4 bg-[#ba0013] px-8 text-xl font-black uppercase text-white shadow-[0_18px_32px_rgba(186,0,19,0.22)] transition hover:bg-[#e31e24]"
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

        <section className="grid gap-6 md:grid-cols-3">
          <InfoCard icon="check" title="Kiểm định chính hãng">
            Xe tiếp nhận được kiểm tra bằng thiết bị chuyên dụng và lưu hồ sơ rõ ràng.
          </InfoCard>
          <InfoCard icon="calendar" title="Đúng tiến độ">
            Thời gian hẹn trả xe được ghi nhận để Service Advisor theo dõi trong toàn bộ quy trình.
          </InfoCard>
          <InfoCard icon="info" title="Minh bạch dịch vụ">
            Hồ sơ tiếp nhận là đầu vào cho lệnh sửa chữa, báo giá và thông báo khách hàng.
          </InfoCard>
        </section>
      </div>
    </ServiceAdvisorShell>
  )
}
