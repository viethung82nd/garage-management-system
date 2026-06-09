import { Route, Routes } from 'react-router-dom'
import { Badge, Button, Card, Icon, SectionHeader, StatCard } from './components/base'
import { activity, appointments, quickActions, stats } from './design/tokens'
import { DashboardLayout } from './layouts/DashboardLayout'

function StatusPill() {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-[var(--color-on-surface)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <span className="h-2.5 w-2.5 rounded-full bg-[#00ffa3] shadow-[0_0_12px_rgba(0,255,163,0.8)]" />
      System Online: Live Performance Monitoring
    </div>
  )
}

function EfficiencyDial() {
  return (
    <div className="relative hidden min-h-[300px] overflow-hidden lg:block">
      <div className="absolute -right-1 top-1 h-[290px] w-[290px]">
        <div className="absolute inset-0 rounded-full border border-white/[0.08] bg-white/[0.015]" />
        <div className="absolute inset-[38px] rounded-full border border-white/[0.08]" />
        <div className="efficiency-arc efficiency-arc-outer" />
        <div className="efficiency-arc efficiency-arc-inner" />
      </div>
      <Card className="absolute right-0 top-0 flex items-center gap-5 rounded-[2rem] px-7 py-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00ffa3]/12 text-[#00ffa3]">
          <Icon name="bolt" />
        </span>
        <span>
          <span className="block text-xs font-bold text-[var(--color-on-surface-variant)]">Efficiency</span>
          <span className="text-xl font-black text-white">98.2%</span>
        </span>
      </Card>
    </div>
  )
}

function DashboardHero() {
  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-7">
        <StatusPill />
        <div className="max-w-2xl space-y-6">
          <h1 className="max-w-xl text-3xl font-black leading-tight text-white sm:text-5xl">
            Mastering precision, <span className="text-[#00ffa3]">one repair at a time.</span>
          </h1>
          <p className="text-base leading-7 text-[var(--color-on-surface-variant)] sm:text-lg">
            The definitive operating system for high-performance garages. Streamline workflows,
            track every bolt, and deliver mechanical excellence.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button type="button">
            <Icon name="map" />
            Open Workshop Map
          </Button>
          <Button type="button" variant="secondary">
            View Logs
          </Button>
        </div>
      </div>
      <EfficiencyDial />
    </section>
  )
}

function StatsGrid() {
  return (
    <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => (
        <StatCard
          eyebrow={item.eyebrow}
          icon={item.icon}
          key={item.label}
          label={item.label}
          tone={item.tone}
          value={item.value}
        />
      ))}
    </section>
  )
}

function AppointmentTable() {
  return (
    <Card className="overflow-hidden">
      <SectionHeader
        action={
          <button className="text-sm font-bold text-[var(--color-on-surface-variant)] transition hover:text-[#00ffa3]" type="button">
            View Full Schedule -&gt;
          </button>
        }
        title="Upcoming Appointments"
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-white/[0.04] text-xs font-black uppercase text-[var(--color-on-surface-variant)]">
            <tr>
              <th className="px-6 py-4">Vehicle</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Service Type</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {appointments.map((appointment) => (
              <tr className="align-middle text-sm" key={appointment.vehicle}>
                <td className="px-6 py-5">
                  <p className="font-black text-white">{appointment.vehicle}</p>
                  <p className="mt-1 text-xs font-medium text-[var(--color-on-surface-variant)]">{appointment.details}</p>
                </td>
                <td className="px-6 py-5 font-bold text-[var(--color-on-surface)]">{appointment.customer}</td>
                <td className="px-6 py-5">
                  <Badge tone={appointment.service === 'Battery Service' ? 'emerald' : 'blue'}>{appointment.service}</Badge>
                </td>
                <td className="px-6 py-5">
                  <span className="inline-flex items-center gap-2 font-bold text-[var(--color-on-surface)]">
                    <span
                      className={
                        appointment.status === 'Checking In'
                          ? 'h-2 w-2 rounded-full bg-[#00ffa3]'
                          : 'h-2 w-2 rounded-full bg-[var(--color-outline)]'
                      }
                    />
                    {appointment.status}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <button className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white transition hover:border-[#00ffa3]/60 hover:text-[#00ffa3]" type="button">
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function QuickActions() {
  return (
    <Card className="p-6">
      <h2 className="text-base font-black text-white">Quick Actions</h2>
      <div className="mt-6 space-y-3">
        {quickActions.map((action) => (
          <button
            className="flex min-h-14 w-full items-center gap-4 rounded-full bg-white/[0.07] px-5 text-left text-sm font-black text-white transition hover:bg-[#00ffa3] hover:text-[#003920]"
            key={action.label}
            type="button"
          >
            <Icon name={action.icon} />
            {action.label}
          </button>
        ))}
      </div>
    </Card>
  )
}

function RecentActivity() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-black text-white">Recent Activity</h2>
        <span className="text-[10px] font-black uppercase text-[#00ffa3]">Live</span>
      </div>
      <div className="mt-6 space-y-5">
        {activity.map((item) => (
          <div className="relative flex gap-4" key={item.label}>
            <span className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-[#00ffa3]">
              <Icon className="h-4 w-4" name={item.icon} />
            </span>
            <div>
              <p className={item.tone === 'red' ? 'text-sm font-black text-[#ffb4ab]' : 'text-sm font-black text-white'}>
                {item.label}
              </p>
              <p className="mt-1 text-xs font-medium text-[var(--color-on-surface-variant)]">{item.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function InventoryPanel() {
  return (
    <Card className="relative isolate overflow-hidden p-8">
      <div className="absolute inset-y-0 right-0 -z-10 w-full bg-[radial-gradient(circle_at_88%_50%,rgba(0,255,163,0.18),transparent_24%),linear-gradient(90deg,rgba(16,20,21,0.98),rgba(16,20,21,0.74),rgba(16,20,21,0.95)),url('/src/assets/hero.png')] bg-[length:auto,auto,360px] bg-[position:center,center,right_28px_center] bg-no-repeat opacity-80" />
      <div className="max-w-xl">
        <h2 className="text-lg font-black text-white">Precision Inventory Tracking</h2>
        <p className="mt-5 text-base leading-7 text-[var(--color-on-surface-variant)]">
          Never miss a beat with real-time stock monitoring. AI-driven signals predict part
          requirements before a bay opens.
        </p>
        <div className="mt-8 grid max-w-md grid-cols-2 gap-4">
          <div className="rounded-full bg-white/[0.12] px-6 py-5">
            <p className="text-2xl font-black text-[#00ffa3]">2,410</p>
            <p className="text-xs font-medium text-[var(--color-on-surface-variant)]">Parts in Stock</p>
          </div>
          <div className="rounded-full bg-white/[0.12] px-6 py-5">
            <p className="text-2xl font-black text-[#d9e2ff]">14</p>
            <p className="text-xs font-medium text-[var(--color-on-surface-variant)]">Pending Orders</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-10">
        <DashboardHero />
        <StatsGrid />
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
          <AppointmentTable />
          <div className="space-y-6">
            <QuickActions />
            <RecentActivity />
          </div>
        </div>
        <InventoryPanel />
      </div>
    </DashboardLayout>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <DashboardLayout>
      <Card className="p-8">
        <p className="text-xs font-black uppercase text-[#00ffa3]">Module</p>
        <h1 className="mt-3 text-3xl font-black text-white">{title}</h1>
        <p className="mt-4 max-w-2xl text-[var(--color-on-surface-variant)]">
          This route is wired into the shared shell and ready for feature screens.
        </p>
      </Card>
    </DashboardLayout>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardPage />} path="/" />
      <Route element={<PlaceholderPage title="Work Orders" />} path="/work-orders" />
      <Route element={<PlaceholderPage title="Vehicles" />} path="/vehicles" />
      <Route element={<PlaceholderPage title="Customers" />} path="/customers" />
      <Route element={<PlaceholderPage title="Parts" />} path="/parts" />
      <Route element={<PlaceholderPage title="Team" />} path="/team" />
      <Route element={<PlaceholderPage title="Inventory" />} path="/inventory" />
      <Route element={<PlaceholderPage title="Schedule" />} path="/schedule" />
      <Route element={<PlaceholderPage title="Reports" />} path="/reports" />
      <Route element={<PlaceholderPage title="Page Not Found" />} path="*" />
    </Routes>
  )
}
