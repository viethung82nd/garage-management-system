import { apiRequest } from '../../../shared/lib/api-client'
import type { AuthUser } from '../../../shared/auth'

export type CustomerBookingApiRecord = {
  _id: string
  bookingDate: string
  timeSlot: string
  source: string
  status: string
  note?: string
  // Set once a service advisor has received this booking's vehicle — at
  // that point it's a repair order, not an outstanding appointment, and
  // can no longer be self-cancelled.
  repairOrderId?: string
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
    lastKnownMileage?: number | null
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
  } | null
}

export function fetchCustomerBookings(token: string) {
  return apiRequest<{ bookings: CustomerBookingApiRecord[] }>('/api/bookings/mine', {
    method: 'GET',
    token,
  })
}

export function cancelCustomerBooking(token: string, id: string, reason?: string) {
  return apiRequest<{ booking: CustomerBookingApiRecord }>(`/api/bookings/${id}/cancel`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ reason }),
  })
}

export function fetchCustomerRepairOrders(token: string) {
  return apiRequest<CustomerRepairOrderApiRecord[]>('/api/repair-orders/mine', {
    method: 'GET',
    token,
  })
}

export type CustomerVehicleRecord = {
  _id: string
  licensePlate: string
  brand?: string
  model?: string
  year?: number
  color?: string
  chassisNumber?: string
  engineNumber?: string
  lastKnownMileage?: number | null
  photo?: string | null
  lastInspectedAt?: string | null
}

export function fetchCustomerVehicles(token: string) {
  return apiRequest<{ vehicles: CustomerVehicleRecord[] }>('/api/vehicles/mine', {
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
  fullName?: string
  phone?: string
  email?: string
  dateOfBirth?: string
  currentPassword?: string
  newPassword?: string
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
