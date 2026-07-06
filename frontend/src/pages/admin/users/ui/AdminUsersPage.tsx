import { SearchOutlined } from '@ant-design/icons'
import { Card, Input, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../../shared/auth'
import { fetchAdminUsers, type AdminUserRecord } from '../api/usersApi'
import { AdminShell, adminPalette } from '../../ui/AdminShell'

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

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setRequestError('')
      try {
        const response = await fetchAdminUsers(token)
        if (cancelled) return
        setUsers(response.users)
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
    ],
    [],
  )

  return (
    <AdminShell eyebrow="Admin" title="User management">
      <Card bordered={false} className="rounded-[32px]" styles={{ body: { padding: 24 } }} style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search by name or email"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ maxWidth: 320, marginBottom: 20 }}
        />

        {requestError ? (
          <div className="mb-4 rounded-[18px] border px-4 py-3 text-sm font-medium" style={{ borderColor: '#fecaca', background: '#fff1f2', color: '#991b1b' }}>
            {requestError}
          </div>
        ) : null}

        <Table
          rowKey="_id"
          columns={columns}
          dataSource={filteredUsers}
          loading={isLoading}
          pagination={false}
          locale={{ emptyText: 'No staff accounts yet.' }}
        />
      </Card>
    </AdminShell>
  )
}
