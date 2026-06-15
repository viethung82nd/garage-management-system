import {
  AuditOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  ReconciliationOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../shared/auth'
import { BackOfficeShell, accountantPalette } from '../../../widgets/backoffice-shell'

export { accountantPalette }

export function AccountantShell({
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow: string
  children: ReactNode
}) {
  const location = useLocation()
  const { logout, user } = useAuth()
  const profileName = user?.fullName || 'Accountant'
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'A'

  return (
    <BackOfficeShell
      palette={accountantPalette}
      background={`radial-gradient(circle at top left, rgba(25, 123, 116, 0.1), transparent 22%), radial-gradient(circle at top right, rgba(245, 19, 4, 0.1), transparent 22%), ${accountantPalette.canvas}`}
      sidebarGradient={`linear-gradient(180deg, ${accountantPalette.ink} 0%, ${accountantPalette.navy} 100%)`}
      sidebarTitle="Accountant"
      sidebarSubtitle="Invoice control room"
      headerEyebrow={eyebrow}
      headerTitle={title}
      notificationIcon={<ReconciliationOutlined />}
      profileInitial={profileInitial}
      profileName={profileName}
      profileRole="Billing & settlement"
      profileAccent={accountantPalette.teal}
      onLogout={logout}
      selectedMenuKeys={[location.pathname.includes('/confirm') ? 'confirm' : 'invoices']}
      menuItems={[
        {
          key: 'invoices',
          icon: <FileTextOutlined />,
          label: <Link to="/accountant/invoices">Invoice management</Link>,
        },
        {
          key: 'confirm',
          icon: <CheckCircleOutlined />,
          label: <Link to="/accountant/invoices/confirm">Confirm invoice</Link>,
        },
        {
          key: 'payments',
          icon: <CreditCardOutlined />,
          label: 'Payments',
        },
        {
          key: 'audit',
          icon: <AuditOutlined />,
          label: 'Audit trail',
        },
      ]}
    >
      {children}
    </BackOfficeShell>
  )
}
