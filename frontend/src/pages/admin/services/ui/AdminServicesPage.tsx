import { PlusOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../../shared/auth'
import { ApiClientError } from '../../../../shared/lib/api-client'
import {
  createService,
  createServiceCategory,
  deleteService,
  deleteServiceCategory,
  fetchServiceCategories,
  fetchServices,
  updateService,
  type ServiceCategoryRecord,
  type ServicePayload,
  type ServiceRecord,
} from '../api/servicesApi'
import { AdminShell, adminPalette } from '../../ui/AdminShell'

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}

export default function AdminServicesPage() {
  const { token } = useAuth()
  const [categories, setCategories] = useState<ServiceCategoryRecord[]>([])
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [requestError, setRequestError] = useState('')

  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [categorySaving, setCategorySaving] = useState(false)
  const [categoryForm] = Form.useForm<{ name: string; description?: string }>()

  const [serviceModalOpen, setServiceModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null)
  const [serviceSaving, setServiceSaving] = useState(false)
  const [serviceForm] = Form.useForm<ServicePayload>()

  async function loadAll() {
    if (!token) return
    setIsLoading(true)
    setRequestError('')
    try {
      const [categoriesResponse, servicesResponse] = await Promise.all([
        fetchServiceCategories(token),
        fetchServices(token),
      ])
      setCategories(categoriesResponse)
      setServices(servicesResponse)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unable to load the service catalog.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleCreateCategory(values: { name: string; description?: string }) {
    if (!token) return
    setCategorySaving(true)
    setRequestError('')
    try {
      const category = await createServiceCategory(token, values)
      setCategories((current) => [category, ...current])
      setCategoryModalOpen(false)
      categoryForm.resetFields()
    } catch (error) {
      setRequestError(error instanceof ApiClientError ? error.message : 'Unable to create this category.')
    } finally {
      setCategorySaving(false)
    }
  }

  async function handleDeleteCategory(category: ServiceCategoryRecord) {
    if (!token) return
    try {
      await deleteServiceCategory(token, category._id)
      setCategories((current) => current.filter((item) => item._id !== category._id))
    } catch (error) {
      setRequestError(error instanceof ApiClientError ? error.message : 'Unable to remove this category.')
    }
  }

  function openCreateServiceModal() {
    setEditingService(null)
    setRequestError('')
    serviceForm.resetFields()
    setServiceModalOpen(true)
  }

  function openEditServiceModal(service: ServiceRecord) {
    setEditingService(service)
    setRequestError('')
    serviceForm.setFieldsValue(service)
    setServiceModalOpen(true)
  }

  async function handleSubmitService(values: ServicePayload) {
    if (!token) return
    setServiceSaving(true)
    setRequestError('')
    try {
      if (editingService) {
        const updated = await updateService(token, editingService._id, values)
        setServices((current) => current.map((item) => (item._id === editingService._id ? updated : item)))
      } else {
        const created = await createService(token, values)
        setServices((current) => [created, ...current])
      }
      setServiceModalOpen(false)
    } catch (error) {
      setRequestError(error instanceof ApiClientError ? error.message : 'Unable to save this service.')
    } finally {
      setServiceSaving(false)
    }
  }

  async function handleDeleteService(service: ServiceRecord) {
    if (!token) return
    try {
      await deleteService(token, service._id)
      setServices((current) => current.filter((item) => item._id !== service._id))
    } catch (error) {
      setRequestError(error instanceof ApiClientError ? error.message : 'Unable to remove this service.')
    }
  }

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.name, label: category.name })),
    [categories],
  )

  const columns = useMemo<ColumnsType<ServiceRecord>>(
    () => [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      { title: 'Category', dataIndex: 'category', key: 'category', render: (value?: string) => value || '—' },
      { title: 'Base price', dataIndex: 'basePrice', key: 'basePrice', render: (value: number) => formatMoney(value) },
      {
        title: 'Duration',
        dataIndex: 'estimatedDuration',
        key: 'estimatedDuration',
        render: (value?: number) => (value ? `${value} min` : '—'),
      },
      {
        title: 'Status',
        dataIndex: 'isActive',
        key: 'isActive',
        render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? 'Active' : 'Inactive'}</Tag>,
      },
      {
        title: 'Action',
        key: 'action',
        render: (_, service) => (
          <div className="flex items-center gap-2">
            <Button size="small" onClick={() => openEditServiceModal(service)}>
              Edit
            </Button>
            <Popconfirm title="Remove this service?" okText="Remove" onConfirm={() => handleDeleteService(service)}>
              <Button size="small" danger>
                Remove
              </Button>
            </Popconfirm>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <AdminShell eyebrow="Admin" title="Service catalog">
      {requestError ? (
        <div
          className="mb-4 rounded-[18px] border px-4 py-3 text-sm font-medium"
          style={{ borderColor: '#fecaca', background: '#fff1f2', color: '#991b1b', marginBottom: 20 }}
        >
          {requestError}
        </div>
      ) : null}

      <Card
        bordered={false}
        className="rounded-[32px]"
        styles={{ body: { padding: 24 } }}
        style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, marginBottom: 20 }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4" style={{ marginBottom: 16 }}>
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: adminPalette.textMuted }}>
              Categories
            </div>
          </div>
          <Button
            icon={<PlusOutlined />}
            onClick={() => {
              setRequestError('')
              categoryForm.resetFields()
              setCategoryModalOpen(true)
            }}
          >
            Add category
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.length === 0 ? <span style={{ color: adminPalette.textMuted }}>No categories yet.</span> : null}
          {categories.map((category) => (
            <Tag key={category._id} closable onClose={() => handleDeleteCategory(category)}>
              {category.name}
            </Tag>
          ))}
        </div>
      </Card>

      <Card bordered={false} className="rounded-[32px]" styles={{ body: { padding: 24 } }} style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow }}>
        <div className="flex flex-wrap items-center justify-between gap-4" style={{ marginBottom: 20 }}>
          <div className="text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: adminPalette.textMuted }}>
            Services
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateServiceModal}>
            Add service
          </Button>
        </div>

        <Table
          rowKey="_id"
          columns={columns}
          dataSource={services}
          loading={isLoading}
          pagination={false}
          locale={{ emptyText: 'No services in the catalog yet.' }}
        />
      </Card>

      <Modal
        title="Add service category"
        open={categoryModalOpen}
        onCancel={() => setCategoryModalOpen(false)}
        onOk={() => categoryForm.submit()}
        confirmLoading={categorySaving}
        okText="Add category"
      >
        <Form form={categoryForm} layout="vertical" onFinish={handleCreateCategory}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingService ? 'Edit service' : 'Add service'}
        open={serviceModalOpen}
        onCancel={() => setServiceModalOpen(false)}
        onOk={() => serviceForm.submit()}
        confirmLoading={serviceSaving}
        okText={editingService ? 'Save changes' : 'Add service'}
      >
        <Form form={serviceForm} layout="vertical" onFinish={handleSubmitService} initialValues={{ isActive: true }}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="Category">
            <Select allowClear options={categoryOptions} placeholder="No category" />
          </Form.Item>
          <Form.Item name="basePrice" label="Base price (VND)" rules={[{ required: true, message: 'Base price is required' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="estimatedDuration" label="Estimated duration (minutes)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </AdminShell>
  )
}
