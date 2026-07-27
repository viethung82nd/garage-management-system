import { apiRequest } from '../../../shared/lib/api-client'

export type RepairOrderApiRecord = {
  _id: string
  status: string
  totalCost?: number
  startedAt?: string | null
  completedAt?: string | null
  quoteId?: string | null
  quotedTotal?: number | null
  vehicleId?: {
    _id: string
    licensePlate: string
    brand?: string
    model?: string
    year?: number
    chassisNumber?: string
    engineNumber?: string
    lastKnownMileage?: number | null
    customerId?: {
      _id: string
      fullName: string
      phone?: string
      email?: string
      accountType?: string
    }
  }
  advisorId?: {
    _id: string
    fullName: string
    phone?: string
  }
  services: Array<{
    name: string
    quantity: number
    priceAtTime: number
    kind?: 'service' | 'part' | 'labor'
    source?: 'quote' | 'additionalService'
    serviceId?: {
      _id?: string
      category?: string
    }
    /** Each line owns its own technician now — a repair order can have several, one per line. */
    technicianId?: {
      _id: string
      fullName: string
      phone?: string
    }
  }>
}

export type InvoiceApiRecord = {
  id: string
  displayId: string
  status: string
  issuedAt: string
  dueAt?: string | null
  sentAt?: string | null
  subtotal: number
  discount: number
  taxAmount: number
  total: number
  amountPaid: number
  balanceDue: number
  quoteId?: string | null
  quotedTotal?: number | null
  billing?: {
    customerName?: string | null
    taxCode?: string | null
    address?: string | null
    vehiclePlate?: string | null
    vehicleVin?: string | null
    odometer?: number | null
  } | null
  einvoice?: {
    status: string
    symbol?: string | null
    number?: string | null
    lookupCode?: string | null
    issuedAt?: string | null
  } | null
  lineItems: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    lineTotal: number
    kind: 'service' | 'part' | 'labor'
    source: 'quote' | 'additionalService'
  }>
  repairOrder: {
    id: string
    displayId: string
    status: string
    totalCost: number
    startedAt?: string | null
    completedAt?: string | null
    services: Array<{
      id: string
      name: string
      quantity: number
      priceAtTime: number
      category?: string
    }>
  } | null
  customer: {
    id: string
    fullName: string
    phone?: string
    email?: string
    accountType?: string
  } | null
  vehicle: {
    id: string
    licensePlate: string
    brand?: string
    model?: string
    year?: number | null
    color?: string
    chassisNumber?: string
    engineNumber?: string
    lastKnownMileage?: number | null
  } | null
  serviceAdvisor: {
    id: string
    fullName: string
    phone?: string
  } | null
  /** A repair order can have several technicians, one per service line — every distinct one billed on this invoice. */
  technicians: Array<{
    id: string
    fullName: string
    phone?: string
  }>
  latestPayment: {
    id: string
    amount: number
    method: string
    status: string
    paidAt?: string | null
    gatewayRef?: string | null
    reference?: string | null
  } | null
}

export type InvoiceListResponse = {
  invoices: InvoiceApiRecord[]
}

export type RepairOrderListResponse = RepairOrderApiRecord[]

export type InvoiceDetailResponse = {
  invoice: InvoiceApiRecord
  /** Only set on the response to sendInvoiceToCustomer() — whether the customer had an email on file to actually send to. */
  hasEmailOnFile?: boolean
}

export type PaymentResultResponse = {
  payment: {
    _id: string
    amount: number
    method: string
    status: string
    paidAt?: string | null
  }
  invoiceStatus: string
}

export function fetchAccountantInvoices(token: string) {
  return apiRequest<InvoiceListResponse>('/api/invoices', {
    method: 'GET',
    token,
  })
}

/** Orders ready to bill: they passed quality control and haven't been invoiced
 *  yet. Keyed off qcPassedAt, not a status string — QC now moves a passed order
 *  to readyForDelivery, so `status=completed` silently missed them. */
export function fetchCompletedRepairOrders(token: string) {
  return apiRequest<RepairOrderListResponse>('/api/repair-orders?readyToInvoice=true', {
    method: 'GET',
    token,
  })
}

export function fetchInvoiceDetail(token: string, invoiceId: string) {
  return apiRequest<InvoiceDetailResponse>(`/api/invoices/${invoiceId}`, {
    method: 'GET',
    token,
  })
}

export function fetchRepairOrderDetail(token: string, repairOrderId: string) {
  return apiRequest<RepairOrderApiRecord>(`/api/repair-orders/${repairOrderId}`, {
    method: 'GET',
    token,
  })
}

export function generateInvoice(token: string, repairOrderId: string, discount?: number) {
  return apiRequest<InvoiceDetailResponse>('/api/invoices', {
    method: 'POST',
    token,
    body: JSON.stringify({
      repairOrderId,
      // Omitted (not 0) unless the caller explicitly overrides — lets the
      // backend default to the order's quoted discount instead of always
      // being told "0".
      ...(discount !== undefined ? { discount } : {}),
    }),
  })
}

export function recordInvoicePayment(token: string, invoiceId: string, method: string, amount?: number, reference?: string) {
  return apiRequest<PaymentResultResponse>('/api/payments', {
    method: 'POST',
    token,
    body: JSON.stringify({
      invoiceId,
      method,
      ...(amount !== undefined ? { amount } : {}),
      ...(reference ? { reference } : {}),
    }),
  })
}

export function sendInvoiceToCustomer(token: string, invoiceId: string) {
  return apiRequest<InvoiceDetailResponse>(`/api/invoices/${invoiceId}/send`, {
    method: 'PATCH',
    token,
  })
}

/** Issue the legal e-invoice (demo mint — no real tax-authority call). */
export function issueEInvoice(token: string, invoiceId: string) {
  return apiRequest<InvoiceDetailResponse>(`/api/invoices/${invoiceId}/einvoice`, {
    method: 'POST',
    token,
  })
}

export type PaymentApiRecord = {
  _id: string
  amount: number
  method: string
  status: string
  paidAt?: string | null
  gatewayRef?: string | null
  reference?: string | null
  invoiceId: {
    _id: string
    total: number
    status: string
    issuedAt: string
  } | null
  customerId: {
    _id: string
    fullName: string
    phone?: string
  } | null
}

export type AuditLogEntry = {
  id: string
  action: 'invoiceGenerated' | 'invoiceSent' | 'paymentRecorded'
  actorName: string
  invoiceId: string | null
  invoiceDisplayId: string | null
  details: string
  createdAt: string
}

export function fetchPayments(token: string) {
  return apiRequest<{ payments: PaymentApiRecord[] }>('/api/payments', {
    method: 'GET',
    token,
  })
}

export function fetchAuditLogs(token: string) {
  return apiRequest<{ entries: AuditLogEntry[] }>('/api/audit-logs', {
    method: 'GET',
    token,
  })
}

export type QuoteApiRecord = {
  _id: string
  code?: string
  customerName?: string
  vehicleName?: string
  vehiclePlate?: string
  lines: Array<{
    description?: string
    kind: 'service' | 'part' | 'labor'
    quantity: number
    unitPrice: number
  }>
  discountPercent: number
  taxPercent: number
  totalEstimate: number
  status: string
  note?: string
}

export function fetchQuotationById(token: string, quoteId: string) {
  return apiRequest<QuoteApiRecord>(`/api/quotations/${quoteId}`, {
    method: 'GET',
    token,
  })
}
