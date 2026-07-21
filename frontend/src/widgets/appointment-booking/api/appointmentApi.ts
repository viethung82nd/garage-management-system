const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '')

type ApiErrorPayload = {
  error?: string
  message?: string
}

export class AppointmentApiError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'AppointmentApiError'
    this.status = status
  }
}

export type AppointmentService = {
  _id: string
  name: string
  category?: string
  basePrice: number
  estimatedDuration?: number
  isActive: boolean
}

export type AppointmentCategory = {
  _id: string
  name: string
  description?: string
  imageUrl?: string
  isActive?: boolean
}

export type AppointmentSlot = {
  timeSlot: string
  capacity: number
  booked: number
  available: boolean
}

export type CreateAppointmentBookingPayload = {
  customer: {
    fullName: string
    email: string
    phone: string
  }
  vehicle: {
    licensePlate: string
  }
  serviceCategory: string
  bookingDate: string
  timeSlot: string
  note: string
}

type AppointmentSlotsResponse = {
  slots: AppointmentSlot[]
}

type CreateAppointmentBookingResponse = {
  booking: {
    _id: string
    bookingDate: string
    timeSlot: string
  }
}

async function parseError(response: Response) {
  let payload: ApiErrorPayload | null = null

  try {
    payload = (await response.json()) as ApiErrorPayload
  } catch {
    payload = null
  }

  const message = payload?.error || payload?.message || `Request failed with status ${response.status}`
  throw new AppointmentApiError(message, response.status)
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
    if (error instanceof AppointmentApiError) {
      throw error
    }

    throw new AppointmentApiError('Unable to connect to the booking service. Please check backend, CORS, or network status.', 0)
  }
}

export async function fetchAppointmentServices() {
  return requestJson<AppointmentService[]>('/api/services?isActive=true', { method: 'GET' })
}

export async function fetchAppointmentCategories() {
  const categories = await requestJson<AppointmentCategory[]>('/api/services/categories', { method: 'GET' })
  // The catalog can hold retired categories; only offer the ones still active.
  return categories.filter((category) => category.isActive !== false)
}

export async function fetchAppointmentSlots(date: string) {
  const response = await requestJson<AppointmentSlotsResponse>(`/api/bookings/slots?date=${encodeURIComponent(date)}`, { method: 'GET' })
  return response.slots
}

export async function createAppointmentBooking(payload: CreateAppointmentBookingPayload) {
  return requestJson<CreateAppointmentBookingResponse>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
