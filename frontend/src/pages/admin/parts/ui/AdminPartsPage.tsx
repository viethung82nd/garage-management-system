import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { createPart, deletePart, fetchParts, updatePart, type PartPayload, type PartRecord } from '../api/partsApi'
import { AdminShell, adminPalette } from '../../ui/AdminShell'
import { InlineBanner } from '../../../../widgets/backoffice-shell'

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}

export default function AdminPartsPage() {
  const [parts, setParts] = useState<PartRecord[]>([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPart, setEditingPart] = useState<PartRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form] = Form.useForm<PartPayload>()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setRequestError('')
      try {
        const response = await fetchParts()
        if (cancelled) return
        setParts(response.parts)
      } catch (error) {
        if (!cancelled) {
          setRequestError(error instanceof Error ? error.message : 'Unable to load parts.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredParts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return parts
    return parts.filter(
      (part) => part.name.toLowerCase().includes(normalizedQuery) || part.sku.toLowerCase().includes(normalizedQuery),
    )
  }, [parts, query])

  function openCreateModal() {
    setEditingPart(null)
    setRequestError('')
    form.resetFields()
    setModalOpen(true)
  }

  function openEditModal(part: PartRecord) {
    setEditingPart(part)
    setRequestError('')
    form.setFieldsValue(part)
    setModalOpen(true)
  }

  async function handleSubmit(values: PartPayload) {
    setSaving(true)
    setRequestError('')
    try {
      if (editingPart) {
        const response = await updatePart(editingPart._id, values)
        setParts((current) => current.map((part) => (part._id === editingPart._id ? response.part : part)))
      } else {
        const response = await createPart(values)
        setParts((current) => [response.part, ...current])
      }
      setModalOpen(false)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to save this part.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(part: PartRecord) {
    setDeletingId(part._id)
    try {
      await deletePart(part._id)
      setParts((current) => current.filter((item) => item._id !== part._id))
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to remove this part.')
    } finally {
      setDeletingId(null)
    }
  }

  const columns = useMemo<ColumnsType<PartRecord>>(
    () => [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      { title: 'SKU', dataIndex: 'sku', key: 'sku' },
      { title: 'Unit price', dataIndex: 'unitPrice', key: 'unitPrice', render: (value: number) => formatMoney(value) },
      { title: 'Stock', dataIndex: 'stockQuantity', key: 'stockQuantity' },
      {
        title: 'Action',
        key: 'action',
        render: (_, part) => (
          <div className="flex items-center gap-2">
            <Button size="small" onClick={() => openEditModal(part)}>
              Edit
            </Button>
            <Popconfirm title="Remove this part?" okText="Remove" onConfirm={() => handleDelete(part)}>
              <Button size="small" danger loading={deletingId === part._id}>
                Remove
              </Button>
            </Popconfirm>
          </div>
        ),
      },
    ],
    [deletingId],
  )

  return (
    <AdminShell eyebrow="Admin" title="Parts catalog">
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
            placeholder="Search by name or SKU"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ maxWidth: 320 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Add part
          </Button>
        </div>

        {requestError ? <InlineBanner tone="error">{requestError}</InlineBanner> : null}

        <Table
          rowKey="_id"
          columns={columns}
          dataSource={filteredParts}
          loading={isLoading}
          pagination={{ pageSize: 8, showTotal: (total) => `${total} parts` }}
          locale={{ emptyText: 'No parts in the catalog yet.' }}
          className="bo-table"
        />
      </Card>

      <Modal
        title={editingPart ? 'Edit part' : 'Add part'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText={editingPart ? 'Save changes' : 'Add part'}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sku" label="SKU" rules={[{ required: true, message: 'SKU is required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="unitPrice" label="Unit price (VND)" rules={[{ required: true, message: 'Unit price is required' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="stockQuantity" label="Stock quantity" rules={[{ required: true, message: 'Stock quantity is required' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </AdminShell>
  )
}
