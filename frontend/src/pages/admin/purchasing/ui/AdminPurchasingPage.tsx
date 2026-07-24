import { BankOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, ShoppingCartOutlined, TeamOutlined, WarningOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Spin, Table, Tabs, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../../../../shared/auth'
import { InlineBanner, useApiMessage } from '../../../../widgets/backoffice-shell'
import { AdminShell, adminPalette } from '../../ui/AdminShell'
import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  createSupplier,
  deleteSupplier,
  fetchPartOptions,
  fetchPayablesReport,
  fetchPurchaseOrderById,
  fetchPurchaseOrders,
  fetchReorderSuggestions,
  fetchSuppliers,
  receiveGoods,
  recordSupplierPayment,
  sendPurchaseOrder,
  updateSupplier,
  type CreatePurchaseOrderPayload,
  type PartOption,
  type PayablesReport,
  type PayablesSupplierRow,
  type PurchaseOrder,
  type PurchaseOrderLine,
  type PurchaseOrderPaymentStatus,
  type PurchaseOrderStatus,
  type ReorderSuggestion,
  type Supplier,
  type SupplierPayload,
} from '../api/purchasingApi'

function money(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(value || 0))} ₫`
}

function formatDate(value?: string) {
  if (!value) return '—'
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('DD MMM YYYY') : '—'
}

const STATUS_TAG: Record<PurchaseOrderStatus, { color: string; label: string }> = {
  draft: { color: 'default', label: 'Draft' },
  sent: { color: 'blue', label: 'Sent' },
  partiallyReceived: { color: 'gold', label: 'Partially received' },
  received: { color: 'green', label: 'Received' },
  cancelled: { color: 'red', label: 'Cancelled' },
}

const PAYMENT_TAG: Record<PurchaseOrderPaymentStatus, { color: string; label: string }> = {
  unpaid: { color: 'default', label: 'Unpaid' },
  partiallyPaid: { color: 'gold', label: 'Partially paid' },
  paid: { color: 'green', label: 'Paid' },
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'partiallyReceived', label: 'Partially received' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
]

function supplierName(ref: PurchaseOrder['supplierId']) {
  return typeof ref === 'string' ? ref : ref?.name || '—'
}

function partLabel(line: PurchaseOrderLine) {
  return typeof line.partId === 'object' ? `${line.partId.name}${line.partId.sku ? ` (${line.partId.sku})` : ''}` : line.description || '—'
}

function SectionCard({ children }: { children: ReactNode }) {
  return (
    <Card
      bordered={false}
      className="rounded-2xl"
      styles={{ body: { padding: 24 } }}
      style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, border: `1px solid ${adminPalette.border}` }}
    >
      {children}
    </Card>
  )
}

type PoFormValues = {
  supplierId: string
  expectedAt?: Dayjs
  notes?: string
  lines: Array<{ partId: string; quantity: number; unitCost: number }>
}

type PoPrefill = {
  supplierId?: string
  line?: { partId: string; quantity: number; unitCost: number }
}

export default function AdminPurchasingPage() {
  const { token } = useAuth()
  const { message, tone, showError, showSuccess, clear } = useApiMessage()

  // ===== Data =====
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [partOptions, setPartOptions] = useState<PartOption[]>([])
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([])
  const [payables, setPayables] = useState<PayablesReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // ===== Purchase orders tab =====
  const [statusFilter, setStatusFilter] = useState('all')
  const [poModalOpen, setPoModalOpen] = useState(false)
  const [savingPo, setSavingPo] = useState(false)
  const [poForm] = Form.useForm<PoFormValues>()
  const watchedLines = Form.useWatch('lines', poForm)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const [viewingPoId, setViewingPoId] = useState<string | null>(null)
  const [viewingPo, setViewingPo] = useState<PurchaseOrder | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [receiveModalOpen, setReceiveModalOpen] = useState(false)
  const [receiveQuantities, setReceiveQuantities] = useState<Record<number, number>>({})
  const [receiveNote, setReceiveNote] = useState('')
  const [receiving, setReceiving] = useState(false)

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentForm] = Form.useForm<{ amount: number; reference?: string }>()
  const [recordingPayment, setRecordingPayment] = useState(false)

  // ===== Suppliers tab =====
  const [supplierQuery, setSupplierQuery] = useState('')
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [savingSupplier, setSavingSupplier] = useState(false)
  const [retiringId, setRetiringId] = useState<string | null>(null)
  const [supplierForm] = Form.useForm<SupplierPayload>()

  useEffect(() => {
    if (!token) return
    let cancelled = false

    async function loadAll() {
      setIsLoading(true)
      clear()
      try {
        const [poRes, supplierRes, partRes, reorderRes, payablesRes] = await Promise.all([
          fetchPurchaseOrders(token!, {}),
          fetchSuppliers(token!, { isActive: 'all' }),
          fetchPartOptions(token!),
          fetchReorderSuggestions(token!),
          fetchPayablesReport(token!),
        ])
        if (cancelled) return
        setPurchaseOrders(poRes.purchaseOrders)
        setSuppliers(supplierRes.suppliers)
        setPartOptions(partRes.parts)
        setReorderSuggestions(reorderRes.suggestions)
        setPayables(payablesRes)
      } catch (error) {
        if (!cancelled) showError(error instanceof Error ? error.message : 'Unable to load purchasing data.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadAll()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function reloadPurchaseOrders() {
    if (!token) return
    setIsLoading(true)
    try {
      const res = await fetchPurchaseOrders(token, {})
      setPurchaseOrders(res.purchaseOrders)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to load purchase orders.')
    } finally {
      setIsLoading(false)
    }
  }

  async function refreshPayablesQuietly() {
    if (!token) return
    try {
      setPayables(await fetchPayablesReport(token))
    } catch {
      // best-effort background refresh — the main action already reported success
    }
  }

  async function refreshReorderQuietly() {
    if (!token) return
    try {
      const res = await fetchReorderSuggestions(token)
      setReorderSuggestions(res.suggestions)
    } catch {
      // best-effort background refresh
    }
  }

  function mergePoIntoList(id: string, updated: PurchaseOrder) {
    setPurchaseOrders((current) => current.map((po) => (po._id === id ? { ...po, ...updated, supplierId: po.supplierId } : po)))
  }

  const filteredOrders = useMemo(
    () => (statusFilter === 'all' ? purchaseOrders : purchaseOrders.filter((po) => po.status === statusFilter)),
    [purchaseOrders, statusFilter],
  )

  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.isActive !== false), [suppliers])
  const supplierSelectOptions = useMemo(
    () => activeSuppliers.map((s) => ({ value: s._id, label: `${s.name} (${s.code})` })),
    [activeSuppliers],
  )
  const partSelectOptions = useMemo(
    () => partOptions.map((p) => ({ value: p._id, label: `${p.name} — ${p.sku}` })),
    [partOptions],
  )
  const previewSubtotal = useMemo(
    () => (watchedLines ?? []).reduce((sum, line) => sum + (line?.quantity || 0) * (line?.unitCost || 0), 0),
    [watchedLines],
  )

  const filteredSuppliers = useMemo(() => {
    const q = supplierQuery.trim().toLowerCase()
    if (!q) return suppliers
    return suppliers.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
  }, [suppliers, supplierQuery])

  // ===== New purchase order =====

  function openCreatePoModal(prefill?: PoPrefill) {
    clear()
    poForm.resetFields()
    poForm.setFieldsValue({
      supplierId: prefill?.supplierId as string,
      lines: [prefill?.line ?? { quantity: 1, unitCost: 0 }] as PoFormValues['lines'],
    })
    setPoModalOpen(true)
  }

  function handlePartPick(fieldName: number, partId: string) {
    const part = partOptions.find((p) => p._id === partId)
    if (!part) return
    poForm.setFieldValue(['lines', fieldName, 'unitCost'], part.costPrice ?? part.unitPrice)
  }

  async function handleCreatePo(values: PoFormValues) {
    if (!token) return
    setSavingPo(true)
    try {
      const payload: CreatePurchaseOrderPayload = {
        supplierId: values.supplierId,
        lines: values.lines.map((line) => ({ partId: line.partId, quantity: line.quantity, unitCost: line.unitCost })),
        expectedAt: values.expectedAt ? values.expectedAt.format('YYYY-MM-DD') : undefined,
        notes: values.notes?.trim() || undefined,
      }
      const res = await createPurchaseOrder(token, payload)
      setPurchaseOrders((current) => [res.purchaseOrder, ...current])
      setPoModalOpen(false)
      showSuccess(`Purchase order ${res.purchaseOrder.code ?? ''} created.`)
      void refreshPayablesQuietly()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to create the purchase order.')
    } finally {
      setSavingPo(false)
    }
  }

  // ===== Detail + actions =====

  async function openDetail(id: string) {
    if (!token) return
    clear()
    setViewingPoId(id)
    setDetailLoading(true)
    try {
      const res = await fetchPurchaseOrderById(token, id)
      setViewingPo(res.purchaseOrder)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to load this purchase order.')
      setViewingPoId(null)
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setViewingPoId(null)
    setViewingPo(null)
  }

  async function handleSend(po: PurchaseOrder) {
    if (!token) return
    setSendingId(po._id)
    try {
      const res = await sendPurchaseOrder(token, po._id)
      mergePoIntoList(po._id, res.purchaseOrder)
      if (viewingPoId === po._id) void openDetail(po._id)
      showSuccess(`Purchase order ${po.code ?? ''} sent to the supplier.`)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to send this purchase order.')
    } finally {
      setSendingId(null)
    }
  }

  async function handleCancel(po: PurchaseOrder) {
    if (!token) return
    setCancellingId(po._id)
    try {
      const res = await cancelPurchaseOrder(token, po._id)
      mergePoIntoList(po._id, res.purchaseOrder)
      if (viewingPoId === po._id) void openDetail(po._id)
      showSuccess(`Purchase order ${po.code ?? ''} cancelled.`)
      void refreshPayablesQuietly()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to cancel this purchase order.')
    } finally {
      setCancellingId(null)
    }
  }

  function openReceiveModal() {
    if (!viewingPo) return
    const initial: Record<number, number> = {}
    viewingPo.lines.forEach((line, index) => {
      const remaining = line.quantity - (line.receivedQuantity || 0)
      if (remaining > 0) initial[index] = 0
    })
    setReceiveQuantities(initial)
    setReceiveNote('')
    setReceiveModalOpen(true)
  }

  async function handleReceiveSubmit() {
    if (!token || !viewingPo) return
    const lines = Object.entries(receiveQuantities)
      .map(([index, quantity]) => ({ lineIndex: Number(index), quantity }))
      .filter((line) => line.quantity > 0)

    if (lines.length === 0) {
      showError('Enter a quantity for at least one line.')
      return
    }

    setReceiving(true)
    try {
      const res = await receiveGoods(token, viewingPo._id, { lines, note: receiveNote.trim() || undefined })
      mergePoIntoList(viewingPo._id, res.purchaseOrder)
      setReceiveModalOpen(false)
      showSuccess('Goods received.')
      void openDetail(viewingPo._id)
      void refreshReorderQuietly()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to record the received goods.')
    } finally {
      setReceiving(false)
    }
  }

  function openPaymentModal() {
    if (!viewingPo) return
    paymentForm.resetFields()
    setPaymentModalOpen(true)
  }

  async function handleRecordPayment(values: { amount: number; reference?: string }) {
    if (!token || !viewingPo) return
    setRecordingPayment(true)
    try {
      const res = await recordSupplierPayment(token, viewingPo._id, values)
      mergePoIntoList(viewingPo._id, res.purchaseOrder)
      setPaymentModalOpen(false)
      showSuccess('Payment recorded.')
      void openDetail(viewingPo._id)
      void refreshPayablesQuietly()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to record this payment.')
    } finally {
      setRecordingPayment(false)
    }
  }

  // ===== Suppliers =====

  function openCreateSupplierModal() {
    clear()
    setEditingSupplier(null)
    supplierForm.resetFields()
    setSupplierModalOpen(true)
  }

  function openEditSupplierModal(supplier: Supplier) {
    clear()
    setEditingSupplier(supplier)
    supplierForm.setFieldsValue(supplier)
    setSupplierModalOpen(true)
  }

  async function handleSupplierSubmit(values: SupplierPayload) {
    if (!token) return
    setSavingSupplier(true)
    try {
      if (editingSupplier) {
        const res = await updateSupplier(token, editingSupplier._id, values)
        setSuppliers((current) => current.map((s) => (s._id === editingSupplier._id ? res.supplier : s)))
        showSuccess('Supplier updated.')
      } else {
        const res = await createSupplier(token, values)
        setSuppliers((current) => [res.supplier, ...current])
        showSuccess('Supplier added.')
      }
      setSupplierModalOpen(false)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to save this supplier.')
    } finally {
      setSavingSupplier(false)
    }
  }

  async function handleRetireSupplier(supplier: Supplier) {
    if (!token) return
    setRetiringId(supplier._id)
    try {
      await deleteSupplier(token, supplier._id)
      setSuppliers((current) => current.map((s) => (s._id === supplier._id ? { ...s, isActive: false } : s)))
      showSuccess('Supplier retired.')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to retire this supplier.')
    } finally {
      setRetiringId(null)
    }
  }

  // ===== Columns =====

  const poColumns: ColumnsType<PurchaseOrder> = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 150, render: (v?: string) => v || '—' },
    { title: 'Supplier', key: 'supplier', render: (_, po) => supplierName(po.supplierId) },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (v: PurchaseOrderStatus) => <Tag color={STATUS_TAG[v].color}>{STATUS_TAG[v].label}</Tag>,
    },
    {
      title: 'Payment',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 140,
      render: (v: PurchaseOrderPaymentStatus) => <Tag color={PAYMENT_TAG[v].color}>{PAYMENT_TAG[v].label}</Tag>,
    },
    { title: 'Total', dataIndex: 'subtotal', key: 'subtotal', render: (v: number) => money(v) },
    {
      title: 'Outstanding',
      key: 'outstanding',
      render: (_, po) => money(Math.max(0, (po.amountDue || 0) - (po.amountPaid || 0))),
    },
    { title: 'Expected', dataIndex: 'expectedAt', key: 'expectedAt', render: (v?: string) => formatDate(v) },
    {
      title: 'Action',
      key: 'action',
      width: 90,
      render: (_, po) => (
        <Button size="small" onClick={() => void openDetail(po._id)}>
          View
        </Button>
      ),
    },
  ]

  const lineColumns: ColumnsType<PurchaseOrderLine> = [
    { title: 'Part', key: 'part', render: (_, line) => partLabel(line) },
    { title: 'Ordered', dataIndex: 'quantity', key: 'quantity', width: 90 },
    { title: 'Received', key: 'received', width: 90, render: (_, line) => line.receivedQuantity || 0 },
    { title: 'Remaining', key: 'remaining', width: 100, render: (_, line) => line.quantity - (line.receivedQuantity || 0) },
    { title: 'Unit cost', dataIndex: 'unitCost', key: 'unitCost', render: (v: number) => money(v) },
    { title: 'Line total', key: 'total', render: (_, line) => money(line.quantity * line.unitCost) },
  ]

  const supplierColumns: ColumnsType<Supplier> = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Code', dataIndex: 'code', key: 'code', width: 110 },
    { title: 'Contact', dataIndex: 'contactName', key: 'contactName', render: (v?: string) => v || '—' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (v?: string) => v || '—' },
    {
      title: 'Terms',
      key: 'terms',
      render: (_, s) => `Net ${s.paymentTermDays ?? 30}d${s.leadTimeDays ? ` · ${s.leadTimeDays}d lead` : ''}`,
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, s) => (s.isActive === false ? <Tag>Retired</Tag> : <Tag color="green">Active</Tag>),
    },
    {
      title: 'Action',
      key: 'action',
      width: 160,
      render: (_, s) => (
        <div className="flex items-center gap-2">
          <Button size="small" onClick={() => openEditSupplierModal(s)}>
            Edit
          </Button>
          {s.isActive !== false ? (
            <Popconfirm title="Retire this supplier?" okText="Retire" onConfirm={() => handleRetireSupplier(s)}>
              <Button size="small" danger loading={retiringId === s._id}>
                Retire
              </Button>
            </Popconfirm>
          ) : null}
        </div>
      ),
    },
  ]

  const reorderColumns: ColumnsType<ReorderSuggestion> = [
    { title: 'Part', key: 'part', render: (_, r) => `${r.name} (${r.sku})` },
    { title: 'On hand', dataIndex: 'stockQuantity', key: 'stockQuantity', width: 90 },
    { title: 'Available', dataIndex: 'available', key: 'available', width: 90 },
    { title: 'Reorder point', dataIndex: 'reorderPoint', key: 'reorderPoint', width: 110 },
    { title: 'Suggested qty', dataIndex: 'suggestedQuantity', key: 'suggestedQuantity', width: 110 },
    { title: 'Preferred supplier', key: 'preferredSupplier', render: (_, r) => r.preferredSupplier?.name || '—' },
    {
      title: 'Action',
      key: 'action',
      width: 110,
      render: (_, r) => (
        <Button
          size="small"
          onClick={() =>
            openCreatePoModal({
              supplierId: r.preferredSupplier?._id,
              line: {
                partId: r.partId,
                quantity: r.suggestedQuantity,
                unitCost: partOptions.find((p) => p._id === r.partId)?.costPrice ?? partOptions.find((p) => p._id === r.partId)?.unitPrice ?? 0,
              },
            })
          }
        >
          Create PO
        </Button>
      ),
    },
  ]

  const payablesColumns: ColumnsType<PayablesSupplierRow> = [
    { title: 'Supplier', key: 'supplier', render: (_, r) => `${r.supplierName}${r.supplierCode ? ` (${r.supplierCode})` : ''}` },
    { title: 'Current', key: 'current', align: 'right', render: (_, r) => money(r.buckets.current) },
    { title: '0–30d', key: 'd0_30', align: 'right', render: (_, r) => money(r.buckets['0-30']) },
    { title: '31–60d', key: 'd31_60', align: 'right', render: (_, r) => money(r.buckets['31-60']) },
    { title: '61–90d', key: 'd61_90', align: 'right', render: (_, r) => money(r.buckets['61-90']) },
    {
      title: '90d+',
      key: 'd90_plus',
      align: 'right',
      render: (_, r) => <span style={{ color: r.buckets['90+'] > 0 ? adminPalette.red : undefined }}>{money(r.buckets['90+'])}</span>,
    },
    {
      title: 'Outstanding',
      key: 'outstanding',
      align: 'right',
      render: (_, r) => <strong>{money(r.outstanding)}</strong>,
    },
  ]

  const outstandingOnDetail = viewingPo ? Math.max(0, (viewingPo.amountDue || 0) - (viewingPo.amountPaid || 0)) : 0
  const anyReceivedOnDetail = viewingPo ? viewingPo.lines.some((line) => (line.receivedQuantity || 0) > 0) : false

  return (
    <AdminShell eyebrow="Admin" title="Purchasing">
      <div className="flex flex-col gap-5">
        {message ? <InlineBanner tone={tone}>{message}</InlineBanner> : null}

        <Tabs
          type="card"
          className="bo-enter"
          items={[
            {
              key: 'orders',
              label: (
                <span className="flex items-center gap-2 px-1">
                  <ShoppingCartOutlined /> Purchase orders
                </span>
              ),
              children: (
                <SectionCard>
                  <div className="flex flex-wrap items-center justify-between gap-4" style={{ marginBottom: 20 }}>
                    <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTER_OPTIONS} style={{ width: 220 }} />
                    <div className="flex items-center gap-2">
                      <Button icon={<ReloadOutlined />} onClick={() => void reloadPurchaseOrders()} loading={isLoading}>
                        Refresh
                      </Button>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreatePoModal()}>
                        New PO
                      </Button>
                    </div>
                  </div>

                  <Table
                    rowKey="_id"
                    columns={poColumns}
                    dataSource={filteredOrders}
                    loading={isLoading}
                    pagination={{ pageSize: 8, hideOnSinglePage: true }}
                    locale={{ emptyText: 'No purchase orders yet.' }}
                    className="bo-table"
                    scroll={{ x: 960 }}
                  />
                </SectionCard>
              ),
            },
            {
              key: 'suppliers',
              label: (
                <span className="flex items-center gap-2 px-1">
                  <TeamOutlined /> Suppliers
                </span>
              ),
              children: (
                <SectionCard>
                  <div className="flex flex-wrap items-center justify-between gap-4" style={{ marginBottom: 20 }}>
                    <Input
                      allowClear
                      prefix={<SearchOutlined style={{ color: adminPalette.textMuted }} />}
                      placeholder="Search by name or code"
                      value={supplierQuery}
                      onChange={(event) => setSupplierQuery(event.target.value)}
                      style={{ maxWidth: 320 }}
                    />
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateSupplierModal}>
                      Add supplier
                    </Button>
                  </div>

                  <Table
                    rowKey="_id"
                    columns={supplierColumns}
                    dataSource={filteredSuppliers}
                    loading={isLoading}
                    pagination={{ pageSize: 8, hideOnSinglePage: true }}
                    locale={{ emptyText: 'No suppliers yet.' }}
                    className="bo-table"
                    scroll={{ x: 760 }}
                  />
                </SectionCard>
              ),
            },
            {
              key: 'reorder',
              label: (
                <span className="flex items-center gap-2 px-1">
                  <WarningOutlined /> Reorder suggestions
                </span>
              ),
              children: (
                <SectionCard>
                  <Table
                    rowKey="partId"
                    columns={reorderColumns}
                    dataSource={reorderSuggestions}
                    loading={isLoading}
                    pagination={{ pageSize: 8, hideOnSinglePage: true }}
                    locale={{ emptyText: 'No parts are at or below their reorder point.' }}
                    className="bo-table"
                    scroll={{ x: 760 }}
                  />
                </SectionCard>
              ),
            },
            {
              key: 'payables',
              label: (
                <span className="flex items-center gap-2 px-1">
                  <BankOutlined /> Payables ageing
                </span>
              ),
              children: (
                <Card
                  bordered={false}
                  className="rounded-2xl"
                  title="Outstanding by supplier"
                  extra={
                    payables ? (
                      <span style={{ color: adminPalette.textMuted, fontSize: 13 }}>
                        Total outstanding: <strong style={{ color: adminPalette.ink }}>{money(payables.totalOutstanding)}</strong>
                      </span>
                    ) : null
                  }
                  styles={{ body: { padding: 0 } }}
                  style={{ background: adminPalette.panel, boxShadow: adminPalette.shadow, border: `1px solid ${adminPalette.border}` }}
                >
                  <Table
                    rowKey={(r, index) => r.supplierId || `unknown-${index}`}
                    columns={payablesColumns}
                    dataSource={payables?.suppliers ?? []}
                    loading={isLoading}
                    pagination={{ pageSize: 8, hideOnSinglePage: true }}
                    locale={{ emptyText: 'No outstanding payables — every supplier is settled up.' }}
                    className="bo-table"
                    scroll={{ x: 760 }}
                  />
                </Card>
              ),
            },
          ]}
        />
      </div>

      {/* New purchase order */}
      <Modal
        title="New purchase order"
        open={poModalOpen}
        onCancel={() => setPoModalOpen(false)}
        onOk={() => poForm.submit()}
        confirmLoading={savingPo}
        okText="Create order"
        width={680}
      >
        <Form form={poForm} layout="vertical" onFinish={handleCreatePo}>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="supplierId" label="Supplier" rules={[{ required: true, message: 'Required' }]}>
              <Select showSearch optionFilterProp="label" options={supplierSelectOptions} />
            </Form.Item>
            <Form.Item name="expectedAt" label="Expected delivery">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item label="Lines" required style={{ marginBottom: 8 }}>
            <div className="mb-1 grid grid-cols-[1fr_90px_140px_32px] gap-2 text-xs font-semibold" style={{ color: adminPalette.textMuted }}>
              <span>Part</span>
              <span>Qty</span>
              <span>Unit cost</span>
              <span />
            </div>
            <Form.List name="lines">
              {(fields, { add, remove }) => (
                <div className="flex flex-col gap-2">
                  {fields.map((field) => (
                    <div key={field.key} className="grid grid-cols-[1fr_90px_140px_32px] items-start gap-2">
                      <Form.Item {...field} name={[field.name, 'partId']} rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 0 }}>
                        <Select showSearch optionFilterProp="label" options={partSelectOptions} onChange={(value: string) => handlePartPick(field.name, value)} />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, 'quantity']} rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 0 }}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, 'unitCost']} rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 0 }}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} disabled={fields.length === 1} />
                    </div>
                  ))}
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ quantity: 1, unitCost: 0 })} style={{ width: 160 }}>
                    Add line
                  </Button>
                </div>
              )}
            </Form.List>
          </Form.Item>

          <div className="flex justify-end text-sm font-semibold" style={{ color: adminPalette.ink, marginBottom: 12 }}>
            Subtotal: {money(previewSubtotal)}
          </div>

          <Form.Item name="notes" label="Notes" style={{ marginBottom: 0 }}>
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Purchase order detail */}
      <Modal title={viewingPo ? `Purchase order ${viewingPo.code ?? ''}` : 'Purchase order'} open={Boolean(viewingPoId)} onCancel={closeDetail} footer={null} width={780}>
        {detailLoading || !viewingPo ? (
          <div className="flex justify-center" style={{ padding: '40px 0' }}>
            <Spin />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Tag color={STATUS_TAG[viewingPo.status].color}>{STATUS_TAG[viewingPo.status].label}</Tag>
              <Tag color={PAYMENT_TAG[viewingPo.paymentStatus].color}>{PAYMENT_TAG[viewingPo.paymentStatus].label}</Tag>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div style={{ color: adminPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Supplier</div>
                <div style={{ color: adminPalette.ink, fontWeight: 600 }}>{supplierName(viewingPo.supplierId)}</div>
                {typeof viewingPo.supplierId === 'object' ? (
                  <div style={{ color: adminPalette.textMuted }}>{[viewingPo.supplierId.contactName, viewingPo.supplierId.phone].filter(Boolean).join(' · ') || '—'}</div>
                ) : null}
              </div>
              <div>
                <div style={{ color: adminPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Dates</div>
                <div>Expected: {formatDate(viewingPo.expectedAt)}</div>
                <div>Due: {formatDate(viewingPo.dueAt)}</div>
              </div>
            </div>

            <Table
              size="small"
              pagination={false}
              rowKey={(_, index) => String(index ?? 0)}
              dataSource={viewingPo.lines}
              columns={lineColumns}
              className="bo-table"
              scroll={{ x: 640 }}
            />

            <div className="flex flex-wrap justify-end gap-6 text-sm">
              <div>
                Subtotal <strong>{money(viewingPo.subtotal)}</strong>
              </div>
              <div>
                Paid <strong>{money(viewingPo.amountPaid)}</strong>
              </div>
              <div>
                Outstanding <strong style={{ color: outstandingOnDetail > 0 ? adminPalette.red : adminPalette.green }}>{money(outstandingOnDetail)}</strong>
              </div>
            </div>

            {viewingPo.notes ? (
              <div>
                <div style={{ color: adminPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Notes</div>
                <div>{viewingPo.notes}</div>
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2" style={{ borderTop: `1px solid ${adminPalette.border}`, paddingTop: 12 }}>
              {viewingPo.status === 'draft' ? (
                <Popconfirm title="Send this order to the supplier?" okText="Send" onConfirm={() => handleSend(viewingPo)}>
                  <Button loading={sendingId === viewingPo._id}>Send</Button>
                </Popconfirm>
              ) : null}
              {viewingPo.status === 'sent' || viewingPo.status === 'partiallyReceived' ? <Button onClick={openReceiveModal}>Receive goods</Button> : null}
              {viewingPo.paymentStatus !== 'paid' && viewingPo.status !== 'cancelled' ? <Button onClick={openPaymentModal}>Record payment</Button> : null}
              {viewingPo.status !== 'cancelled' && !anyReceivedOnDetail ? (
                <Popconfirm title="Cancel this purchase order?" okText="Cancel order" okButtonProps={{ danger: true }} onConfirm={() => handleCancel(viewingPo)}>
                  <Button danger loading={cancellingId === viewingPo._id}>
                    Cancel order
                  </Button>
                </Popconfirm>
              ) : null}
            </div>
          </div>
        )}
      </Modal>

      {/* Receive goods */}
      <Modal
        title={viewingPo ? `Receive goods — ${viewingPo.code ?? ''}` : 'Receive goods'}
        open={receiveModalOpen}
        onCancel={() => setReceiveModalOpen(false)}
        onOk={() => void handleReceiveSubmit()}
        confirmLoading={receiving}
        okText="Record receipt"
        width={620}
      >
        {viewingPo ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-[1fr_80px_80px_120px] gap-2 text-xs font-semibold" style={{ color: adminPalette.textMuted }}>
              <span>Part</span>
              <span>Ordered</span>
              <span>Remaining</span>
              <span>Receive qty</span>
            </div>
            {viewingPo.lines.map((line, index) => {
              const remaining = line.quantity - (line.receivedQuantity || 0)
              if (remaining <= 0) return null
              return (
                <div key={index} className="grid grid-cols-[1fr_80px_80px_120px] items-center gap-2">
                  <span>{partLabel(line)}</span>
                  <span>{line.quantity}</span>
                  <span>{remaining}</span>
                  <InputNumber
                    min={0}
                    max={remaining}
                    value={receiveQuantities[index] ?? 0}
                    onChange={(value) => setReceiveQuantities((current) => ({ ...current, [index]: Number(value) || 0 }))}
                    style={{ width: '100%' }}
                  />
                </div>
              )
            })}
            <Form.Item label="Note" style={{ marginTop: 8, marginBottom: 0 }}>
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 3 }} value={receiveNote} onChange={(event) => setReceiveNote(event.target.value)} />
            </Form.Item>
          </div>
        ) : null}
      </Modal>

      {/* Record payment */}
      <Modal
        title={viewingPo ? `Record payment — ${viewingPo.code ?? ''}` : 'Record payment'}
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        onOk={() => paymentForm.submit()}
        confirmLoading={recordingPayment}
        okText="Record payment"
      >
        <Form form={paymentForm} layout="vertical" onFinish={handleRecordPayment}>
          <Form.Item name="amount" label="Amount (VND)" rules={[{ required: true, message: 'Required' }]}>
            <InputNumber min={1} max={outstandingOnDetail || undefined} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reference" label="Reference">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add / edit supplier */}
      <Modal
        title={editingSupplier ? 'Edit supplier' : 'Add supplier'}
        open={supplierModalOpen}
        onCancel={() => setSupplierModalOpen(false)}
        onOk={() => supplierForm.submit()}
        confirmLoading={savingSupplier}
        okText={editingSupplier ? 'Save changes' : 'Add supplier'}
      >
        <Form form={supplierForm} layout="vertical" onFinish={handleSupplierSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Required' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="code" label="Code" rules={[{ required: true, message: 'Required' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="contactName" label="Contact name">
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="Phone">
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input />
            </Form.Item>
            <Form.Item name="taxCode" label="Tax code">
              <Input />
            </Form.Item>
            <Form.Item name="paymentTermDays" label="Payment terms (days)">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="leadTimeDays" label="Lead time (days)">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="address" label="Address">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Notes" style={{ marginBottom: 0 }}>
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </Form>
      </Modal>
    </AdminShell>
  )
}
