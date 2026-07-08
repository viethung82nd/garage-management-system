const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '')

export class ApiClientError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

export async function apiRequest<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  const headers = new Headers(init.headers)

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (init.token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${init.token}`)
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
    const text = await response.text()
    let data: unknown

    try {
      data = text ? JSON.parse(text) : undefined
    } catch {
      data = text
    }

    if (!response.ok) {
      const payload = typeof data === 'object' && data ? (data as { message?: string; error?: string }) : undefined
      throw new ApiClientError(payload?.message || payload?.error || `API request failed: ${response.status}`, response.status)
    }

    return data as T
  } catch (error) {
    if (error instanceof ApiClientError) throw error
    throw new ApiClientError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend, CORS hoặc kết nối mạng.', 0)
  }
}
