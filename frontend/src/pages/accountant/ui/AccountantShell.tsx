import { AuditOutlined, CheckCircleOutlined, FileTextOutlined, ReconciliationOutlined, WalletOutlined } from '@ant-design/icons'
import { ConfigProvider } from 'antd'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../shared/auth'
import { BackOfficeShell, accountantPalette } from '../../../widgets/backoffice-shell'

export { accountantPalette }

function activeMenuKey(pathname: string) {
  if (pathname.startsWith('/accountant/invoices/confirm')) return 'confirm'
  if (pathname.startsWith('/accountant/invoices')) return 'invoices'
  if (pathname.startsWith('/accountant/payments')) return 'payments'
  if (pathname.startsWith('/accountant/audit')) return 'audit'
  return ''
}

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
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: accountantPalette.red,
          colorLink: accountantPalette.red,
          colorLinkHover: accountantPalette.redDeep,
          borderRadius: 10,
        },
      }}
    >
      <BackOfficeShell
        palette={accountantPalette}
        background={accountantPalette.canvas}
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
        profileHref="/accountant/profile"
        onLogout={logout}
        selectedMenuKeys={[activeMenuKey(location.pathname)]}
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
            icon: <WalletOutlined />,
            label: <Link to="/accountant/payments">Payments</Link>,
          },
          {
            key: 'audit',
            icon: <AuditOutlined />,
            label: <Link to="/accountant/audit">Audit trail</Link>,
          },
        ]}
      >
        {children}
      </BackOfficeShell>
    </ConfigProvider>
  )
}
