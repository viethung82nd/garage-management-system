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
  color?: string
  customerId?: AuthUser
  customer?: AuthUser
  vin?: string
  chassisNumber?: string
  engineNumber?: string
  lastKnownMileage?: number
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
  serviceCategory?: string
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
  inspectionId?: string
  issueDescription?: string
  /** Service category the customer chose when booking, carried from the booking at Reception. Drives the inspection checklist. */
  serviceCategory?: string
  services?: Array<{ serviceId?: ApiService | string; name?: string; quantity?: number; priceAtTime?: number; status?: 'pending' | 'inProgress' | 'completed' }>
  stepNotes?: Array<{ content?: string; technicianId?: AuthUser | string; stepIndex?: number; photos?: string[]; createdAt?: string }>
  status?: string
  totalCost?: number
  startedAt?: string
  completedAt?: string
  forwardedToAccountantAt?: string
  invoicedAt?: string
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
  serviceId?: string
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
  /** Only set when status was just updated to "sent" — whether the customer had an email on file to actually send to. */
  hasEmailOnFile?: boolean
}

export type QuotationLineKind = 'service' | 'part' | 'labor'

export type ApiQuotationLine = {
  id?: string
  serviceId?: string
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
  vehicleId?: string
  customerName?: string
  customerPhone?: string
  vehiclePlate?: string
  vehicleName?: string
  lines?: ApiQuotationLine[]
  discountPercent?: number
  taxPercent?: number
  totalEstimate?: number
  note?: string
  validUntil?: string
  status?: 'draft' | 'sent' | 'approved' | 'rejected'
  createdAt?: string
  /** Only set on the response to sendQuotation() — whether the customer had an email on file to actually send to. */
  hasEmailOnFile?: boolean
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

export type ReceptionPayload = {
  bookingId?: string
  customerName: string
  phone: string
  customerEmail?: string
  plate: string
  model?: string
  vin?: string
  engineNo?: string
  mileage?: string
  issueDescription?: string
  promisedAt?: string
}

export type ReceptionResponse = {
  customer: AuthUser
  vehicle: ApiVehicle
  repairOrder: ApiRepairOrder
  booking: ApiBooking | null
}

export function fetchAdvisorDashboard(token: string) {
  return apiRequest<ApiDashboardSummary>('/api/advisor/dashboard', { token })
}

export function fetchWorkshopBookings(token: string, query = '') {
  return apiRequest<{ bookings?: ApiBooking[] } | ApiBooking[]>(`/api/bookings${query}`, { token })
}

export function fetchWorkshopBookingById(token: string, id: string) {
  return apiRequest<{ booking?: ApiBooking } | ApiBooking>(`/api/bookings/${id}`, { token })
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
  return apiRequest<ReceptionResponse>('/api/receptions', { method: 'POST', token, body: JSON.stringify(payload) })
}

export function fetchWorkshopRepairOrders(token: string, query = '') {
  return apiRequest<{ repairOrders?: ApiRepairOrder[]; orders?: ApiRepairOrder[] } | ApiRepairOrder[]>(`/api/repair-orders${query}`, { token })
}

export function fetchWorkshopRepairOrderById(token: string, id: string) {
  return apiRequest<ApiRepairOrder>(`/api/repair-orders/${id}`, { token })
}

export function forwardRepairOrderToAccountant(token: string, id: string) {
  return apiRequest<{ message?: string; order?: ApiRepairOrder }>(`/api/repair-orders/${id}/forward-to-accountant`, {
    method: 'POST',
    token,
  })
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

export type AddStepNotePayload = {
  content: string
  stepIndex?: number
  photos?: File[]
}

/** Sent as multipart so evidence photos of the actual work done can ride
 * along with the note text — same pattern as createInspectionReport. */
export function addWorkshopStepNote(token: string, id: string, payload: AddStepNotePayload) {
  const formData = new FormData()
  formData.append('content', payload.content)
  if (payload.stepIndex != null) formData.append('stepIndex', String(payload.stepIndex))
  payload.photos?.forEach((file) => formData.append('photos', file))
  return apiRequest<{ message?: string; stepNotes?: ApiRepairOrder['stepNotes'] }>(`/api/repair-orders/${id}/step-notes`, { method: 'POST', token, body: formData })
}

export function fetchWorkshopServices(token: string) {
  return apiRequest<ApiService[]>('/api/services', { token })
}

/** Active services belonging to one category — used to build the SA's inspection checklist from the category the customer booked. */
export function fetchWorkshopServicesByCategory(token: string, category: string) {
  return apiRequest<ApiService[]>(`/api/services?isActive=true&category=${encodeURIComponent(category)}`, { token })
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

export type UpdateAdditionalServiceProposalOverrides = {
  laborCost?: number
  partsCost?: number
}

/** `overrides` lets the SA adjust the price before sending/approving — the
 * technician's cost is only ever an estimate; the SA decides what actually
 * gets quoted to the customer. */
export function updateAdditionalServiceProposal(
  token: string,
  id: string,
  status: string,
  overrides?: UpdateAdditionalServiceProposalOverrides,
) {
  return apiRequest<ApiAdditionalServiceProposal>(`/api/additional-service-proposals/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ status, ...overrides }),
  })
}

export type CreateAdditionalServiceProposalPayload = {
  repairOrderId: string
  serviceId?: string
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

export type CreateInspectionReportPayload = {
  bookingId?: string
  repairOrderId?: string
  odometer?: number
  fuelLevel?: string
  findings?: string
  items?: ApiInspectionItem[]
  recommendedServices?: { serviceId?: string; name: string; price?: number; isRequired?: boolean }[]
  estimatedCost?: number
  photos?: File[]
}

/**
 * POST /api/inspection-reports — accepts either bookingId (SA inspection at
 * intake, ahead of a quote) or repairOrderId (mid-repair). Sent as multipart
 * so photos and the checklist/cost fields can go in the same request.
 */
export function createInspectionReport(token: string, payload: CreateInspectionReportPayload) {
  const formData = new FormData()
  if (payload.bookingId) formData.append('bookingId', payload.bookingId)
  if (payload.repairOrderId) formData.append('repairOrderId', payload.repairOrderId)
  if (payload.odometer != null) formData.append('odometer', String(payload.odometer))
  if (payload.fuelLevel) formData.append('fuelLevel', payload.fuelLevel)
  if (payload.findings) formData.append('findings', payload.findings)
  if (payload.estimatedCost != null) formData.append('estimatedCost', String(payload.estimatedCost))
  if (payload.items) formData.append('items', JSON.stringify(payload.items))
  if (payload.recommendedServices?.length) formData.append('recommendedServices', JSON.stringify(payload.recommendedServices))
  payload.photos?.forEach((file) => formData.append('photos', file))
  return apiRequest('/api/inspection-reports', { method: 'POST', token, body: formData })
}

export type ApiRecommendedService = {
  serviceId?: ApiService | string
  name?: string
  price?: number
  isRequired?: boolean
}

export type ApiInspectionReport = {
  _id?: string
  id?: string
  bookingId?: string
  repairOrderId?: string
  vehicleId?: string
  findings?: string
  estimatedCost?: number
  odometer?: number
  fuelLevel?: string
  items?: ApiInspectionItem[]
  recommendedServices?: ApiRecommendedService[]
  photos?: string[]
  status?: 'pending' | 'completed'
  inspectedAt?: string
}

export function fetchInspectionReports(token: string, query = '') {
  return apiRequest<{ inspectionReports?: ApiInspectionReport[] } | ApiInspectionReport[]>(`/api/inspection-reports${query}`, { token })
}

export type ApiServiceCategory = {
  _id?: string
  id?: string
  name?: string
  description?: string
  imageUrl?: string
}

export function fetchServiceCategories() {
  return apiRequest<{ categories?: ApiServiceCategory[] } | ApiServiceCategory[]>('/api/services/categories')
}

export function createQuotation(token: string, payload: ApiQuotation) {
  return apiRequest<{ quotation?: ApiQuotation } | ApiQuotation>('/api/quotations', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export function updateQuotation(token: string, id: string, payload: Partial<ApiQuotation>) {
  return apiRequest<{ quotation?: ApiQuotation } | ApiQuotation>(`/api/quotations/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  })
}

export function sendQuotation(token: string, id: string) {
  return apiRequest<ApiQuotation>(`/api/quotations/${id}/send`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({}),
  })
}

/** Records the SA's log of what the customer decided — approving syncs the quotation's lines into the linked RepairOrder. */
export function confirmQuotation(token: string, id: string, approved: boolean) {
  return apiRequest<ApiQuotation>(`/api/quotations/${id}/confirm`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ approved }),
  })
}

export function fetchQuotations(token: string, query = '') {
  return apiRequest<{ quotations?: ApiQuotation[] } | ApiQuotation[]>(`/api/quotations${query}`, { token })
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

export function personName(person?: AuthUser | string | null, fallback = 'Not updated') {
  return typeof person === 'string' ? person : person?.fullName || person?.email || fallback
}

export function vehiclePlate(vehicle?: ApiVehicle | null) {
  return vehicle?.licensePlate || vehicle?.plate || 'No plate'
}

export function vehicleName(vehicle?: ApiVehicle | null) {
  return [vehicle?.brand, vehicle?.model].filter(Boolean).join(' ') || vehicle?.model || 'Unknown vehicle'
}

/**
 * RepairOrder has no human-friendly code in the backend (raw Mongo _id
 * only). A bare hex suffix ("RO-B8B84F") reads as noise in a dropdown, so
 * this decodes the ObjectId's embedded creation timestamp (its first 4
 * bytes) into a date prefix instead — "RO-260718-B84F" at least tells the
 * advisor when the job was opened, and stays stable/unique either way.
 */
export function orderId(order: Pick<ApiRepairOrder, '_id' | 'id' | 'code'>) {
  if (order.code) return order.code
  const rawId = order.id || order._id
  if (!rawId || rawId.length < 24) return 'RO-N/A'

  const seconds = Number.parseInt(rawId.slice(0, 8), 16)
  const suffix = rawId.slice(-4).toUpperCase()
  if (!Number.isFinite(seconds)) return `RO-${suffix}`

  const createdAt = new Date(seconds * 1000)
  const yy = String(createdAt.getFullYear()).slice(2)
  const mm = String(createdAt.getMonth() + 1).padStart(2, '0')
  const dd = String(createdAt.getDate()).padStart(2, '0')
  return `RO-${yy}${mm}${dd}-${suffix}`
}

export function formatApiDate(value?: string) {
  if (!value) return 'Not updated'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}
