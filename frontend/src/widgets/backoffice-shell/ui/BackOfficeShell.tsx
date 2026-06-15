import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Avatar, Badge, Button, Menu, Space, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useState, type ReactNode } from 'react'
import type { BackOfficePalette } from '../model/palettes'

const { Title } = Typography
const KAPA_LOGO_URL = '/kapa-auth/wp-content/uploads/2023/01/Kapa_Logo-1.svg'

export function BackOfficeShell({
  palette,
  background,
  sidebarGradient,
  sidebarTitle,
  sidebarSubtitle,
  headerEyebrow,
  headerTitle,
  notificationIcon,
  profileInitial,
  profileName,
  profileRole,
  profileAccent,
  onLogout,
  menuItems,
  selectedMenuKeys,
  children,
}: {
  palette: BackOfficePalette
  background: string
  sidebarGradient: string
  sidebarTitle: string
  sidebarSubtitle: string
  headerEyebrow: string
  headerTitle: string
  notificationIcon: ReactNode
  profileInitial: string
  profileName: string
  profileRole: string
  profileAccent: string
  onLogout?: () => void
  menuItems: MenuProps['items']
  selectedMenuKeys: string[]
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const sidebarWidth = collapsed ? 76 : 288

  return (
    <div
      className="min-h-screen"
      style={{
        background,
        color: palette.ink,
        fontFamily: 'var(--font-body)',
      }}
    >
      <div className="flex min-h-screen">
        <aside
          className="shrink-0 border-r transition-[width] duration-300"
          style={{
            width: sidebarWidth,
            background: sidebarGradient,
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '18px 0 60px rgba(15, 14, 14, 0.14)',
          }}
        >
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 border-b border-white/10 px-4 py-5 text-center">
              <img src={KAPA_LOGO_URL} alt="Kapa" className={collapsed ? 'h-10 w-auto max-w-[56px]' : 'h-20 w-auto max-w-[150px]'} />
              {!collapsed && (
                <div className="flex flex-col items-center">
                  <div className="font-['Oswald'] text-[24px] uppercase leading-none text-white">{sidebarTitle}</div>
                  <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80">{sidebarSubtitle}</div>
                </div>
              )}
            </div>

            <div className="px-3 py-5">
              <Menu
                theme="dark"
                mode="inline"
                selectedKeys={selectedMenuKeys}
                className="!border-0 !bg-transparent"
                style={{ fontFamily: 'var(--font-body)' }}
                items={menuItems}
              />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header
            className="sticky top-0 z-30 flex h-20 items-center justify-between border-b px-5 md:px-6 backdrop-blur-xl"
            style={{
              background: 'rgba(255, 253, 250, 0.84)',
              borderColor: palette.border,
            }}
          >
            <div>
              <div className="flex items-center gap-3">
                <Button
                  type="text"
                  icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={() => setCollapsed((value) => !value)}
                  className="!inline-flex !h-11 !w-11 !items-center !justify-center !rounded-full"
                  style={{ color: palette.ink }}
                />
                <span className="text-[12px] font-semibold uppercase tracking-[0.26em]" style={{ color: palette.textMuted }}>
                  {headerEyebrow}
                </span>
              </div>
              <Title level={2} className="!mb-0 !mt-1 !font-['Oswald'] !text-[28px] md:!text-[34px] !leading-none" style={{ color: palette.ink }}>
                {headerTitle}
              </Title>
            </div>

            <Space size="middle">
              <Badge dot offset={[-4, 8]}>
                <Button shape="circle" icon={notificationIcon} />
              </Badge>
              <Space size="middle" className="rounded-full border px-3 py-2" style={{ borderColor: palette.border, background: palette.panel }}>
                <Avatar style={{ background: profileAccent, color: '#fff' }}>{profileInitial}</Avatar>
                <div className="leading-tight">
                  <div className="text-sm font-semibold" style={{ color: palette.ink }}>
                    {profileName}
                  </div>
                  <div className="text-xs" style={{ color: palette.textMuted }}>
                    {profileRole}
                  </div>
                </div>
              </Space>
              {onLogout && (
                <Button onClick={onLogout} className="!rounded-full !font-semibold">
                  Logout
                </Button>
              )}
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
