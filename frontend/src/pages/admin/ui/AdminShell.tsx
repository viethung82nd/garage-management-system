import { AppstoreOutlined, DashboardOutlined, PieChartOutlined, SettingOutlined, ShoppingCartOutlined, TeamOutlined, ToolOutlined } from '@ant-design/icons'
import { ConfigProvider } from 'antd'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../shared/auth'
import { BackOfficeShell, adminPalette } from '../../../widgets/backoffice-shell'

export { adminPalette }

function activeMenuKey(pathname: string) {
  if (pathname.startsWith('/admin/users')) return 'users'
  if (pathname.startsWith('/admin/services')) return 'services'
  if (pathname.startsWith('/admin/purchasing')) return 'purchasing'
  if (pathname.startsWith('/admin/parts')) return 'parts'
  if (pathname.startsWith('/admin/reports')) return 'reports'
  if (pathname.startsWith('/admin/config')) return 'config'
  if (pathname.startsWith('/admin/dashboard')) return 'dashboard'
  return ''
}

export function AdminShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  const location = useLocation()
  const { logout, user } = useAuth()
  const profileName = user?.fullName || 'Admin'
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'A'

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: adminPalette.red,
          colorLink: adminPalette.red,
          colorLinkHover: adminPalette.redDeep,
          borderRadius: 10,
        },
      }}
    >
      <BackOfficeShell
        palette={adminPalette}
        background={adminPalette.canvas}
        sidebarGradient={`linear-gradient(180deg, #0f172a 0%, #1e293b 100%)`}
        sidebarTitle="Admin"
        sidebarSubtitle="Garage control room"
        headerEyebrow={eyebrow}
        headerTitle={title}
        notificationIcon={<DashboardOutlined />}
        profileInitial={profileInitial}
        profileName={profileName}
        profileRole="System administrator"
        profileAccent={adminPalette.red}
        profileHref="/admin/profile"
        onLogout={logout}
        selectedMenuKeys={[activeMenuKey(location.pathname)]}
        menuItems={[
          { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/admin/dashboard">Overview</Link> },
          { key: 'services', icon: <AppstoreOutlined />, label: <Link to="/admin/services">Service catalog</Link> },
          { key: 'users', icon: <TeamOutlined />, label: <Link to="/admin/users">Users</Link> },
          { key: 'parts', icon: <ToolOutlined />, label: <Link to="/admin/parts">Parts catalog</Link> },
          { key: 'purchasing', icon: <ShoppingCartOutlined />, label: <Link to="/admin/purchasing">Purchasing</Link> },
          { key: 'reports', icon: <PieChartOutlined />, label: <Link to="/admin/reports">Reports</Link> },
          { key: 'config', icon: <SettingOutlined />, label: <Link to="/admin/config">System config</Link> },
        ]}
      >
        {children}
      </BackOfficeShell>
    </ConfigProvider>
  )
}
