import { DeleteOutlined, EditOutlined, PictureOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../../../shared/auth'
import { ApiClientError, resolveApiAssetUrl } from '../../../../shared/lib/api-client'
import {
  createService,
  createServiceCategory,
  deleteService,
  deleteServiceCategory,
  fetchServiceCategories,
  fetchServices,
  updateService,
  updateServiceCategory,
  uploadServiceCategoryPhoto,
  type ServiceCategoryPayload,
  type ServiceCategoryRecord,
  type ServicePayload,
  type ServiceRecord,
} from '../api/servicesApi'
import { AdminShell, adminPalette } from '../../ui/AdminShell'
import { InlineBanner } from '../../../../widgets/backoffice-shell'

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
  const [editingCategory, setEditingCategory] = useState<ServiceCategoryRecord | null>(null)
  const [categorySaving, setCategorySaving] = useState(false)
  const [categoryForm] = Form.useForm<ServiceCategoryPayload>()

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

  function openCreateCategoryModal() {
    setEditingCategory(null)
    setRequestError('')
    categoryForm.resetFields()
    categoryForm.setFieldsValue({ isActive: true })
    setCategoryModalOpen(true)
  }

  function openEditCategoryModal(category: ServiceCategoryRecord) {
    setEditingCategory(category)
    setRequestError('')
    categoryForm.setFieldsValue(category)
    setCategoryModalOpen(true)
  }

  async function handleSubmitCategory(values: ServiceCategoryPayload) {
    if (!token) return
    setCategorySaving(true)
    setRequestError('')
    try {
      if (editingCategory) {
        const updated = await updateServiceCategory(token, editingCategory._id, values)
        setCategories((current) => current.map((item) => (item._id === editingCategory._id ? updated : item)))
      } else {
        const category = await createServiceCategory(token, values)
        setCategories((current) => [category, ...current])
      }
      setCategoryModalOpen(false)
    } catch (error) {
      setRequestError(error instanceof ApiClientError ? error.message : 'Unable to save this category.')
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

  const photoUploadTargetId = useRef<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  function openCategoryPhotoPicker(categoryId: string) {
    photoUploadTargetId.current = categoryId
    photoInputRef.current?.click()
  }

  async function handleCategoryPhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    const categoryId = photoUploadTargetId.current
    event.target.value = ''
    if (!token || !file || !categoryId) return

    try {
      const updated = await uploadServiceCategoryPhoto(token, categoryId, file)
      setCategories((current) => current.map((item) => (item._id === categoryId ? updated : item)))
    } catch (error) {
      setRequestError(error instanceof ApiClientError ? error.message : 'Unable to upload this photo.')
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

  const serviceCountByCategory = useMemo(() => {
    const counts = new Map<string, number>()
    for (const service of services) {
      if (!service.category) continue
      counts.set(service.category, (counts.get(service.category) || 0) + 1)
    }
    return counts
  }, [services])

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
      {requestError ? <InlineBanner tone="error">{requestError}</InlineBanner> : null}

      <Card
        bordered={false}
        className="bo-enter rounded-2xl"
        styles={{ body: { padding: 24 } }}
        style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, border: `1px solid ${adminPalette.border}` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4" style={{ marginBottom: 20 }}>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: adminPalette.textMuted }}>
              Categories
            </div>
            <div className="mt-1 text-[16px] font-semibold" style={{ color: adminPalette.ink }}>
              {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
            </div>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateCategoryModal}>
            Add category
          </Button>
        </div>

        <input accept="image/*" className="hidden" onChange={handleCategoryPhotoSelected} ref={photoInputRef} type="file" />

        {categories.length === 0 ? (
          <div className="rounded-xl border border-dashed py-12 text-center text-sm" style={{ borderColor: adminPalette.border, color: adminPalette.textMuted }}>
            No categories yet — add one to start organizing your service catalog.
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {categories.map((category) => (
              <div
                key={category._id}
                className="bo-card-hover overflow-hidden rounded-xl border transition-shadow"
                style={{ borderColor: adminPalette.border, background: adminPalette.panel }}
              >
                <button
                  type="button"
                  onClick={() => openCategoryPhotoPicker(category._id)}
                  className="group relative block h-28 w-full cursor-pointer border-0 p-0"
                  style={{ background: adminPalette.panelAlt }}
                  title="Change photo"
                >
                  {category.imageUrl ? (
                    <img alt="" src={resolveApiAssetUrl(category.imageUrl)} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <PictureOutlined style={{ color: adminPalette.textMuted, fontSize: 28 }} />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
                    <UploadOutlined className="text-lg" />
                  </div>
                </button>

                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate text-sm font-semibold" style={{ color: adminPalette.ink }} title={category.name}>
                      {category.name}
                    </div>
                    <Tag color={category.isActive === false ? 'default' : 'green'} className="!m-0 shrink-0">
                      {category.isActive === false ? 'Inactive' : 'Active'}
                    </Tag>
                  </div>
                  {category.description ? (
                    <div
                      className="mt-1 text-xs"
                      style={{ color: adminPalette.textMuted, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {category.description}
                    </div>
                  ) : null}
                  <div className="mt-2 text-xs" style={{ color: adminPalette.textMuted }}>
                    {serviceCountByCategory.get(category.name) || 0} service{(serviceCountByCategory.get(category.name) || 0) === 1 ? '' : 's'}
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 border-t pt-3" style={{ borderColor: adminPalette.border }}>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEditCategoryModal(category)}>
                      Edit
                    </Button>
                    <Popconfirm title="Remove this category?" okText="Remove" onConfirm={() => handleDeleteCategory(category)}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        bordered={false}
        className="bo-enter bo-enter-2 rounded-2xl"
        styles={{ body: { padding: 24 } }}
        style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, border: `1px solid ${adminPalette.border}` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4" style={{ marginBottom: 20 }}>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: adminPalette.textMuted }}>
              Services
            </div>
            <div className="mt-1 text-[16px] font-semibold" style={{ color: adminPalette.ink }}>
              {services.length} service{services.length === 1 ? '' : 's'} in the catalog
            </div>
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
          pagination={{ pageSize: 8, showTotal: (total) => `${total} services` }}
          locale={{ emptyText: 'No services in the catalog yet.' }}
          className="bo-table"
          scroll={{ x: 760 }}
        />
      </Card>

      <Modal
        title={editingCategory ? 'Edit category' : 'Add service category'}
        open={categoryModalOpen}
        onCancel={() => setCategoryModalOpen(false)}
        onOk={() => categoryForm.submit()}
        confirmLoading={categorySaving}
        okText={editingCategory ? 'Save changes' : 'Add category'}
      >
        <Form form={categoryForm} layout="vertical" onFinish={handleSubmitCategory}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
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
