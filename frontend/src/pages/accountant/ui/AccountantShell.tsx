import {
  AuditOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReconciliationOutlined,
} from '@ant-design/icons'
import { Avatar, Badge, Button, Menu, Space, Typography } from 'antd'
import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

const { Title } = Typography

const KAPA_LOGO_URL = '/kapa-auth/wp-content/uploads/2023/01/Kapa_Logo-1.svg'

export const accountantPalette = {
  ink: '#0f0e0e',
  inkSoft: '#2a2727',
  textMuted: '#6b6262',
  canvas: '#f7f2ec',
  panel: '#fffdfa',
  panelAlt: '#f4eee8',
  border: 'rgba(15, 14, 14, 0.08)',
  red: '#f51304',
  redDeep: '#cf1a10',
  amber: '#ffb347',
  teal: '#197b74',
  navy: '#1f365c',
  green: '#2f8f63',
  violet: '#8a3ffc',
  shadow: '0 24px 70px rgba(15, 14, 14, 0.08)',
} as const

export function AccountantShell({
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow: string
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const sidebarWidth = collapsed ? 76 : 288

  return (
    <div
      className="min-h-screen"
      style={{
        background: `radial-gradient(circle at top left, rgba(25, 123, 116, 0.1), transparent 22%), radial-gradient(circle at top right, rgba(245, 19, 4, 0.1), transparent 22%), ${accountantPalette.canvas}`,
        color: accountantPalette.ink,
        fontFamily: 'var(--font-body)',
      }}
    >
      <div className="flex min-h-screen">
        <aside
          className="shrink-0 border-r transition-[width] duration-300"
          style={{
            width: sidebarWidth,
            background: `linear-gradient(180deg, ${accountantPalette.ink} 0%, ${accountantPalette.navy} 100%)`,
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '18px 0 60px rgba(15, 14, 14, 0.14)',
          }}
        >
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 border-b border-white/10 px-4 py-5 text-center">
              <img src={KAPA_LOGO_URL} alt="Kapa" className={collapsed ? 'h-10 w-auto max-w-[56px]' : 'h-20 w-auto max-w-[150px]'} />
              {!collapsed && (
                <div className="flex flex-col items-center">
                  <div className="font-['Oswald'] text-[24px] uppercase leading-none text-white">Accountant</div>
                  <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80">Invoice control room</div>
                </div>
              )}
            </div>

            <div className="px-3 py-5">
              <Menu
                theme="dark"
                mode="inline"
                selectedKeys={[location.pathname.includes('/confirm') ? 'confirm' : 'invoices']}
                className="!border-0 !bg-transparent"
                style={{ fontFamily: 'var(--font-body)' }}
                items={[
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
              />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header
            className="sticky top-0 z-30 flex h-20 items-center justify-between border-b px-5 md:px-6 backdrop-blur-xl"
            style={{
              background: 'rgba(255, 253, 250, 0.84)',
              borderColor: accountantPalette.border,
            }}
          >
            <div>
              <div className="flex items-center gap-3">
                <Button
                  type="text"
                  icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={() => setCollapsed((value) => !value)}
                  className="!inline-flex !h-11 !w-11 !items-center !justify-center !rounded-full"
                  style={{ color: accountantPalette.ink }}
                />
                <span className="text-[12px] font-semibold uppercase tracking-[0.26em]" style={{ color: accountantPalette.textMuted }}>
                  {eyebrow}
                </span>
              </div>
              <Title level={2} className="!mb-0 !mt-1 !font-['Oswald'] !text-[28px] md:!text-[34px] !leading-none" style={{ color: accountantPalette.ink }}>
                {title}
              </Title>
            </div>

            <Space size="middle">
              <Badge dot offset={[-4, 8]}>
                <Button shape="circle" icon={<ReconciliationOutlined />} />
              </Badge>
              <Space size="middle" className="rounded-full border px-3 py-2" style={{ borderColor: accountantPalette.border, background: accountantPalette.panel }}>
                <Avatar style={{ background: accountantPalette.teal, color: '#fff' }}>K</Avatar>
                <div className="leading-tight">
                  <div className="text-sm font-semibold" style={{ color: accountantPalette.ink }}>
                    Ke toan
                  </div>
                  <div className="text-xs" style={{ color: accountantPalette.textMuted }}>
                    Billing & settlement
                  </div>
                </div>
              </Space>
            </Space>
          </header>

          <section className="px-4 py-5 md:px-6">
            <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5">{children}</div>
          </section>
        </main>
      </div>
    </div>
  )
}
