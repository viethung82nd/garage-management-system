import { ToolOutlined, FileTextOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../shared/auth'
import { BackOfficeShell, technicianPalette } from '../../backoffice-shell'

export { technicianPalette }

function activeMenuKey(pathname: string) {
  if (pathname.startsWith('/technician/repair-notes')) return 'repair-notes'
  return 'work-orders'
}

export function TechnicianShell({ title, eyebrow = 'Technician', children }: { title: string; eyebrow?: string; children: ReactNode }) {
  const location = useLocation()
  const { logout, user } = useAuth()
  const profileName = user?.fullName || 'Technician'
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'T'

  return (
    <BackOfficeShell
      palette={technicianPalette}
      background={`radial-gradient(circle at top left, rgba(245, 19, 4, 0.12), transparent 22%), radial-gradient(circle at top right, rgba(255, 179, 71, 0.16), transparent 22%), ${technicianPalette.canvas}`}
      sidebarGradient={`linear-gradient(180deg, ${technicianPalette.ink} 0%, ${technicianPalette.redDeep} 100%)`}
      sidebarTitle="Technician"
      sidebarSubtitle="Workshop floor"
      headerEyebrow={eyebrow}
      headerTitle={title}
      notificationIcon={<ToolOutlined />}
      profileInitial={profileInitial}
      profileName={profileName}
      profileRole="Technician"
      profileAccent={technicianPalette.red}
      onLogout={logout}
      selectedMenuKeys={[activeMenuKey(location.pathname)]}
      menuItems={[
        { key: 'work-orders', icon: <ToolOutlined />, label: <Link to="/technician/work-orders">Work orders</Link> },
        { key: 'repair-notes', icon: <FileTextOutlined />, label: <Link to="/technician/repair-notes">Repair progress</Link> },
      ]}
    >
      {children}
    </BackOfficeShell>
  )
}
