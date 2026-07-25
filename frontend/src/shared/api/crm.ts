import { apiRequest } from '../lib/api-client'
import type { AuthUser } from '../auth'
import type { ApiVehicle } from './workshop'

// ============= REMINDERS =============
// Backend truth: backend/src/models/reminder.model.js, backend/src/services/reminder.service.js

export const REMINDER_TYPES = [
  'maintenanceDue',
  'registrationExpiry',
  'insuranceExpiry',
  'warrantyExpiry',
  'deferredWork',
  'lapsedCustomer',
  'birthday',
] as const
export type ReminderType = (typeof REMINDER_TYPES)[number]

export const REMINDER_STATUSES = ['pending', 'sent', 'dismissed', 'done'] as const
export type ReminderStatus = (typeof REMINDER_STATUSES)[number]

export type ApiReminder = {
  _id?: string
  id?: string
  // Populated (licensePlate only) on GET /api/reminders, a raw ObjectId string on PATCH responses.
  vehicleId?: ApiVehicle | string
  // Populated (fullName, phone only) on GET /api/reminders, a raw ObjectId string on PATCH responses.
  customerId?: AuthUser | string
  type?: ReminderType
  dueAt?: string
  title?: string
  message?: string
  status?: ReminderStatus
  sourceRef?: string
  sentAt?: string
  createdAt?: string
  updatedAt?: string
}

export type GenerateRemindersResult = {
  created: number
  byType: Record<string, number>
}

/** POST /api/reminders/generate — runs the reminder engine now. Idempotent. */
export function generateReminders(token: string, horizonDays?: number) {
  return apiRequest<GenerateRemindersResult>('/api/reminders/generate', {
    method: 'POST',
    token,
    body: JSON.stringify(horizonDays != null ? { horizonDays } : {}),
  })
}

/** GET /api/reminders?status=&type= — the advisor's outstanding-nudges queue. */
export function fetchReminders(token: string, query = '') {
  return apiRequest<{ reminders?: ApiReminder[] } | ApiReminder[]>(`/api/reminders${query}`, { token })
}

/** PATCH /api/reminders/:id — mark a reminder sent, dismissed, or done. sent/dismissed/done; dismissed/done are terminal. */
export function updateReminderStatus(token: string, id: string, status: ReminderStatus) {
  return apiRequest<ApiReminder>(`/api/reminders/${id}`, { method: 'PATCH', token, body: JSON.stringify({ status }) })
}

// ============= FOLLOW-UPS =============
// Backend truth: backend/src/models/follow-up.model.js, backend/src/services/follow-up.service.js

export const FOLLOW_UP_STATUSES = ['pending', 'contacted', 'noAnswer', 'closed'] as const
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number]

export const COMPLAINT_CATEGORIES = [
  'greeting',
  'repairQuality',
  'price',
  'timeliness',
  'cleanliness',
  'explanation',
  'facilities',
  'none',
] as const
export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number]

export type ApiFollowUp = {
  _id?: string
  id?: string
  // Never populated by listFollowUps — always the raw RepairOrder ObjectId string.
  repairOrderId?: string
  // Populated (licensePlate only) on GET /api/follow-ups, a raw ObjectId string on PATCH responses.
  vehicleId?: ApiVehicle | string
  // Populated (fullName, phone only) on GET /api/follow-ups, a raw ObjectId string on PATCH responses.
  customerId?: AuthUser | string
  dueAt?: string
  status?: FollowUpStatus
  contactedAt?: string
  contactedBy?: AuthUser | string
  csatScore?: number
  npsScore?: number
  complaintCategory?: ComplaintCategory
  note?: string
  // Set once a dissatisfied score (<=2 CSAT) is recorded — the backend then
  // refuses to close this follow-up without a resolution note.
  escalated?: boolean
  resolvedAt?: string
  createdAt?: string
  updatedAt?: string
}

export type GenerateFollowUpsResult = {
  created: number
}

/** POST /api/follow-ups/generate — back-fills follow-ups for delivered orders that don't have one yet. */
export function generateFollowUps(token: string, lookbackDays?: number) {
  return apiRequest<GenerateFollowUpsResult>('/api/follow-ups/generate', {
    method: 'POST',
    token,
    body: JSON.stringify(lookbackDays != null ? { lookbackDays } : {}),
  })
}

/** GET /api/follow-ups?status= — the advisor's post-delivery call queue. */
export function fetchFollowUps(token: string, query = '') {
  return apiRequest<{ followUps?: ApiFollowUp[] } | ApiFollowUp[]>(`/api/follow-ups${query}`, { token })
}

export type RecordFollowUpOutcomePayload = {
  status?: FollowUpStatus
  csatScore?: number
  npsScore?: number
  complaintCategory?: ComplaintCategory
  note?: string
}

/** PATCH /api/follow-ups/:id — log the outcome of a follow-up call. `closed` is terminal. */
export function recordFollowUpOutcome(token: string, id: string, payload: RecordFollowUpOutcomePayload) {
  return apiRequest<ApiFollowUp>(`/api/follow-ups/${id}`, { method: 'PATCH', token, body: JSON.stringify(payload) })
}

export type SatisfactionSummary = {
  contactedCount: number
  avgCsat: number | null
  nps: number | null
  byComplaintCategory: Record<string, number>
}

/** GET /api/follow-ups/satisfaction?startDate=&endDate= — CSAT/NPS rollup over contacted follow-ups. */
export function fetchSatisfactionSummary(token: string, query = '') {
  return apiRequest<SatisfactionSummary>(`/api/follow-ups/satisfaction${query}`, { token })
}

// ============= DEFERRED WORK =============
// Backend truth: backend/src/models/deferred-work.model.js, backend/src/services/deferred-work.service.js

export const DEFERRED_WORK_STATUSES = ['open', 'converted', 'dismissed', 'expired'] as const
export type DeferredWorkStatus = (typeof DEFERRED_WORK_STATUSES)[number]

export type ApiDeferredWork = {
  _id?: string
  id?: string
  // Populated (licensePlate, brand, model) on GET /api/deferred-work, a raw ObjectId string on PATCH responses.
  vehicleId?: ApiVehicle | string
  // Populated (fullName, phone only) on GET /api/deferred-work, a raw ObjectId string on PATCH responses.
  customerId?: AuthUser | string
  sourceQuoteId?: string
  sourceRepairOrderId?: string
  sourceInspectionId?: string
  serviceId?: string
  description?: string
  estimatedPrice?: number
  declineReason?: string
  priority?: 'high' | 'medium' | 'low'
  status?: DeferredWorkStatus
  remindAt?: string
  convertedQuoteId?: string
  resolvedAt?: string
  createdAt?: string
  updatedAt?: string
}

export type DeferredWorkListResponse = {
  deferredWork: ApiDeferredWork[]
  // Sum of estimatedPrice across the returned (filtered) items.
  totalEstimatedValue: number
}

/** GET /api/deferred-work?status=open — declined/monitor work still awaiting follow-up, plus its pipeline value. */
export function fetchDeferredWork(token: string, query = '') {
  return apiRequest<DeferredWorkListResponse>(`/api/deferred-work${query}`, { token })
}

/** PATCH /api/deferred-work/:id — close out a deferred item, either converted (customer agreed) or dismissed. */
export function resolveDeferredWork(token: string, id: string, status: 'converted' | 'dismissed') {
  return apiRequest<ApiDeferredWork>(`/api/deferred-work/${id}`, { method: 'PATCH', token, body: JSON.stringify({ status }) })
}
