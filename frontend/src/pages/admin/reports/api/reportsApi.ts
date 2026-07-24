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

// ===== Phase 4: profit, receivables, KPIs =====

export type ProfitStream = {
  revenue: number
  cost: number
  profit: number
  marginPercent: number
}

export type GrossProfitReport = {
  startDate: string
  endDate: string
  currency: string
  parts: ProfitStream
  labor: ProfitStream
  total: ProfitStream
}

/** GET /api/admin/reports/gross-profit — margin split by labour vs parts. */
export function fetchGrossProfitReport(token: string, startDate: string, endDate: string) {
  const query = new URLSearchParams({ startDate, endDate }).toString()
  return apiRequest<{ report: GrossProfitReport }>(`/api/admin/reports/gross-profit?${query}`, { token })
}

export type ReceivablesCustomerRow = {
  customerId: string
  customerName: string | null
  current: number
  d1_30: number
  d31_60: number
  d61_90: number
  d90_plus: number
  outstanding: number
  invoiceCount: number
}

export type ReceivablesReport = {
  generatedAt: string
  currency: string
  totals: {
    current: number
    d1_30: number
    d31_60: number
    d61_90: number
    d90_plus: number
    outstanding: number
  }
  byCustomer: ReceivablesCustomerRow[]
}

/** GET /api/admin/reports/receivables — outstanding balances by customer + ageing. */
export function fetchReceivablesReport(token: string) {
  return apiRequest<{ report: ReceivablesReport }>('/api/admin/reports/receivables', { token })
}

export type WorkshopKpis = {
  startDate: string
  endDate: string
  currency: string
  aro: number
  effectiveLaborRate: number
  laborHoursSold: number
  carCount: number
  ordersOpened: number
  ordersCompleted: number
  carryOverRate: number
  reworkRate: number
}

/** GET /api/admin/reports/kpis — workshop KPIs for a date range. */
export function fetchWorkshopKpis(token: string, startDate: string, endDate: string) {
  const query = new URLSearchParams({ startDate, endDate }).toString()
  return apiRequest<{ report: WorkshopKpis }>(`/api/admin/reports/kpis?${query}`, { token })
}
