import { ClockCircleOutlined, DashboardOutlined, PieChartOutlined, SettingOutlined, TeamOutlined, ToolOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../shared/auth'
import { BackOfficeShell, adminPalette } from '../../../widgets/backoffice-shell'

export { adminPalette }

function activeMenuKey(pathname: string) {
  if (pathname.startsWith('/admin/users')) return 'users'
  if (pathname.startsWith('/admin/parts')) return 'parts'
  if (pathname.startsWith('/admin/config')) return 'config'
  return 'dashboard'
}

export function AdminShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  const location = useLocation()
  const { logout, user } = useAuth()
  const profileName = user?.fullName || 'Admin'
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'A'

  return (
    <BackOfficeShell
      palette={adminPalette}
      background={`radial-gradient(circle at top left, rgba(245, 19, 4, 0.12), transparent 22%), radial-gradient(circle at top right, rgba(255, 179, 71, 0.16), transparent 22%), ${adminPalette.canvas}`}
      sidebarGradient={`linear-gradient(180deg, ${adminPalette.ink} 0%, ${adminPalette.redDeep} 100%)`}
      sidebarTitle="Admin"
      sidebarSubtitle="Garage control room"
      headerEyebrow={eyebrow}
      headerTitle={title}
      notificationIcon={<DashboardOutlined />}
      profileInitial={profileInitial}
      profileName={profileName}
      profileRole="System administrator"
      profileAccent={adminPalette.red}
      onLogout={logout}
      selectedMenuKeys={[activeMenuKey(location.pathname)]}
      menuItems={[
        { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/admin/dashboard">Overview</Link> },
        { key: 'repair-orders', icon: <ClockCircleOutlined />, label: 'Repair orders' },
        { key: 'users', icon: <TeamOutlined />, label: <Link to="/admin/users">Users</Link> },
        { key: 'parts', icon: <ToolOutlined />, label: <Link to="/admin/parts">Parts catalog</Link> },
        { key: 'reports', icon: <PieChartOutlined />, label: 'Reports' },
        { key: 'config', icon: <SettingOutlined />, label: <Link to="/admin/config">System config</Link> },
      ]}
    >
      {children}
    </BackOfficeShell>
  )
}
