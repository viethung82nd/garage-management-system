const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '')

type ApiErrorPayload = {
  error?: string
  message?: string
}

export class ApiClientError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
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
  throw new ApiClientError(message, response.status)
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & {
    token?: string | null
  } = {},
) {
  try {
    const isFormData = init.body instanceof FormData
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        // Leave Content-Type unset for FormData bodies — the browser must
        // generate it itself (multipart/form-data; boundary=...); setting it
        // manually here silently breaks multer parsing on the backend.
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
        ...(init.headers || {}),
      },
    })

    if (!response.ok) {
      await parseError(response)
    }

    if (response.status === 204) {
      return null as T
    }

    return (await response.json()) as T
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error
    }

    throw new ApiClientError('Unable to connect to the server. Please check backend, CORS, or network status.', 0)
  }
}
