import { useState } from 'react'
import { Button, Icon } from '../../components/base'
import { Field, receptionInputClass, SelectField, TextAreaField } from '../../components/reception/FormFields'
import { GlassPanel, PanelTitle } from '../../components/reception/ReceptionPanel'
import { DashboardLayout } from '../../layouts/DashboardLayout'

export function VehicleReceptionPage() {
  const [plateStatus, setPlateStatus] = useState<'idle' | 'checking' | 'found'>('idle')

  function checkPlate() {
    setPlateStatus('checking')
    window.setTimeout(() => setPlateStatus('found'), 800)
  }

  const searchLabel =
    plateStatus === 'checking'
      ? 'Đang kiểm tra...'
      : plateStatus === 'found'
        ? 'Đã tìm thấy xe'
        : 'Kiểm tra hệ thống'

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-2">
          <nav className="flex items-center gap-2 text-sm font-bold text-[var(--color-on-surface-variant)]">
            <span>Cố vấn dịch vụ</span>
            <Icon className="h-4 w-4" name="chevron-right" />
            <span className="text-[#00ffa3]">Tiếp nhận xe</span>
          </nav>
          <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">Tiếp nhận xe mới</h1>
        </div>

        <GlassPanel className="transition focus-within:shadow-[0_0_26px_rgba(0,255,163,0.08)]">
          <div className="flex flex-col gap-6 md:flex-row md:items-end">
            <label className="flex-1 space-y-3">
              <span className="block text-sm font-black uppercase tracking-wider text-[var(--color-on-surface)]">
                Biển số xe
              </span>
              <span className="relative block">
                <Icon
                  className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-[var(--color-outline)]"
                  name="car"
                />
                <input
                  className="h-16 w-full rounded-full border border-transparent bg-[var(--color-surface-container-highest)] py-4 pl-14 pr-6 text-xl font-black uppercase tracking-widest text-white placeholder:text-[#87909d] focus:border-[#00ffa3] focus:outline-none"
                  placeholder="VD: 30A-123.45"
                  type="text"
                />
              </span>
            </label>
            <button
              className={
                plateStatus === 'found'
                  ? 'inline-flex h-16 items-center justify-center gap-3 rounded-full border border-[#00ffa3]/30 bg-[#00ffa3]/15 px-8 text-base font-black text-[#00ffa3] transition'
                  : 'inline-flex h-16 items-center justify-center gap-3 rounded-full bg-[#00ffa3] px-8 text-base font-black text-[#003920] shadow-[0_0_24px_rgba(0,255,163,0.28)] transition hover:bg-[#52ffac] active:scale-[0.98]'
              }
              disabled={plateStatus === 'checking'}
              onClick={checkPlate}
              type="button"
            >
              <Icon
                className={plateStatus === 'checking' ? 'animate-spin' : ''}
                name={plateStatus === 'found' ? 'check' : 'search'}
              />
              {searchLabel}
            </button>
          </div>
        </GlassPanel>

        <div className="grid gap-8 lg:grid-cols-2">
          <GlassPanel className="space-y-6">
            <PanelTitle icon="person" title="Thông tin khách hàng" />
            <div className="space-y-4">
              <Field label="Họ và tên khách hàng" placeholder="Nguyễn Văn A" />
              <Field label="Số điện thoại" placeholder="090x xxx xxx" type="tel" />
              <Field label="Email (tùy chọn)" placeholder="khachhang@example.com" type="email" />
              <TextAreaField label="Địa chỉ" placeholder="Nhập địa chỉ cư trú" rows={2} />
            </div>
          </GlassPanel>

          <GlassPanel className="space-y-6">
            <PanelTitle icon="car" title="Thông tin phương tiện" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Hãng & dòng xe" placeholder="Toyota Camry" />
              </div>
              <SelectField label="Năm sản xuất" />
              <Field label="Số KM hiện tại" placeholder="45,000" type="number" />
              <Field label="Số khung (VIN)" placeholder="VIN123456789" />
              <Field label="Số máy" placeholder="ENG-998877" />
            </div>
          </GlassPanel>
        </div>

        <GlassPanel className="space-y-6">
          <PanelTitle icon="clipboard" title="Yêu cầu & Hẹn trả" />
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_304px]">
            <TextAreaField
              label="Yêu cầu sửa chữa/tình trạng xe"
              placeholder="Mô tả các vấn đề cần kiểm tra hoặc yêu cầu của khách hàng..."
              rows={4}
            />
            <div className="space-y-6">
              <label className="space-y-2">
                <span className="block text-sm font-bold text-[var(--color-on-surface)]">Hẹn trả xe</span>
                <input className={receptionInputClass} type="datetime-local" />
              </label>
              <div className="flex gap-4 rounded-[2rem] border border-[#00ffa3]/20 bg-[#00ffa3]/10 p-5">
                <Icon className="mt-0.5 text-[#00ffa3]" name="info" />
                <p className="text-sm leading-6 text-[var(--color-on-surface)]">
                  Thông tin này sẽ được gửi thông báo tự động đến khách hàng sau khi tạo hồ sơ.
                </p>
              </div>
            </div>
          </div>
        </GlassPanel>

        <div className="flex flex-col-reverse items-stretch justify-end gap-4 pb-10 sm:flex-row sm:items-center">
          <Button className="px-8" type="button" variant="secondary">
            Hủy bỏ
          </Button>
          <Button className="px-10" type="button">
            <Icon name="check" />
            Tạo hồ sơ & Bắt đầu sửa chữa
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
