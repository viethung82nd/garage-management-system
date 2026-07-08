import { apiRequest } from '../lib/api-client'
import type { AuthUser } from '../auth'

export type ApiVehicle = {
  _id?: string
  id?: string
  licensePlate?: string
  plate?: string
  brand?: string
  model?: string
  year?: number | string
  customerId?: AuthUser
  customer?: AuthUser
  vin?: string
  chassisNumber?: string
  engineNumber?: string
}

export type ApiService = {
  _id?: string
  id?: string
  name?: string
  category?: string
  basePrice?: number
  price?: number
  estimatedDuration?: number
}

export type ApiBooking = {
  _id?: string
  id?: string
  customerId?: AuthUser
  customer?: AuthUser
  vehicleId?: ApiVehicle
  vehicle?: ApiVehicle
  serviceId?: ApiService
  service?: ApiService
  advisorId?: AuthUser
  advisor?: AuthUser
  bookingDate?: string
  date?: string
  timeSlot?: string
  time?: string
  status?: string
  note?: string
}

export type ApiRepairOrder = {
  _id?: string
  id?: string
  code?: string
  vehicleId?: ApiVehicle
  vehicle?: ApiVehicle
  customer?: AuthUser
  advisorId?: AuthUser
  advisor?: AuthUser
  technicianId?: AuthUser
  technician?: AuthUser
  services?: Array<{ serviceId?: ApiService | string; name?: string; quantity?: number; priceAtTime?: number }>
  stepNotes?: Array<{ content?: string; technicianId?: AuthUser | string; createdAt?: string }>
  status?: string
  totalCost?: number
  startedAt?: string
  completedAt?: string
  promisedAt?: string
  updatedAt?: string
  createdAt?: string
}

export type ApiTechnician = AuthUser & {
  bay?: string
  skill?: string
  status?: 'available' | 'busy' | 'off' | string
  activeOrders?: number
}

export type ApiAdditionalServiceProposal = {
  _id?: string
  id?: string
  repairOrderId?: string
  serviceName?: string
  affectedPart?: string
  reason?: string
  customerImpact?: string
  laborCost?: number
  partsCost?: number
  estimateMinutes?: number
  evidenceCount?: number
  priority?: 'high' | 'medium' | 'low'
  status?: 'pending' | 'sent' | 'approved' | 'rejected'
  technician?: AuthUser | string
}

export type ApiDashboardSummary = {
  pendingBookings?: number
  todayReceptions?: number
  openRepairOrders?: number
  waitingCustomers?: number
  queue?: Array<{
    customer?: string
    meta?: string
    status?: string
    to?: string
  }>
}

export type ReceptionPayload = Record<string, string>

export function fetchAdvisorDashboard(token: string) {
  return apiRequest<ApiDashboardSummary>('/api/advisor/dashboard', { token })
}

export function fetchWorkshopBookings(token: string, query = '') {
  return apiRequest<{ bookings?: ApiBooking[] } | ApiBooking[]>(`/api/bookings${query}`, { token })
}

export function confirmWorkshopBooking(token: string, id: string) {
  return apiRequest<{ booking?: ApiBooking } | ApiBooking>(`/api/bookings/${id}/confirm`, { method: 'PATCH', token, body: JSON.stringify({}) })
}

export function rejectWorkshopBooking(token: string, id: string, reason = 'Rejected by service advisor') {
  return apiRequest<{ booking?: ApiBooking } | ApiBooking>(`/api/bookings/${id}/cancel`, { method: 'PATCH', token, body: JSON.stringify({ reason }) })
}

export function fetchVehicleHistory(token: string, plate?: string) {
  const query = plate ? `?plate=${encodeURIComponent(plate)}` : ''
  return apiRequest<{ suggestions?: unknown[] } | unknown[]>(`/api/receptions/history${query}`, { token })
}

export function createVehicleReception(token: string, payload: ReceptionPayload) {
  return apiRequest('/api/receptions', { method: 'POST', token, body: JSON.stringify(payload) })
}

export function fetchWorkshopRepairOrders(token: string, query = '') {
  return apiRequest<{ repairOrders?: ApiRepairOrder[]; orders?: ApiRepairOrder[] } | ApiRepairOrder[]>(`/api/repair-orders${query}`, { token })
}

export function createWorkshopRepairOrder(token: string, payload: unknown) {
  return apiRequest<ApiRepairOrder>('/api/repair-orders', { method: 'POST', token, body: JSON.stringify(payload) })
}

export function updateWorkshopRepairOrder(token: string, id: string, payload: unknown) {
  return apiRequest<ApiRepairOrder>(`/api/repair-orders/${id}`, { method: 'PUT', token, body: JSON.stringify(payload) })
}

export function updateWorkshopRepairProgress(token: string, id: string, payload: unknown) {
  return apiRequest<{ order?: ApiRepairOrder } | ApiRepairOrder>(`/api/repair-orders/${id}/progress`, { method: 'PATCH', token, body: JSON.stringify(payload) })
}

export function addWorkshopStepNote(token: string, id: string, payload: unknown) {
  return apiRequest<{ stepNotes?: unknown[] }>(`/api/repair-orders/${id}/step-notes`, { method: 'POST', token, body: JSON.stringify(payload) })
}

export function fetchWorkshopServices(token: string) {
  return apiRequest<ApiService[]>('/api/services', { token })
}

export function fetchWorkshopTechnicians(token: string) {
  return apiRequest<ApiTechnician[]>('/api/technicians', { token })
}

export function fetchAdditionalServiceProposals(token: string) {
  return apiRequest<{ proposals?: ApiAdditionalServiceProposal[] } | ApiAdditionalServiceProposal[]>('/api/additional-service-proposals', { token })
}

export function updateAdditionalServiceProposal(token: string, id: string, status: string) {
  return apiRequest<ApiAdditionalServiceProposal>(`/api/additional-service-proposals/${id}`, { method: 'PATCH', token, body: JSON.stringify({ status }) })
}

export function uploadInspectionPhotos(token: string, repairOrderId: string, formData: FormData) {
  return apiRequest(`/api/repair-orders/${repairOrderId}/inspection/photos`, { method: 'POST', token, body: formData })
}

export function saveInspectionNote(token: string, repairOrderId: string, content: string) {
  return addWorkshopStepNote(token, repairOrderId, { content })
}

export function unwrapArray<T>(value: T[] | Record<string, T[] | undefined>, keys: string[]) {
  if (Array.isArray(value)) return value
  for (const key of keys) {
    const list = value[key]
    if (Array.isArray(list)) return list
  }
  return []
}

export function personName(person?: AuthUser | string | null, fallback = 'Chưa cập nhật') {
  return typeof person === 'string' ? person : person?.fullName || person?.email || fallback
}

export function vehiclePlate(vehicle?: ApiVehicle | null) {
  return vehicle?.licensePlate || vehicle?.plate || 'Chưa có biển số'
}

export function vehicleName(vehicle?: ApiVehicle | null) {
  return [vehicle?.brand, vehicle?.model].filter(Boolean).join(' ') || vehicle?.model || 'Chưa rõ xe'
}

export function orderId(order: Pick<ApiRepairOrder, '_id' | 'id' | 'code'>) {
  return order.code || order.id || order._id || 'RO-N/A'
}

export function formatApiDate(value?: string) {
  if (!value) return 'Chưa cập nhật'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}
