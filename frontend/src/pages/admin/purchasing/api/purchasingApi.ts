import { apiRequest } from '../../../../shared/lib/api-client'

// ===== Suppliers =====

export type Supplier = {
  _id: string
  name: string
  code: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
  taxCode?: string
  paymentTermDays?: number
  leadTimeDays?: number
  notes?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export type SupplierPayload = {
  name: string
  code: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
  taxCode?: string
  paymentTermDays?: number
  leadTimeDays?: number
  notes?: string
}

/** GET /api/suppliers?isActive=&q= — defaults to active-only; pass isActive="all" to include retired vendors. */
export function fetchSuppliers(token: string, params?: { isActive?: string; q?: string }) {
  const search = new URLSearchParams()
  if (params?.isActive !== undefined) search.set('isActive', params.isActive)
  if (params?.q?.trim()) search.set('q', params.q.trim())
  const query = search.toString()
  return apiRequest<{ suppliers: Supplier[] }>(`/api/suppliers${query ? `?${query}` : ''}`, { method: 'GET', token })
}

export function createSupplier(token: string, payload: SupplierPayload) {
  return apiRequest<{ supplier: Supplier }>('/api/suppliers', { method: 'POST', token, body: JSON.stringify(payload) })
}

export function updateSupplier(token: string, id: string, payload: Partial<SupplierPayload>) {
  return apiRequest<{ supplier: Supplier }>(`/api/suppliers/${id}`, { method: 'PUT', token, body: JSON.stringify(payload) })
}

/** Soft delete — deactivates the supplier, it is never removed. */
export function deleteSupplier(token: string, id: string) {
  return apiRequest<{ message: string }>(`/api/suppliers/${id}`, { method: 'DELETE', token })
}

// ===== Parts (picker for PO lines) =====

export type PartOption = {
  _id: string
  name: string
  sku: string
  unitPrice: number
  costPrice?: number
}

/** GET /api/admin/parts?q= — only the fields a PO line picker needs. */
export function fetchPartOptions(token: string, q?: string) {
  const search = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
  return apiRequest<{ parts: PartOption[] }>(`/api/admin/parts${search}`, { method: 'GET', token })
}

// ===== Purchase orders =====

export type PurchaseOrderStatus = 'draft' | 'sent' | 'partiallyReceived' | 'received' | 'cancelled'
export type PurchaseOrderPaymentStatus = 'unpaid' | 'partiallyPaid' | 'paid'

export type PurchaseOrderLinePartRef = {
  _id: string
  name: string
  sku?: string
  unit?: string
}

export type PurchaseOrderLine = {
  partId: string | PurchaseOrderLinePartRef
  description?: string
  quantity: number
  unitCost: number
  receivedQuantity?: number
  repairOrderId?: string
}

export type PurchaseOrderSupplierRef = {
  _id: string
  name: string
  code: string
  contactName?: string
  phone?: string
  email?: string
  paymentTermDays?: number
}

export type PurchaseOrder = {
  _id: string
  code?: string
  supplierId: string | PurchaseOrderSupplierRef
  status: PurchaseOrderStatus
  lines: PurchaseOrderLine[]
  subtotal: number
  expectedAt?: string
  notes?: string
  createdBy?: string
  backorderForRepairOrderId?: string
  amountDue: number
  amountPaid: number
  paymentStatus: PurchaseOrderPaymentStatus
  dueAt?: string
  createdAt?: string
  updatedAt?: string
}

export type PurchaseOrderLineInput = {
  partId: string
  description?: string
  quantity: number
  unitCost: number
}

export type CreatePurchaseOrderPayload = {
  supplierId: string
  lines: PurchaseOrderLineInput[]
  expectedAt?: string
  notes?: string
  dueAt?: string
}

/** GET /api/purchase-orders?status=&supplierId= */
export function fetchPurchaseOrders(token: string, params?: { status?: string; supplierId?: string }) {
  const search = new URLSearchParams()
  if (params?.status && params.status !== 'all') search.set('status', params.status)
  if (params?.supplierId) search.set('supplierId', params.supplierId)
  const query = search.toString()
  return apiRequest<{ purchaseOrders: PurchaseOrder[] }>(`/api/purchase-orders${query ? `?${query}` : ''}`, {
    method: 'GET',
    token,
  })
}

export function fetchPurchaseOrderById(token: string, id: string) {
  return apiRequest<{ purchaseOrder: PurchaseOrder }>(`/api/purchase-orders/${id}`, { method: 'GET', token })
}

export function createPurchaseOrder(token: string, payload: CreatePurchaseOrderPayload) {
  return apiRequest<{ purchaseOrder: PurchaseOrder }>('/api/purchase-orders', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

/** POST /api/purchase-orders/:id/send — draft -> sent. */
export function sendPurchaseOrder(token: string, id: string) {
  return apiRequest<{ purchaseOrder: PurchaseOrder }>(`/api/purchase-orders/${id}/send`, { method: 'POST', token })
}

export type ReceiveGoodsPayload = {
  lines: Array<{ lineIndex: number; quantity: number }>
  note?: string
}

/** POST /api/purchase-orders/:id/receive — repeatable across partial deliveries. */
export function receiveGoods(token: string, id: string, payload: ReceiveGoodsPayload) {
  return apiRequest<{ purchaseOrder: PurchaseOrder }>(`/api/purchase-orders/${id}/receive`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

/** POST /api/purchase-orders/:id/cancel — rejected once anything has arrived. */
export function cancelPurchaseOrder(token: string, id: string) {
  return apiRequest<{ purchaseOrder: PurchaseOrder }>(`/api/purchase-orders/${id}/cancel`, { method: 'POST', token })
}

export type RecordSupplierPaymentPayload = {
  amount: number
  reference?: string
}

/** POST /api/purchase-orders/:id/payments */
export function recordSupplierPayment(token: string, id: string, payload: RecordSupplierPaymentPayload) {
  return apiRequest<{ purchaseOrder: PurchaseOrder }>(`/api/purchase-orders/${id}/payments`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

// ===== Reorder suggestions =====

export type ReorderSuggestion = {
  partId: string
  sku: string
  name: string
  stockQuantity: number
  reservedQuantity: number
  available: number
  reorderPoint: number
  maxStock?: number
  suggestedQuantity: number
  preferredSupplier: { _id: string; name: string; code: string; leadTimeDays?: number } | null
}

/** GET /api/purchase-orders/reorder-suggestions — active parts at/below their reorder point. */
export function fetchReorderSuggestions(token: string) {
  return apiRequest<{ suggestions: ReorderSuggestion[] }>('/api/purchase-orders/reorder-suggestions', {
    method: 'GET',
    token,
  })
}

// ===== Payables ageing =====

export type PayablesBucket = {
  current: number
  '0-30': number
  '31-60': number
  '61-90': number
  '90+': number
}

export type PayablesSupplierRow = {
  supplierId?: string
  supplierName: string
  supplierCode?: string
  outstanding: number
  buckets: PayablesBucket
  orders: Array<{ purchaseOrderId: string; code?: string; outstanding: number; dueAt?: string }>
}

/** GET /api/purchase-orders/payables — the report body IS the response (not wrapped in `report`). */
export type PayablesReport = {
  suppliers: PayablesSupplierRow[]
  totalOutstanding: number
}

export function fetchPayablesReport(token: string) {
  return apiRequest<PayablesReport>('/api/purchase-orders/payables', { method: 'GET', token })
}
