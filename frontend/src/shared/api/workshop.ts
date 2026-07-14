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

export type QuotationLineKind = 'service' | 'part' | 'labor'

export type ApiQuotationLine = {
  id?: string
  description?: string
  kind?: QuotationLineKind
  quantity?: number
  unitPrice?: number
}

export type ApiQuotation = {
  _id?: string
  id?: string
  code?: string
  repairOrderId?: string
  customerName?: string
  customerPhone?: string
  vehiclePlate?: string
  vehicleName?: string
  lines?: ApiQuotationLine[]
  discountPercent?: number
  taxPercent?: number
  note?: string
  validUntil?: string
  status?: 'draft' | 'sent' | 'approved' | 'rejected'
  createdAt?: string
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

export function createWorkshopService(token: string, payload: ApiService) {
  return apiRequest<{ service?: ApiService } | ApiService>('/api/services', { method: 'POST', token, body: JSON.stringify(payload) })
}

export function updateWorkshopService(token: string, id: string, payload: ApiService) {
  return apiRequest<{ service?: ApiService } | ApiService>(`/api/services/${id}`, { method: 'PUT', token, body: JSON.stringify(payload) })
}

export function deleteWorkshopService(token: string, id: string) {
  return apiRequest<{ success?: boolean }>(`/api/services/${id}`, { method: 'DELETE', token })
}

export async function fetchWorkshopTechnicians(token: string) {
  const response = await apiRequest<{ users?: ApiTechnician[] } | ApiTechnician[]>('/api/admin/users?role=technician', { token })
  return unwrapArray(response, ['users'])
}

export function fetchAdditionalServiceProposals(token: string) {
  return apiRequest<{ proposals?: ApiAdditionalServiceProposal[] } | ApiAdditionalServiceProposal[]>('/api/additional-service-proposals', { token })
}

export function updateAdditionalServiceProposal(token: string, id: string, status: string) {
  return apiRequest<ApiAdditionalServiceProposal>(`/api/additional-service-proposals/${id}`, { method: 'PATCH', token, body: JSON.stringify({ status }) })
}

export type CreateAdditionalServiceProposalPayload = {
  repairOrderId: string
  serviceName: string
  affectedPart?: string
  reason?: string
  customerImpact?: string
  laborCost?: number
  partsCost?: number
  estimateMinutes?: number
  evidenceCount?: number
  priority?: 'high' | 'medium' | 'low'
}

export function createAdditionalServiceProposal(token: string, payload: CreateAdditionalServiceProposalPayload) {
  return apiRequest<ApiAdditionalServiceProposal>('/api/additional-service-proposals', { method: 'POST', token, body: JSON.stringify(payload) })
}

export function uploadInspectionPhotos(token: string, repairOrderId: string, formData: FormData) {
  formData.append('repairOrderId', repairOrderId)
  return apiRequest('/api/inspection-reports', { method: 'POST', token, body: formData })
}

export function saveInspectionNote(token: string, repairOrderId: string, content: string) {
  return addWorkshopStepNote(token, repairOrderId, { content })
}

export type QualityCheckResult = 'pass' | 'fail' | 'na'

export type ApiQualityCheckItem = {
  label?: string
  result?: QualityCheckResult
  note?: string
}

export type ApiQualityCheck = {
  passed?: boolean
  items?: ApiQualityCheckItem[]
  note?: string
  reworkReason?: string
}

export function submitQualityCheck(token: string, repairOrderId: string, payload: ApiQualityCheck) {
  return apiRequest<{ order?: ApiRepairOrder } | ApiRepairOrder>(`/api/repair-orders/${repairOrderId}/quality-check`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export type InspectionItemStatus = 'ok' | 'monitor' | 'repair'

export type ApiInspectionItem = {
  category?: string
  label?: string
  status?: InspectionItemStatus
  note?: string
  laborCost?: number
  partsCost?: number
}

export type ApiInspectionResult = {
  odometer?: number
  fuelLevel?: string
  overallNote?: string
  items?: ApiInspectionItem[]
  estimatedCost?: number
}

export function submitInspectionResult(token: string, repairOrderId: string, payload: ApiInspectionResult) {
  return apiRequest('/api/inspection-reports', {
    method: 'POST',
    token,
    body: JSON.stringify({
      repairOrderId,
      odometer: payload.odometer,
      fuelLevel: payload.fuelLevel,
      findings: payload.overallNote,
      items: payload.items,
      estimatedCost: payload.estimatedCost,
    }),
  })
}

export function createQuotation(token: string, payload: ApiQuotation) {
  return apiRequest<{ quotation?: ApiQuotation } | ApiQuotation>('/api/quotations', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export function sendQuotation(token: string, id: string) {
  return apiRequest<{ quotation?: ApiQuotation } | ApiQuotation>(`/api/quotations/${id}/send`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({}),
  })
}

export type TransferRequestStatus = 'pending' | 'approved' | 'rejected'

export type ApiTransferRequest = {
  _id?: string
  id?: string
  repairOrderId?: ApiRepairOrder | string
  fromTechnicianId?: AuthUser | string
  toTechnicianId?: AuthUser | string
  reason?: string
  status?: TransferRequestStatus
  resolveNote?: string
  requestedAt?: string
  resolvedAt?: string
}

export function fetchTransferRequests(token: string, query = '') {
  return apiRequest<{ transferRequests?: ApiTransferRequest[] } | ApiTransferRequest[]>(`/api/transfer-requests${query}`, { token })
}

export function createTransferRequestApi(token: string, payload: { repairOrderId: string; toTechnicianId: string; reason?: string }) {
  return apiRequest<ApiTransferRequest>('/api/transfer-requests', { method: 'POST', token, body: JSON.stringify(payload) })
}

export function approveTransferRequestApi(token: string, id: string, resolveNote?: string) {
  return apiRequest<ApiTransferRequest>(`/api/transfer-requests/${id}/approve`, { method: 'PATCH', token, body: JSON.stringify({ resolveNote }) })
}

export function rejectTransferRequestApi(token: string, id: string, resolveNote?: string) {
  return apiRequest<ApiTransferRequest>(`/api/transfer-requests/${id}/reject`, { method: 'PATCH', token, body: JSON.stringify({ resolveNote }) })
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
