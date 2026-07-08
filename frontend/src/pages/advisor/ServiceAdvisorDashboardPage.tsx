import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdvisorDashboard, fetchWorkshopBookings, fetchWorkshopRepairOrders, personName, unwrapArray, vehicleName, vehiclePlate, type ApiBooking, type ApiRepairOrder } from '../../shared/api/workshop'
import { useAuth } from '../../shared/auth'
import { Icon, type IconName } from '../../shared/ui/base'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

const defaultStats = [
  { icon: 'calendar', label: 'Booking chá» duyá»‡t', note: '+4 yÃªu cáº§u má»›i', value: '00' },
  { icon: 'clipboard', label: 'Xe cáº§n tiáº¿p nháº­n', note: 'Trong hÃ´m nay', value: '00' },
  { icon: 'wrench', label: 'Lá»‡nh Ä‘ang má»Ÿ', note: 'ÄÃ£ phÃ¢n cÃ´ng KTV', value: '00' },
  { icon: 'users', label: 'KhÃ¡ch Ä‘ang chá»', note: 'Táº¡i quáº§y dá»‹ch vá»¥', value: '00' },
] satisfies Array<{ icon: IconName; label: string; note: string; value: string }>

type QueueItem = { customer: string; meta: string; status: string; to: string }

type DashboardStat = (typeof defaultStats)[number]

function mapBookingQueue(booking: ApiBooking): QueueItem {
  const customer = booking.customerId || booking.customer
  const vehicle = booking.vehicleId || booking.vehicle

  return {
    customer: personName(customer, 'Khách hàng'),
    meta: `${vehicleName(vehicle)} - ${vehiclePlate(vehicle)}`,
    status: booking.status === 'pending' ? 'Chờ xác nhận' : 'Cần tiếp nhận',
    to: booking.status === 'pending' ? '/advisor/bookings' : '/advisor/reception',
  }
}

function mapOrderQueue(order: ApiRepairOrder): QueueItem {
  const vehicle = order.vehicleId || order.vehicle

  return {
    customer: personName(order.customer || vehicle?.customerId || vehicle?.customer, 'Khách hàng'),
    meta: `${vehicleName(vehicle)} - ${vehiclePlate(vehicle)}`,
    status: order.status === 'inProgress' ? 'Đang sửa' : 'Đã phân công',
    to: '/advisor/repair-timeline',
  }
}

function StatCard({ stat }: { stat: DashboardStat }) {
  return (
    <section className="border border-[#efeded] bg-white p-6 shadow-[0_18px_40px_rgba(27,28,28,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.14em] text-[#6a6767]">{stat.label}</p>
          <p className="mt-3 text-4xl font-black text-[#171717]">{stat.value}</p>
          <p className="mt-2 text-sm font-semibold text-[#ba0013]">{stat.note}</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center bg-[#fff1f1] text-[#ba0013]">
          <Icon name={stat.icon} />
        </span>
      </div>
    </section>
  )
}

export function ServiceAdvisorDashboardPage() {
  const { token } = useAuth()
  const [stats, setStats] = useState<DashboardStat[]>(defaultStats)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [apiMessage, setApiMessage] = useState<string>()

  useEffect(() => {
    if (!token) return
    const authToken = token

    let cancelled = false
    async function loadDashboard() {
      try {
        const [summary, bookingResponse, repairResponse] = await Promise.allSettled([fetchAdvisorDashboard(authToken), fetchWorkshopBookings(authToken), fetchWorkshopRepairOrders(authToken)])
        const bookings = bookingResponse.status === 'fulfilled' ? unwrapArray<ApiBooking>(bookingResponse.value, ['bookings']) : []
        const orders = repairResponse.status === 'fulfilled' ? unwrapArray<ApiRepairOrder>(repairResponse.value, ['repairOrders', 'orders']) : []
        if (cancelled) return
        if (summary.status === 'fulfilled') {
          setStats([
            { ...defaultStats[0], value: String(summary.value.pendingBookings ?? bookings.filter((item) => item.status === 'pending').length).padStart(2, '0') },
            { ...defaultStats[1], value: String(summary.value.todayReceptions ?? bookings.filter((item) => item.status === 'confirmed').length).padStart(2, '0') },
            { ...defaultStats[2], value: String(summary.value.openRepairOrders ?? orders.filter((item) => item.status !== 'completed').length).padStart(2, '0') },
            { ...defaultStats[3], value: String(summary.value.waitingCustomers ?? 0).padStart(2, '0') },
          ])
        }
        const nextQueue = summary.status === 'fulfilled' && summary.value.queue?.length
          ? summary.value.queue.map((item) => ({ customer: item.customer || 'Khách hàng', meta: item.meta || 'Chưa cập nhật', status: item.status || 'Chờ xử lý', to: item.to || '/advisor/bookings' }))
          : [...bookings.slice(0, 2).map(mapBookingQueue), ...orders.slice(0, 2).map(mapOrderQueue)]
        setQueue(nextQueue)
      } catch (err) {
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Không tải được dashboard từ API')
      }
    }
    void loadDashboard()
    return () => { cancelled = true }
  }, [token])

  return (
    <ServiceAdvisorShell active="dashboard" title="Tá»•ng quan Service Advisor">
      <div className="space-y-7">
        <section className="relative overflow-hidden border-l-8 border-[#ba0013] bg-white p-8 shadow-[0_10px_30px_rgba(27,28,28,0.05)]">
          <div className="absolute right-8 top-8 hidden text-[#ba0013]/10 lg:block">
            <Icon className="h-32 w-32" name="clipboard" />
          </div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#ba0013]">Service Desk</p>
          <h2 className="mt-3 text-4xl font-black leading-tight text-[#171717] md:text-5xl">Quáº£n lÃ½ Ä‘áº·t lá»‹ch, tiáº¿p nháº­n vÃ  phÃ¢n cÃ´ng</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#6a6767]">
            ÄÃ¢y lÃ  mÃ n hÃ¬nh riÃªng cho Service Advisor, khÃ´ng trá»™n cÃ¡c chá»©c nÄƒng quáº£n trá»‹ há»‡ thá»‘ng cá»§a Admin.
          </p>
        </section>

        {apiMessage ? <div className="border border-[#e7bdb8] bg-[#fffafa] px-5 py-4 text-sm font-bold text-[#ba0013]">{apiMessage}</div> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </section>

        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="border border-[#efeded] bg-white">
            <div className="flex items-center justify-between border-b border-[#efeded] px-6 py-5">
              <h3 className="text-lg font-black text-[#171717]">HÃ ng Ä‘á»£i cáº§n xá»­ lÃ½</h3>
              <Link className="text-sm font-black text-[#ba0013] hover:underline" to="/advisor/bookings">
                Xem booking
              </Link>
            </div>
            <div className="divide-y divide-[#efeded]">
              {queue.length ? queue.map((item) => (
                <Link className="grid gap-3 p-5 transition hover:bg-[#fffafa] sm:grid-cols-[1fr_auto] sm:items-center" key={item.customer + item.meta} to={item.to}>
                  <span>
                    <span className="block font-black text-[#171717]">{item.customer}</span>
                    <span className="mt-1 block text-sm font-semibold text-[#6a6767]">{item.meta}</span>
                  </span>
                  <span className="bg-[#fff1f1] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#ba0013]">{item.status}</span>
                </Link>
              )) : <div className="p-6 text-sm font-bold text-[#6a6767]">Chưa có công việc cần xử lý từ API.</div>}
            </div>
          </section>

          <section className="bg-[#1b1c1c] p-6 text-white">
            <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-[#ffb4ab]">Thao tÃ¡c nhanh</p>
            <div className="mt-5 space-y-3">
              <Link className="flex min-h-12 items-center justify-between bg-white px-4 text-sm font-black text-[#1b1c1c]" to="/advisor/reception">
                Tiáº¿p nháº­n xe <Icon name="chevron-right" />
              </Link>
              <Link className="flex min-h-12 items-center justify-between bg-white/10 px-4 text-sm font-black text-white" to="/advisor/work-orders">
                Táº¡o lá»‡nh sá»­a chá»¯a <Icon name="chevron-right" />
              </Link>
              <Link className="flex min-h-12 items-center justify-between bg-white/10 px-4 text-sm font-black text-white" to="/advisor/bookings">
                Duyá»‡t lá»‹ch Ä‘áº·t <Icon name="chevron-right" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </ServiceAdvisorShell>
  )
}
