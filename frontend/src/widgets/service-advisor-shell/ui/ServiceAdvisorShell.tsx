import {
  CalendarOutlined,
  CarOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
  PlusCircleOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../shared/auth'
import { BackOfficeShell, advisorPalette } from '../../backoffice-shell'

export { advisorPalette }

function activeMenuKey(pathname: string) {
  if (pathname.startsWith('/advisor/bookings')) return 'bookings'
  if (pathname.startsWith('/advisor/reception')) return 'reception'
  if (pathname.startsWith('/advisor/work-orders')) return 'work-orders'
  if (pathname.startsWith('/advisor/quotation')) return 'quotation'
  if (pathname.startsWith('/advisor/additional-services')) return 'additional-services'
  if (pathname.startsWith('/advisor/quality-check')) return 'quality-check'
  if (pathname.startsWith('/advisor/repair-timeline')) return 'repair-timeline'
  return 'dashboard'
}

export function ServiceAdvisorShell({ title, eyebrow = 'Service Advisor', children }: { title: string; eyebrow?: string; children: ReactNode }) {
  const location = useLocation()
  const { logout, user } = useAuth()
  const profileName = user?.fullName || 'Service Advisor'
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'S'

  return (
    <BackOfficeShell
      palette={advisorPalette}
      background={`radial-gradient(circle at top left, rgba(245, 19, 4, 0.12), transparent 22%), radial-gradient(circle at top right, rgba(255, 179, 71, 0.16), transparent 22%), ${advisorPalette.canvas}`}
      sidebarGradient={`linear-gradient(180deg, ${advisorPalette.ink} 0%, ${advisorPalette.redDeep} 100%)`}
      sidebarTitle="Service Advisor"
      sidebarSubtitle="Workshop front desk"
      headerEyebrow={eyebrow}
      headerTitle={title}
      notificationIcon={<CalendarOutlined />}
      profileInitial={profileInitial}
      profileName={profileName}
      profileRole="Service advisor"
      profileAccent={advisorPalette.red}
      onLogout={logout}
      selectedMenuKeys={[activeMenuKey(location.pathname)]}
      menuItems={[
        { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/advisor/dashboard">Overview</Link> },
        { key: 'bookings', icon: <CalendarOutlined />, label: <Link to="/advisor/bookings">Booking requests</Link> },
        { key: 'reception', icon: <CarOutlined />, label: <Link to="/advisor/reception">Vehicle reception</Link> },
        { key: 'work-orders', icon: <ToolOutlined />, label: <Link to="/advisor/work-orders">Work orders</Link> },
        { key: 'quotation', icon: <FileTextOutlined />, label: <Link to="/advisor/quotation">Quotations</Link> },
        { key: 'additional-services', icon: <PlusCircleOutlined />, label: <Link to="/advisor/additional-services">Additional services</Link> },
        { key: 'quality-check', icon: <CheckCircleOutlined />, label: <Link to="/advisor/quality-check">Quality check</Link> },
        { key: 'repair-timeline', icon: <FieldTimeOutlined />, label: <Link to="/advisor/repair-timeline">Repair timeline</Link> },
      ]}
    >
      {children}
    </BackOfficeShell>
  )
}
