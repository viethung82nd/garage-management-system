import { CloseOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Avatar, Badge, Button, Empty, List, Menu, Popover, Space, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  NEW_NOTIFICATION_EVENT,
  clearReadNotifications,
  deleteNotification,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  notificationTarget,
  type ApiNotification,
} from '../../../shared/api/notifications'
import { useAuth } from '../../../shared/auth'
import type { BackOfficePalette } from '../model/palettes'

const NOTIFICATION_POLL_INTERVAL_MS = 12000

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
  profileHref,
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
  /** When set, the header profile chip links here (e.g. "/admin/profile"). */
  profileHref?: string
  children: ReactNode
}) {
  const resolvedBodyFont = 'var(--font-body)'
  const resolvedDisplayFont = "'Oswald', var(--font-body)"
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  // Below the `lg` breakpoint the sidebar is an off-canvas drawer instead of
  // a pushed column — `collapsed` (icon-only rail) only makes sense once
  // there's room beside the content, so mobile gets its own open/close flag.
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentNotifications, setRecentNotifications] = useState<ApiNotification[]>([])
  const sidebarWidth = collapsed ? 76 : 288

  function toggleSidebar() {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileOpen((value) => !value)
    } else {
      setCollapsed((value) => !value)
    }
  }

  useEffect(() => {
    if (!token) return
    const authToken = token
    let cancelled = false

    async function poll() {
      try {
        const response = await fetchUnreadNotificationCount(authToken)
        if (!cancelled) setUnreadCount(response.count)
      } catch {
        // Best-effort — retried on the next interval.
      }
    }

    void poll()
    const intervalId = window.setInterval(() => {
      void poll()
    }, NOTIFICATION_POLL_INTERVAL_MS)

    // NotificationCenter's toast poll runs independently and fires this the
    // moment it sees something new, so the bell bumps immediately instead of
    // waiting for this component's own next interval tick.
    function onNewNotification() {
      void poll()
      void loadRecentNotifications()
    }
    window.addEventListener(NEW_NOTIFICATION_EVENT, onNewNotification)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener(NEW_NOTIFICATION_EVENT, onNewNotification)
    }
  }, [token])

  async function loadRecentNotifications() {
    if (!token) return
    try {
      const response = await fetchNotifications(token, '?limit=10')
      setRecentNotifications(response.notifications)
    } catch {
      // Best-effort — the dropdown just stays empty.
    }
  }

  async function handleMarkAllRead() {
    if (!token) return
    await markAllNotificationsRead(token)
    setUnreadCount(0)
    setRecentNotifications((current) => current.map((item) => ({ ...item, isRead: true })))
  }

  async function handleClearRead() {
    if (!token) return
    await clearReadNotifications(token)
    setRecentNotifications((current) => current.filter((item) => !item.isRead))
  }

  async function handleDeleteNotification(item: ApiNotification) {
    if (!token) return
    setRecentNotifications((current) => current.filter((entry) => entry._id !== item._id))
    if (!item.isRead) setUnreadCount((current) => Math.max(0, current - 1))
    try {
      await deleteNotification(token, item._id)
    } catch {
      // Best-effort — a failed delete just leaves it gone locally until the next reload.
    }
  }

  function handleNotificationClick(item: ApiNotification) {
    setNotifOpen(false)
    if (token && !item.isRead) {
      void markNotificationRead(token, item._id).catch(() => {})
      setUnreadCount((current) => Math.max(0, current - 1))
      setRecentNotifications((current) => current.map((entry) => (entry._id === item._id ? { ...entry, isRead: true } : entry)))
    }
    const target = user?.role ? notificationTarget(user.role, item) : null
    if (target) navigate(target)
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background,
        color: palette.ink,
        fontFamily: resolvedBodyFont,
      }}
    >
      <div className="flex min-h-screen">
        {mobileOpen && (
          <div
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 shrink-0 border-r transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 lg:transition-[width] ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{
            width: sidebarWidth,
            background: sidebarGradient,
            borderColor: 'rgba(255,255,255,0.06)',
            boxShadow: '4px 0 24px rgba(15, 23, 42, 0.10)',
          }}
        >
          <div className="sticky top-0 flex h-screen flex-col overflow-y-auto">
            <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 border-b border-white/10 px-4 py-5 text-center">
              <img src={KAPA_LOGO_URL} alt="Kapa" className={collapsed ? 'h-9 w-auto max-w-[52px]' : 'h-14 w-auto max-w-[120px]'} />
              {!collapsed && (
                <div className="flex flex-col items-center">
                  <div className="text-[20px] font-semibold uppercase leading-none tracking-wide text-white" style={{ fontFamily: resolvedDisplayFont }}>
                    {sidebarTitle}
                  </div>
                  <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">{sidebarSubtitle}</div>
                </div>
              )}
            </div>

            <div className="px-3 py-5">
              <Menu
                theme="dark"
                mode="inline"
                selectedKeys={selectedMenuKeys}
                className="!border-0 !bg-transparent"
                style={{ fontFamily: resolvedBodyFont }}
                items={menuItems}
                onClick={() => setMobileOpen(false)}
              />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header
            className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-3 border-b px-3 sm:px-5 md:px-6 backdrop-blur-xl"
            style={{
              background: 'rgba(255, 255, 255, 0.86)',
              borderColor: palette.border,
            }}
          >
            <div className="bo-fade min-w-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  type="text"
                  icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={toggleSidebar}
                  className="!inline-flex !h-9 !w-9 !shrink-0 !items-center !justify-center !rounded-lg"
                  style={{ color: palette.textMuted }}
                />
                <span className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] sm:inline" style={{ color: palette.textMuted }}>
                  {headerEyebrow}
                </span>
              </div>
              <Title
                level={2}
                className="!mb-0 !mt-0.5 !truncate !text-[17px] sm:!text-[20px] md:!text-[22px] !leading-none !font-semibold"
                style={{ color: palette.ink, fontFamily: resolvedDisplayFont }}
              >
                {headerTitle}
              </Title>
            </div>

            <Space size={10} className="shrink-0">
              <Popover
                content={
                  <div style={{ width: 'min(320px, 86vw)' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                      <span style={{ color: palette.ink, fontWeight: 700 }}>Notifications</span>
                      <Space size={4}>
                        <Button onClick={handleMarkAllRead} size="small" type="link">
                          Mark all read
                        </Button>
                        <Button onClick={handleClearRead} size="small" type="link" danger>
                          Clear read
                        </Button>
                      </Space>
                    </div>
                    <List
                      dataSource={recentNotifications}
                      locale={{ emptyText: <Empty description="No notifications yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                      renderItem={(item) => (
                        <List.Item key={item._id} style={{ padding: 0 }}>
                          <div className="flex w-full items-stretch gap-1">
                            <button
                              className="min-w-0 flex-1 text-left transition-colors duration-150 hover:bg-black/4"
                              onClick={() => handleNotificationClick(item)}
                              style={{ background: 'none', border: 'none', borderRadius: 10, cursor: 'pointer', opacity: item.isRead ? 0.55 : 1, padding: '10px 12px' }}
                              type="button"
                            >
                              <div className="flex items-start gap-2">
                                {!item.isRead ? <span style={{ background: palette.red, borderRadius: 999, flexShrink: 0, height: 7, marginTop: 6, width: 7 }} /> : <span style={{ flexShrink: 0, width: 7 }} />}
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ color: palette.ink, fontSize: 13, fontWeight: 600 }}>{item.title}</div>
                                  {item.message ? <div style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>{item.message}</div> : null}
                                </div>
                              </div>
                            </button>
                            <Button
                              icon={<CloseOutlined style={{ fontSize: 11 }} />}
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleDeleteNotification(item)
                              }}
                              size="small"
                              style={{ alignSelf: 'center', flexShrink: 0 }}
                              type="text"
                            />
                          </div>
                        </List.Item>
                      )}
                      style={{ maxHeight: 360, overflowY: 'auto' }}
                    />
                  </div>
                }
                open={notifOpen}
                onOpenChange={(open) => {
                  setNotifOpen(open)
                  if (open) void loadRecentNotifications()
                }}
                placement="bottomRight"
                trigger="click"
              >
                <Badge count={unreadCount} offset={[-2, 2]} style={{ boxShadow: '0 0 0 2px #fff' }}>
                  <Button shape="circle" icon={notificationIcon} className="!transition-colors !duration-200" />
                </Badge>
              </Popover>
              {(() => {
                const profileContent = (
                  <>
                    <Avatar size={30} style={{ background: profileAccent, color: '#fff', fontSize: 13, flexShrink: 0 }}>
                      {profileInitial}
                    </Avatar>
                    {/* Name/role hidden below `sm` — the avatar alone is enough to identify
                        the account, and dropping this is what keeps the header from
                        overflowing next to the bell + logout button on narrow phones. */}
                    <div className="hidden leading-tight sm:block">
                      <div className="text-sm font-semibold" style={{ color: palette.ink }}>
                        {profileName}
                      </div>
                      <div className="text-xs" style={{ color: palette.textMuted }}>
                        {profileRole}
                      </div>
                    </div>
                  </>
                )
                const profileClassName =
                  'flex shrink-0 items-center gap-2 sm:gap-3 rounded-full border px-2.5 sm:px-3 py-1.5 transition-colors duration-200 hover:bg-black/3'
                const profileStyle = { borderColor: palette.border, background: palette.panelAlt }

                return profileHref ? (
                  <Link to={profileHref} className={profileClassName} style={profileStyle}>
                    {profileContent}
                  </Link>
                ) : (
                  <div className={profileClassName} style={profileStyle}>
                    {profileContent}
                  </div>
                )
              })()}
              {onLogout && (
                <Button
                  onClick={onLogout}
                  icon={<LogoutOutlined />}
                  title="Logout"
                  className="!rounded-full !font-semibold !transition-colors !duration-200"
                >
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              )}
            </Space>
          </header>

          <section className="min-w-0 px-4 py-5 md:px-6">
            {/* `min-w-0` on the flex column itself, plus forcing it onto every
                direct child, is what lets a wide Table/Card scroll *inside*
                itself instead of stretching this column (and the page) wider
                than the viewport — flex items default to `min-width: auto`,
                which refuses to shrink below the content's intrinsic size. */}
            <div className="bo-fade flex w-full min-w-0 flex-col gap-5 *:min-w-0">{children}</div>
          </section>
        </main>
      </div>
    </div>
  )
}
