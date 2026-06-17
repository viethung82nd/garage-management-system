import { apiRequest } from '../../../../shared/lib/api-client'

export type AdminSummaryResponse = {
  bookings: {
    total: number
    today: number
    byStatus: Record<string, number>
  }
  revenue: {
    collected: number
    outstanding: number
    currency: string
  }
}

export type AdminBookingListResponse = {
  bookings: Array<{
    _id: string
    bookingDate: string
    timeSlot: string
    status: string
    source: string
    note?: string
    customerId?: {
      _id: string
      fullName: string
      accountType?: string
      role?: string
    }
    vehicleId?: {
      _id: string
      licensePlate: string
      brand?: string
      model?: string
      year?: number
    }
    serviceId?: {
      _id: string
      name: string
      basePrice?: number
    }
  }>
}

export function fetchAdminSummary(token: string) {
  return apiRequest<AdminSummaryResponse>('/api/admin/stats/summary', {
    method: 'GET',
    token,
  })
}

export function fetchAdminBookings(token: string) {
  return apiRequest<AdminBookingListResponse>('/api/bookings?limit=8', {
    method: 'GET',
    token,
  })
}
