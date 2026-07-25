import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import {
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  createResource,
  deleteResource,
  fetchResources,
  updateResource,
  type ApiResource,
  type ResourceType,
} from '../api/resourcesApi'
import { AdminShell, adminPalette } from '../../ui/AdminShell'
import { InlineBanner } from '../../../../widgets/backoffice-shell'
import { useAuth } from '../../../../shared/auth'

type ResourceFormValues = {
  name: string
  type: ResourceType
  notes?: string
}

const resourceTypeOptions = RESOURCE_TYPES.map((type) => ({ label: RESOURCE_TYPE_LABELS[type], value: type }))

export default function AdminResourcesPage() {
  const { token } = useAuth()
  const [resources, setResources] = useState<ApiResource[]>([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<ApiResource | null>(null)
  const [saving, setSaving] = useState(false)
  const [retiringId, setRetiringId] = useState<string | null>(null)
  const [form] = Form.useForm<ResourceFormValues>()

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setRequestError('')
      try {
        const response = await fetchResources(token, { includeInactive: true })
        if (cancelled) return
        setResources(response.resources ?? [])
      } catch (error) {
        if (!cancelled) {
          setRequestError(error instanceof Error ? error.message : 'Unable to load resources.')
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

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return resources
    return resources.filter((resource) => resource.name.toLowerCase().includes(normalizedQuery))
  }, [resources, query])

  function openCreateModal() {
    setEditingResource(null)
    setRequestError('')
    form.resetFields()
    setModalOpen(true)
  }

  function openEditModal(resource: ApiResource) {
    setEditingResource(resource)
    setRequestError('')
    form.setFieldsValue({ name: resource.name, type: resource.type, notes: resource.notes })
    setModalOpen(true)
  }

  async function handleSubmit(values: ResourceFormValues) {
    if (!token) return
    setSaving(true)
    setRequestError('')
    try {
      if (editingResource) {
        const response = await updateResource(token, editingResource._id, values)
        setResources((current) => current.map((resource) => (resource._id === editingResource._id ? response.resource : resource)))
      } else {
        const response = await createResource(token, values)
        setResources((current) => [response.resource, ...current])
      }
      setModalOpen(false)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to save this resource.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRetire(resource: ApiResource) {
    if (!token) return
    setRetiringId(resource._id)
    setRequestError('')
    try {
      await deleteResource(token, resource._id)
      setResources((current) => current.map((item) => (item._id === resource._id ? { ...item, isActive: false } : item)))
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to retire this resource.')
    } finally {
      setRetiringId(null)
    }
  }

  const columns = useMemo<ColumnsType<ApiResource>>(
    () => [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      {
        title: 'Type',
        dataIndex: 'type',
        key: 'type',
        render: (type: ResourceType) => RESOURCE_TYPE_LABELS[type] ?? type,
      },
      { title: 'Notes', dataIndex: 'notes', key: 'notes', render: (notes?: string) => notes || '—' },
      {
        title: 'Status',
        key: 'status',
        render: (_, resource) =>
          resource.isActive === false ? <Tag color="default">Retired</Tag> : <Tag color="green">Active</Tag>,
      },
      {
        title: 'Action',
        key: 'action',
        render: (_, resource) => (
          <div className="flex items-center gap-2">
            <Button size="small" onClick={() => openEditModal(resource)}>
              Edit
            </Button>
            {resource.isActive === false ? null : (
              <Popconfirm
                title="Retire this resource?"
                description="It stays on past bookings, but is hidden from capacity planning."
                okText="Retire"
                onConfirm={() => handleRetire(resource)}
              >
                <Button size="small" danger loading={retiringId === resource._id}>
                  Retire
                </Button>
              </Popconfirm>
            )}
          </div>
        ),
      },
    ],
    [retiringId],
  )

  return (
    <AdminShell eyebrow="Admin" title="Resources">
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
            placeholder="Search by name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ maxWidth: 320 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Add resource
          </Button>
        </div>

        {requestError ? <InlineBanner tone="error">{requestError}</InlineBanner> : null}

        <Table
          rowKey="_id"
          columns={columns}
          dataSource={filteredResources}
          loading={isLoading}
          pagination={{ pageSize: 8, showTotal: (total) => `${total} resources` }}
          locale={{ emptyText: 'No resources yet.' }}
          className="bo-table"
          scroll={{ x: 680 }}
        />
      </Card>

      <Modal
        title={editingResource ? 'Edit resource' : 'Add resource'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText={editingResource ? 'Save changes' : 'Add resource'}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true, message: 'Type is required' }]}>
            <Select options={resourceTypeOptions} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea autoSize={{ maxRows: 4, minRows: 2 }} />
          </Form.Item>
        </Form>
      </Modal>
    </AdminShell>
  )
}
