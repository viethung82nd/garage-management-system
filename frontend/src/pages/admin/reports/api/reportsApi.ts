import { apiRequest } from '../../../../shared/lib/api-client'

export type RevenueByService = {
  serviceId: string
  serviceName?: string
  orderCount: number
  revenue: number
}

export type RevenueByPaymentMethod = {
  method: string
  count: number
  amount: number
}

export type TechnicianPerformance = {
  technicianId: string
  technicianName?: string | null
  orderCount: number
  completionRate: number
  avgTime: number
  revenue: number
}

export type RevenueReport = {
  period: string
  startDate: string
  endDate: string
  totalRevenue: number
  totalOrders: number
  totalInvoices: number
  byService: RevenueByService[]
  byPaymentMethod: RevenueByPaymentMethod[]
  byTechnician: TechnicianPerformance[]
  currency: string
  generatedAt: string
}

/** GET /api/admin/reports/revenue — revenue + technician breakdown for a date range. */
export function fetchRevenueReport(token: string, startDate: string, endDate: string) {
  const query = new URLSearchParams({ startDate, endDate }).toString()
  return apiRequest<{ report: RevenueReport }>(`/api/admin/reports/revenue?${query}`, { token })
}
