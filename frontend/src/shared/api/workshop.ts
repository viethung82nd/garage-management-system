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
  /** True when this order was opened as a return under a prior repair's service warranty — see parentRoId. */
  isComeback?: boolean
  /** The original repair order this comeback was opened against, when isComeback is true. */
  parentRoId?: string
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

/** Who pays for a line. Only customerPay lines are billed to the customer. */
export const JOB_TYPES = ['customerPay', 'warranty', 'internal', 'insurance', 'goodwill'] as const
export type JobType = (typeof JOB_TYPES)[number]

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  customerPay: 'Customer pay',
  warranty: 'Warranty',
  internal: 'Internal (shop-absorbed)',
  insurance: 'Insurance',
  goodwill: 'Goodwill',
}

export type ApiQuotationLine = {
  id?: string
  serviceId?: string
  /** Set when a "part" line is picked from the parts catalogue rather than
   *  hand-typed — this is what lets an approved quote reserve real stock. */
  partId?: string
  description?: string
  kind?: QuotationLineKind
  jobType?: JobType
  quantity?: number
  unitPrice?: number
}

/** A row from the parts catalogue, for the quote line picker. Mirrors the
 *  fields `GET /api/admin/parts` returns (see PartModel). */
export type ApiPartOption = {
  _id: string
  name: string
  sku: string
  unitPrice: number
  condition?: string
  stockQuantity?: number
  reservedQuantity?: number
  availableQuantity?: number
}

/** Searches the parts catalogue by name/SKU — used to pick a real part for a
 *  quote line. Read access for serviceAdvisor was opened in Phase 3. */
export function searchParts(token: string, q: string) {
  const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
  return apiRequest<{ parts?: ApiPartOption[] } | ApiPartOption[]>(`/api/admin/parts${query}`, { token })
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
  status?: 'draft' | 'sent' | 'approved' | 'partiallyApproved' | 'rejected'
  createdAt?: string
  /** Only set on the response to sendQuotation() — whether the customer had an email on file to actually send to. */
  hasEmailOnFile?: boolean
  /** The authorisation record left once a decision is taken — who, when,
   *  through which channel, and (for an in-person decision) both signatures. */
  approval?: {
    decidedByName?: string
    decidedAt?: string
    channel?: ApprovalChannel
    contactValue?: string
    approvedTotal?: number
    customerSignature?: string
    advisorSignature?: string
  } | null
}

/** Payload for recording a customer's decision on a quotation. `approved`
 *  decides every line at once; `lineDecisions` allows a per-line mix
 *  (partial approval). Signatures are data-URL images. */
export type ConfirmQuotationPayload = {
  approved?: boolean
  lineDecisions?: Array<{ index: number; approved: boolean; declineReason?: string }>
  channel?: ApprovalChannel
  contactValue?: string
  decidedByName?: string
  note?: string
  customerSignature?: string
  advisorSignature?: string
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
  /** Fuel level noted during the walk-around at hand-in (e.g. "1/2", "Full"). */
  fuelLevel?: string
  /** Vehicle arrived on a tow rather than driven in — it can't be road-tested yet. */
  isTowIn?: boolean
  /** Walk-around photos documenting existing damage at intake, as data URLs. */
  receptionPhotos?: string[]
  /** Customer's authorising signature captured at intake, as a data URL. */
  receptionSignature?: string
}

/** Surfaced when a comeback vehicle is still under a prior repair's warranty — see findActiveWarrantyOrder on the backend. */
export type ComebackWarning = {
  parentRoId?: string
  parentCode?: string
  deliveredAt?: string
  warrantyUntilDate?: string
  message?: string
}

export type ReceptionResponse = {
  customer: AuthUser
  vehicle: ApiVehicle
  repairOrder: ApiRepairOrder
  booking: ApiBooking | null
  warnings?: {
    comeback?: ComebackWarning | null
    odometerRollback?: string | null
  }
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

/** Hand the vehicle back to the customer. Gated server-side on QC-passed +
 *  invoice paid; optionally records the customer's signature and whether the
 *  old parts were returned. */
export function deliverVehicleApi(
  token: string,
  id: string,
  payload: { signature?: string; oldPartsReturned?: boolean; note?: string } = {},
) {
  return apiRequest<ApiRepairOrder>(`/api/repair-orders/${id}/deliver`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

// ===== Appointments: no-show + reminders (Step 1) =====

export function markBookingNoShow(token: string, id: string) {
  return apiRequest<{ booking?: ApiBooking }>(`/api/bookings/${id}/no-show`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({}),
  })
}

export function fetchNoShowBookings(token: string) {
  return apiRequest<{ bookings?: ApiBooking[] } | ApiBooking[]>('/api/bookings/no-shows', { token })
}

export function sendAppointmentReminders(token: string) {
  return apiRequest<{ count?: number }>('/api/bookings/appointment-reminders', {
    method: 'POST',
    token,
    body: JSON.stringify({}),
  })
}

/** A day's real capacity signal — labour-minutes, not just seats. See
 *  computeTimeBucket in booking.service.js. */
export type ApiTimeBucket = {
  technicianCount: number
  capacityMinutes: number
  bookedMinutes: number
  availableMinutes: number
  utilizationPercent: number
}

export type ApiDaySlot = {
  timeSlot: string
  capacity: number
  booked: number
  available: boolean
}

export type ApiSlotsResponse = {
  date: string
  capacity: number
  slots: ApiDaySlot[]
  timeBucket?: ApiTimeBucket
}

/** Staff-facing day availability: seats per slot AND the labour-hour time
 *  bucket, together — a seat can be free while the shop is out of
 *  technician-hours, or the reverse. */
export function fetchDaySlots(token: string, date: string) {
  return apiRequest<ApiSlotsResponse>(`/api/bookings/slots?date=${encodeURIComponent(date)}`, { token })
}

// ===== Resources: bays / lifts / paint booths (capacity planning) =====

export const RESOURCE_TYPES = ['bay', 'lift', 'paintBooth', 'mobile'] as const
export type ResourceType = (typeof RESOURCE_TYPES)[number]
export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  bay: 'Bay',
  lift: 'Lift',
  paintBooth: 'Paint booth',
  mobile: 'Mobile',
}

export type ApiResource = {
  _id: string
  name: string
  type: ResourceType
  isActive?: boolean
  notes?: string
}

export function fetchResources(token: string, params: { type?: ResourceType; includeInactive?: boolean } = {}) {
  const query = new URLSearchParams()
  if (params.type) query.set('type', params.type)
  if (params.includeInactive) query.set('includeInactive', 'true')
  const qs = query.toString()
  return apiRequest<{ resources?: ApiResource[] }>(`/api/resources${qs ? `?${qs}` : ''}`, { token })
}

export function createResource(token: string, payload: { name: string; type: ResourceType; notes?: string }) {
  return apiRequest<{ resource: ApiResource }>('/api/resources', { method: 'POST', token, body: JSON.stringify(payload) })
}

export function updateResource(
  token: string,
  id: string,
  payload: Partial<{ name: string; type: ResourceType; notes: string; isActive: boolean }>,
) {
  return apiRequest<{ resource: ApiResource }>(`/api/resources/${id}`, { method: 'PUT', token, body: JSON.stringify(payload) })
}

export function deleteResource(token: string, id: string) {
  return apiRequest<{ message: string }>(`/api/resources/${id}`, { method: 'DELETE', token })
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

export const APPROVAL_CHANNELS = ['app', 'inPerson', 'phone', 'zalo', 'email', 'sms'] as const
export type ApprovalChannel = (typeof APPROVAL_CHANNELS)[number]

/** Evidence that the CUSTOMER authorised extra work. Required by the backend
 * when approving a proposal: charging beyond the agreed estimate can't rest on
 * an advisor's click alone, so we record who authorised it and how. */
export type ApprovalEvidence = {
  channel: ApprovalChannel
  decidedByName: string
  contactValue?: string
  note?: string
}

export type UpdateAdditionalServiceProposalOverrides = {
  laborCost?: number
  partsCost?: number
  approval?: ApprovalEvidence
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
  /** Real evidence photos of the issue found — sent multipart, same pattern as step notes. */
  photos?: File[]
}

export function createAdditionalServiceProposal(token: string, payload: CreateAdditionalServiceProposalPayload) {
  const { photos, ...fields } = payload
  const formData = new FormData()
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, String(value))
  })
  photos?.forEach((file) => formData.append('photos', file))
  return apiRequest<ApiAdditionalServiceProposal>('/api/additional-service-proposals', { method: 'POST', token, body: formData })
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
  /** Distance driven on the QC test drive, in km. */
  testDriveKm?: number
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
/** An advisor records the customer's decision — approve/reject/partial, with
 *  the authorisation evidence (channel + optional signatures). */
export function confirmQuotation(token: string, id: string, payload: ConfirmQuotationPayload) {
  return apiRequest<ApiQuotation>(`/api/quotations/${id}/confirm`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
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

// ============= TECHNICIAN TIME LOGGING (Phase 4a) =============

export type ApiTimeLog = {
  _id?: string
  repairOrderId?: string
  technicianId?: AuthUser | string
  lineIndex?: number
  startedAt?: string
  endedAt?: string | null
  durationMinutes?: number
  pauseReason?: string
  note?: string
}

export type ApiTimeLogsResponse = {
  timeLogs?: ApiTimeLog[]
  totalMinutes?: number
}

/** Technician clocks on to start hands-on work on a repair order (optionally pinned to one service line via lineIndex). */
export function clockOn(token: string, orderId: string, body?: { lineIndex?: number; note?: string }) {
  return apiRequest<ApiTimeLog>(`/api/repair-orders/${orderId}/clock-on`, { method: 'POST', token, body: JSON.stringify(body || {}) })
}

/** Technician clocks off, closing their own open time log on this order. 409s if there is no open log. */
export function clockOff(token: string, orderId: string, body?: { pauseReason?: string; note?: string }) {
  return apiRequest<ApiTimeLog>(`/api/repair-orders/${orderId}/clock-off`, { method: 'POST', token, body: JSON.stringify(body || {}) })
}

/** All time logs for a repair order, plus the total minutes accrued across closed spans. */
export function fetchTimeLogs(token: string, orderId: string) {
  return apiRequest<ApiTimeLogsResponse>(`/api/repair-orders/${orderId}/time-logs`, { token })
}

/**
 * Moves a repair order to a new status. The backend requires a non-empty
 * `reason` when moving into a waiting status (waitingParts/waitingCustomer/onHold).
 */
export function updateRepairOrderStatus(token: string, orderId: string, status: string, reason?: string) {
  return apiRequest<ApiRepairOrder>(`/api/repair-orders/${orderId}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(reason ? { status, reason } : { status }),
  })
}
