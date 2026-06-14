import { Card } from '../shared/ui/base'
import { DashboardLayout } from '../widgets/backoffice-shell/ui/DashboardLayout'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <DashboardLayout>
      <Card className="min-h-[calc(100vh-8rem)] w-full p-8">
        <p className="text-xs font-black uppercase text-[#00ffa3]">Module</p>
        <h1 className="mt-3 text-3xl font-black text-white">{title}</h1>
        <p className="mt-4 max-w-2xl text-[var(--color-on-surface-variant)]">
          Màn hình này đã kết nối vào khung giao diện chung và sẵn sàng để phát triển tiếp.
        </p>
      </Card>
    </DashboardLayout>
  )
}
