const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '')

type ApiErrorPayload = {
  error?: string
  message?: string
}

export class TrackingApiError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'TrackingApiError'
    this.status = status
  }
}

export type TrackingApiResponse = {
  repairOrderId: string
  displayRepairOrderId: string
  status: string
  statusLabel: string
  statusTone: 'completed' | 'in-progress' | 'pending' | 'ready'
  stageLabel: string
  stageValue: string
  progressPercent: string
  garageName: string
  customer: {
    fullName: string
    phone: string
    accountType: 'registered' | 'walkIn'
  } | null
  intakeType: string
  vehicle: {
    licensePlate: string
    brand?: string
    model?: string
  }
  serviceAdvisor: string
  technician: string
  services: Array<{
    name: string
    price: number
    quantity: number
  }>
  approvedServices: string[]
  invoice: {
    id: string | null
    displayId: string
    status: string | null
    total: number
    issuedAt: string | null
  }
  payment: {
    status: string
    tone: 'completed' | 'in-progress' | 'pending' | 'ready'
    method: string
  }
  timeline: Array<{
    id: string
    label: string
    description?: string
    timestamp: string | null
    state: 'complete' | 'current' | 'pending'
  }>
  totalCost: number
  startedAt?: string | null
  completedAt?: string | null
}

async function parseError(response: Response) {
  let payload: ApiErrorPayload | null = null
  try {
    payload = (await response.json()) as ApiErrorPayload
  } catch {
    payload = null
  }

  const message = payload?.error || payload?.message || `Request failed with status ${response.status}`
  throw new TrackingApiError(message, response.status)
}

async function requestJson<T>(path: string, init: RequestInit = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    })

    if (!response.ok) {
      await parseError(response)
    }

    return (await response.json()) as T
  } catch (error) {
    if (error instanceof TrackingApiError) {
      throw error
    }

    throw new TrackingApiError('Unable to connect to the tracking service. Please check backend, CORS, or network status.', 0)
  }
}

export async function fetchTrackingRecord(plate: string, phone: string) {
  const query = new URLSearchParams({
    plate,
    phone,
  })

  return requestJson<TrackingApiResponse>(`/api/tracking?${query.toString()}`, {
    method: 'GET',
  })
}
