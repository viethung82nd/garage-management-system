import { apiRequest } from '../../../shared/lib/api-client'
import type { AuthUser } from '../../../shared/auth'

export type CustomerBookingApiRecord = {
  _id: string
  bookingDate: string
  timeSlot: string
  source: string
  status: string
  note?: string
  customerId?: {
    _id: string
    fullName: string
    phone?: string
    email?: string
    accountType?: string
  }
  vehicleId?: {
    _id: string
    licensePlate: string
    brand?: string
    model?: string
    year?: number
    chassisNumber?: string
    engineNumber?: string
    color?: string
  }
  serviceId?: {
    _id: string
    name: string
    basePrice?: number
    estimatedDuration?: number
  }
  advisorId?: {
    _id: string
    fullName: string
    role?: string
  }
}

export type CustomerRepairOrderApiRecord = {
  _id: string
  status: string
  totalCost?: number
  startedAt?: string | null
  completedAt?: string | null
  stepNotes: Array<{
    content: string
    createdAt?: string
  }>
  inspectionId?: {
    _id: string
    findings?: string
    photos?: string[]
  } | null
  vehicleId?: {
    _id: string
    licensePlate: string
    brand?: string
    model?: string
    year?: number
    color?: string
    chassisNumber?: string
    engineNumber?: string
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

export type CustomerInvoiceApiRecord = {
  id: string
  displayId: string
  status: string
  issuedAt: string
  subtotal: number
  discount: number
  taxAmount: number
  total: number
  amountPaid: number
  balanceDue: number
  lineItems: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    lineTotal: number
    kind: 'service' | 'part' | 'labor'
    source: 'quote' | 'additionalService'
  }>
  accountant: {
    id: string
    fullName: string
    email?: string
    phone?: string
  } | null
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

export function fetchCustomerBookings(token: string) {
  return apiRequest<{ bookings: CustomerBookingApiRecord[] }>('/api/bookings/mine', {
    method: 'GET',
    token,
  })
}

export function fetchCustomerRepairOrders(token: string) {
  return apiRequest<CustomerRepairOrderApiRecord[]>('/api/repair-orders/mine', {
    method: 'GET',
    token,
  })
}

export function fetchCustomerInvoices(token: string) {
  return apiRequest<{ invoices: CustomerInvoiceApiRecord[] }>('/api/invoices/mine', {
    method: 'GET',
    token,
  })
}

export type UpdateCustomerProfilePayload = {
  fullName: string
  phone?: string
  email?: string
  dateOfBirth?: string
}

export function updateCustomerProfile(token: string, payload: UpdateCustomerProfilePayload) {
  return apiRequest<{ user: AuthUser }>('/api/auth/me', {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  })
}

export function deleteCustomerAccount(token: string) {
  return apiRequest<{ message: string }>('/api/auth/me', {
    method: 'DELETE',
    token,
  })
}
