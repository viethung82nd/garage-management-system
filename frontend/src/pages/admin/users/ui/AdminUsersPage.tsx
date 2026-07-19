import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../../shared/auth'
import { ApiClientError } from '../../../../shared/lib/api-client'
import { createStaffAccount, deactivateUser, fetchAdminUsers, type AdminUserRecord, type CreateStaffPayload } from '../api/usersApi'
import { AdminShell, adminPalette } from '../../ui/AdminShell'
import { InlineBanner } from '../../../../widgets/backoffice-shell'

const STAFF_ROLE_OPTIONS: Array<{ value: CreateStaffPayload['role']; label: string }> = [
  { value: 'serviceAdvisor', label: 'Service advisor' },
  { value: 'technician', label: 'Technician' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'admin', label: 'Admin' },
]

function roleLabel(role: AdminUserRecord['role']) {
  switch (role) {
    case 'serviceAdvisor':
      return 'Service advisor'
    case 'technician':
      return 'Technician'
    case 'accountant':
      return 'Accountant'
    case 'admin':
      return 'Admin'
    default:
      return role
  }
}

export default function AdminUsersPage() {
  const { token } = useAuth()
  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)
  const [createForm] = Form.useForm<CreateStaffPayload>()
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setRequestError('')
      try {
        const response = await fetchAdminUsers(token)
        if (cancelled) return
        const staffOnly = response.users.filter((user) => user.role !== 'onlineCustomer' && user.role !== 'walkInCustomer')
        setUsers(staffOnly)
      } catch (error) {
        if (!cancelled) {
          setRequestError(error instanceof Error ? error.message : 'Unable to load staff accounts.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [token])

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return users
    return users.filter(
      (user) =>
        user.fullName.toLowerCase().includes(normalizedQuery) ||
        (user.email || '').toLowerCase().includes(normalizedQuery),
    )
  }, [query, users])

  async function handleCreateStaff(values: CreateStaffPayload) {
    if (!token) return
    setCreateError('')
    setCreating(true)
    try {
      const response = await createStaffAccount(token, values)
      setUsers((current) => [response.user, ...current])
      setCreateModalOpen(false)
      createForm.resetFields()
    } catch (error) {
      setCreateError(error instanceof ApiClientError ? error.message : 'Unable to create the staff account. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeactivate(user: AdminUserRecord) {
    if (!token) return
    setDeactivatingId(user._id)
    try {
      await deactivateUser(token, user._id)
      setUsers((current) => current.map((item) => (item._id === user._id ? { ...item, isActive: false } : item)))
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to deactivate this account.')
    } finally {
      setDeactivatingId(null)
    }
  }

  const columns = useMemo<ColumnsType<AdminUserRecord>>(
    () => [
      { title: 'Full name', dataIndex: 'fullName', key: 'fullName' },
      { title: 'Email', dataIndex: 'email', key: 'email' },
      { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (value?: string) => value || 'Not recorded' },
      { title: 'Role', dataIndex: 'role', key: 'role', render: (value: AdminUserRecord['role']) => <Tag>{roleLabel(value)}</Tag> },
      {
        title: 'Status',
        dataIndex: 'isActive',
        key: 'isActive',
        render: (value: boolean) => (
          <Tag color={value ? 'green' : 'default'}>{value ? 'Active' : 'Deactivated'}</Tag>
        ),
      },
      {
        title: 'Action',
        key: 'action',
        render: (_, user) =>
          user.isActive ? (
            <Popconfirm
              title="Deactivate this account?"
              description="They will no longer be able to log in."
              okText="Deactivate"
              onConfirm={() => handleDeactivate(user)}
            >
              <Button danger loading={deactivatingId === user._id} size="small">
                Deactivate
              </Button>
            </Popconfirm>
          ) : (
            <Tag>Deactivated</Tag>
          ),
      },
    ],
    [deactivatingId],
  )

  return (
    <AdminShell eyebrow="Admin" title="User management">
      <Card
        bordered={false}
        className="bo-enter rounded-2xl"
        styles={{ body: { padding: 24 } }}
        style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, border: `1px solid ${adminPalette.border}` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4" style={{ marginBottom: 20 }}>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: adminPalette.textMuted }} />}
            placeholder="Search by name or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ maxWidth: 320 }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setCreateError('')
              createForm.resetFields()
              setCreateModalOpen(true)
            }}
          >
            Add staff account
          </Button>
        </div>

        {requestError ? <InlineBanner tone="error">{requestError}</InlineBanner> : null}

        <Table
          rowKey="_id"
          columns={columns}
          dataSource={filteredUsers}
          loading={isLoading}
          pagination={{ pageSize: 8, showTotal: (total) => `${total} accounts` }}
          locale={{ emptyText: 'No staff accounts yet.' }}
          className="bo-table"
        />
      </Card>

      <Modal
        title="Add staff account"
        open={createModalOpen}
        onCancel={() => {
          setCreateError('')
          setCreateModalOpen(false)
        }}
        onOk={() => createForm.submit()}
        confirmLoading={creating}
        okText="Create account"
      >
        {createError ? <InlineBanner tone="error">{createError}</InlineBanner> : null}
        <Form form={createForm} layout="vertical" onFinish={handleCreateStaff}>
          <Form.Item name="fullName" label="Full name" rules={[{ required: true, message: 'Full name is required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'A valid email is required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="Temporary password"
            rules={[{ required: true, min: 8, message: 'Password must be at least 8 characters' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true, message: 'Role is required' }]}>
            <Select options={STAFF_ROLE_OPTIONS} placeholder="Select a role" />
          </Form.Item>
        </Form>
      </Modal>
    </AdminShell>
  )
}
