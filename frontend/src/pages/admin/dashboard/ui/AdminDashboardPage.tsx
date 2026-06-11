import { BellOutlined, ClockCircleOutlined, DashboardOutlined, MenuFoldOutlined, SettingOutlined, TeamOutlined, ToolOutlined } from '@ant-design/icons'
import { Avatar, Badge, Button, Card, Col, Layout, Menu, Progress, Row, Space, Statistic, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { bookingOverview, bookingRecords, weeklyStatus, type BookingRecord } from '../model/mock'

const { Header, Sider, Content } = Layout
const { Title } = Typography

function statusTagColor(status: BookingRecord['status']) {
  switch (status) {
    case 'Pending':
      return 'gold'
    case 'Confirmed':
      return 'blue'
    case 'In Service':
      return 'purple'
    case 'Completed':
      return 'green'
    case 'Cancelled':
      return 'default'
    default:
      return 'default'
  }
}

export default function AdminDashboardPage() {
  const [collapsed, setCollapsed] = useState(false)

  const columns = useMemo<ColumnsType<BookingRecord>>(
    () => [
      {
        title: 'Booking ID',
        dataIndex: 'key',
        key: 'key',
        render: (value: string) => <span className="font-semibold text-slate-900">{value}</span>,
      },
      {
        title: 'Customer',
        dataIndex: 'customer',
        key: 'customer',
        render: (value: string) => <span className="font-medium text-slate-700">{value}</span>,
      },
      {
        title: 'Vehicle',
        dataIndex: 'vehicle',
        key: 'vehicle',
      },
      {
        title: 'Service',
        dataIndex: 'service',
        key: 'service',
      },
      {
        title: 'Date / Time',
        key: 'datetime',
        render: (_, record) => (
          <div className="space-y-1">
            <div className="font-medium text-slate-700">{record.date}</div>
            <div className="text-xs text-slate-500">{record.time}</div>
          </div>
        ),
      },
      {
        title: 'Channel',
        dataIndex: 'channel',
        key: 'channel',
        render: (value: BookingRecord['channel']) => <Tag color="geekblue">{value}</Tag>,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (value: BookingRecord['status']) => <Tag color={statusTagColor(value)}>{value}</Tag>,
      },
      {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
        render: (value: number) => <span className="font-semibold text-slate-900">${value}</span>,
      },
    ],
    [],
  )

  return (
    <Layout className="min-h-screen bg-slate-950">
      <Sider
        width={274}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        className="!fixed left-0 top-0 bottom-0 z-40 border-r border-white/10 !bg-slate-950/95 backdrop-blur-xl"
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
            <ToolOutlined />
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-semibold text-white">Garage Admin</div>
              <div className="text-xs text-slate-400">Booking operations</div>
            </div>
          )}
        </div>

        <div className="px-3 py-5">
          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={['dashboard']}
            className="!bg-transparent"
            items={[
              { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
              { key: 'bookings', icon: <ClockCircleOutlined />, label: 'Bookings' },
              { key: 'customers', icon: <TeamOutlined />, label: 'Customers' },
              { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
            ]}
          />
        </div>

        {!collapsed && (
          <div className="mx-4 mt-auto rounded-3xl border border-white/10 bg-white/5 p-4 text-slate-200">
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">Today</p>
            <p className="mt-2 text-lg font-semibold text-white">24 bookings</p>
            <p className="mt-1 text-sm text-slate-400">6 need immediate confirmation.</p>
          </div>
        )}
      </Sider>

      <Layout className={collapsed ? 'ml-20 transition-all' : 'ml-[274px] transition-all'}>
        <Header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/70 bg-white/85 px-6 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-3 text-slate-400">
              <Button
                type="text"
                icon={<MenuFoldOutlined />}
                onClick={() => setCollapsed((value) => !value)}
                className="!inline-flex !items-center !justify-center"
              />
              <span className="text-sm font-medium">Admin dashboard</span>
            </div>
            <Title level={3} className="!m-0 !text-[22px] !leading-tight !text-slate-950">
              Booking overview
            </Title>
          </div>

          <Space size="middle">
            <Badge dot offset={[-4, 10]}>
              <Button shape="circle" icon={<BellOutlined />} />
            </Badge>
            <Space>
              <Avatar className="bg-emerald-600">A</Avatar>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-slate-900">Admin</div>
                <div className="text-xs text-slate-500">Garage manager</div>
              </div>
            </Space>
          </Space>
        </Header>

        <Content className="bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.09),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 py-6">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {bookingOverview.map((item) => (
                <Card key={item.label} className="overflow-hidden border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">{item.label}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.tone === 'emerald'
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.tone === 'blue'
                            ? 'bg-blue-100 text-blue-700'
                            : item.tone === 'amber'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-violet-100 text-violet-700'
                      }`}
                    >
                      {item.delta}
                    </span>
                  </div>
                  <Statistic value={item.value} valueStyle={{ fontSize: 28, lineHeight: 1.1, fontWeight: 700, color: '#0f172a' }} />
                </Card>
              ))}
            </div>

            <Row gutter={[24, 24]}>
              <Col xs={24} xl={16}>
                <Card
                  title={<span className="text-base font-semibold text-slate-900">Recent bookings</span>}
                  className="border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
                  extra={<Button type="primary">Export CSV</Button>}
                >
                  <Table
                    rowKey="key"
                    columns={columns}
                    dataSource={bookingRecords}
                    pagination={false}
                    scroll={{ x: 1100 }}
                  />
                </Card>
              </Col>

              <Col xs={24} xl={8}>
                <div className="flex flex-col gap-6">
                  <Card className="border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                    <div className="mb-5">
                      <p className="text-sm font-medium text-slate-500">Status mix</p>
                      <Title level={4} className="!mt-1 !mb-0 !text-slate-950">
                        Weekly booking distribution
                      </Title>
                    </div>

                    <div className="space-y-4">
                      {weeklyStatus.map((item) => (
                        <div key={item.label}>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-700">{item.label}</span>
                            <span className="text-slate-500">{item.value}</span>
                          </div>
                          <Progress percent={item.value} strokeColor={item.color} showInfo={false} />
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Queue</p>
                        <Title level={4} className="!mt-1 !mb-0 !text-slate-950">
                          Next actions
                        </Title>
                      </div>
                      <Tag color="green">Live</Tag>
                    </div>

                    <div className="space-y-3">
                      {[
                        'Confirm BK-1001 guest booking',
                        'Assign technician for BK-1005',
                        'Send invoice for BK-1004',
                      ].map((item) => (
                        <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                          {item}
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </Col>
            </Row>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
