import { apiRequest } from '../../../shared/lib/api-client'

export type RepairOrderApiRecord = {
  _id: string
  status: string
  totalCost?: number
  startedAt?: string | null
  completedAt?: string | null
  vehicleId?: {
    _id: string
    licensePlate: string
    brand?: string
    model?: string
    year?: number
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
  technicianId?: {
    _id: string
    fullName: string
    phone?: string
  }
  services: Array<{
    name: string
    quantity: number
    priceAtTime: number
    serviceId?: {
      _id?: string
      category?: string
    }
  }>
}

export type InvoiceApiRecord = {
  id: string
  displayId: string
  status: string
  issuedAt: string
  subtotal: number
  discount: number
  total: number
  lineItems: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    lineTotal: number
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
  } | null
  serviceAdvisor: {
    id: string
    fullName: string
    phone?: string
  } | null
  technician: {
    id: string
    fullName: string
    phone?: string
  } | null
  latestPayment: {
    id: string
    amount: number
    method: string
    status: string
    paidAt?: string | null
    gatewayRef?: string | null
  } | null
}

export type InvoiceListResponse = {
  invoices: InvoiceApiRecord[]
}

export type RepairOrderListResponse = RepairOrderApiRecord[]

export type InvoiceDetailResponse = {
  invoice: InvoiceApiRecord
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

export function fetchCompletedRepairOrders(token: string) {
  return apiRequest<RepairOrderListResponse>('/api/repair-orders?status=completed', {
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

export function generateInvoice(token: string, repairOrderId: string, discount = 0) {
  return apiRequest<InvoiceDetailResponse>('/api/invoices', {
    method: 'POST',
    token,
    body: JSON.stringify({
      repairOrderId,
      discount,
    }),
  })
}

export function recordInvoicePayment(token: string, invoiceId: string, method: string) {
  return apiRequest<PaymentResultResponse>('/api/payments', {
    method: 'POST',
    token,
    body: JSON.stringify({
      invoiceId,
      method,
    }),
  })
}
