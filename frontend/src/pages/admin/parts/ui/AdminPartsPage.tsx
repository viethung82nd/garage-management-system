import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Table, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import {
  adjustPartStock,
  createPart,
  deletePart,
  fetchParts,
  updatePart,
  type CreatePartPayload,
  type PartRecord,
} from '../api/partsApi'
import { AdminShell, adminPalette } from '../../ui/AdminShell'
import { InlineBanner } from '../../../../widgets/backoffice-shell'
import { useAuth } from '../../../../shared/auth'

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}

export default function AdminPartsPage() {
  const { token } = useAuth()
  const [parts, setParts] = useState<PartRecord[]>([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPart, setEditingPart] = useState<PartRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form] = Form.useForm<CreatePartPayload>()
  const [adjustingPart, setAdjustingPart] = useState<PartRecord | null>(null)
  const [adjustForm] = Form.useForm<{ newQuantity: number; reason: string }>()
  const [adjusting, setAdjusting] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setRequestError('')
      try {
        const response = await fetchParts(token)
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
  }, [token])

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

  async function handleSubmit(values: CreatePartPayload) {
    if (!token) return
    setSaving(true)
    setRequestError('')
    try {
      if (editingPart) {
        // stockQuantity is intentionally dropped on edit — on-hand stock is
        // only ever changed through an adjustment, which records a reason.
        const { stockQuantity: _ignored, ...editable } = values
        const response = await updatePart(token, editingPart._id, editable)
        setParts((current) => current.map((part) => (part._id === editingPart._id ? response.part : part)))
      } else {
        const response = await createPart(token, values)
        setParts((current) => [response.part, ...current])
      }
      setModalOpen(false)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to save this part.')
    } finally {
      setSaving(false)
    }
  }

  function openAdjustModal(part: PartRecord) {
    setAdjustingPart(part)
    setRequestError('')
    adjustForm.setFieldsValue({ newQuantity: part.stockQuantity, reason: '' })
  }

  async function handleAdjust(values: { newQuantity: number; reason: string }) {
    if (!token || !adjustingPart) return
    setAdjusting(true)
    setRequestError('')
    try {
      const response = await adjustPartStock(token, adjustingPart._id, values)
      setParts((current) => current.map((part) => (part._id === adjustingPart._id ? response.part : part)))
      setAdjustingPart(null)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to adjust stock.')
    } finally {
      setAdjusting(false)
    }
  }

  async function handleDelete(part: PartRecord) {
    if (!token) return
    setDeletingId(part._id)
    try {
      await deletePart(token, part._id)
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
      {
        title: 'On hand',
        dataIndex: 'stockQuantity',
        key: 'stockQuantity',
        render: (value: number, part) => {
          const reserved = part.reservedQuantity ?? 0
          const available = part.availableQuantity ?? value - reserved
          return (
            <div className="flex items-center gap-2">
              <span>{value}</span>
              {reserved > 0 ? (
                <Tooltip title={`${reserved} committed to approved repair orders — ${available} free to sell`}>
                  <Tag color="gold">{available} free</Tag>
                </Tooltip>
              ) : null}
              {available <= (part.reorderPoint ?? 0) ? <Tag color="red">Reorder</Tag> : null}
            </div>
          )
        },
      },
      {
        title: 'Action',
        key: 'action',
        render: (_, part) => (
          <div className="flex items-center gap-2">
            <Button size="small" onClick={() => openEditModal(part)}>
              Edit
            </Button>
            <Button size="small" onClick={() => openAdjustModal(part)}>
              Adjust stock
            </Button>
            <Popconfirm
              title="Retire this part?"
              description="It stays on past invoices and orders, but is hidden from the catalogue."
              okText="Retire"
              onConfirm={() => handleDelete(part)}
            >
              <Button size="small" danger loading={deletingId === part._id}>
                Retire
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
          scroll={{ x: 680 }}
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
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="unitPrice" label="Selling price (VND)" rules={[{ required: true, message: 'Required' }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="costPrice" label="Cost price (VND)">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="reorderPoint" label="Reorder point">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            {editingPart ? null : (
              <Form.Item name="stockQuantity" label="Opening stock" rules={[{ required: true, message: 'Required' }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            )}
          </div>
        </Form>
      </Modal>

      <Modal
        title={adjustingPart ? `Adjust stock — ${adjustingPart.name}` : 'Adjust stock'}
        open={Boolean(adjustingPart)}
        onCancel={() => setAdjustingPart(null)}
        onOk={() => adjustForm.submit()}
        confirmLoading={adjusting}
        okText="Record adjustment"
      >
        <Form form={adjustForm} layout="vertical" onFinish={handleAdjust}>
          <Form.Item
            name="newQuantity"
            label="Counted quantity"
            rules={[{ required: true, message: 'Required' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true, message: 'Required' }]}>
            <Input.TextArea autoSize={{ maxRows: 4, minRows: 2 }} />
          </Form.Item>
        </Form>
      </Modal>
    </AdminShell>
  )
}
