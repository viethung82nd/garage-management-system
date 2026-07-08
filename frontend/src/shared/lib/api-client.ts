const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '')

export class ApiClientError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

function readToken() {
  if (typeof window === 'undefined') return undefined

  return (
    window.localStorage.getItem('auth:token') ||
    window.localStorage.getItem('auth_token') ||
    window.localStorage.getItem('token') ||
    window.sessionStorage.getItem('auth:token') ||
    window.sessionStorage.getItem('auth_token') ||
    window.sessionStorage.getItem('token') ||
    undefined
  )
}

export async function apiRequest<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = init.token || readToken()

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  const text = await response.text()
  const data = text ? JSON.parse(text) : undefined

  if (!response.ok) {
    throw new ApiClientError(data?.message || data?.error || `API request failed: ${response.status}`, response.status)
  }

  return data as T
}
