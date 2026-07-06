import type {
  AuthSession,
  AuthUser,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
} from './types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '')

type ApiErrorPayload = {
  error?: string
  message?: string
}

export class AuthApiError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'AuthApiError'
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
  throw new AuthApiError(message, response.status)
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
    if (error instanceof AuthApiError) {
      throw error
    }

    throw new AuthApiError('Unable to connect to the server. Please check backend, CORS, or network status.', 0)
  }
}

export async function loginRequest(payload: LoginPayload) {
  return requestJson<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function registerRequest(payload: RegisterPayload) {
  return requestJson<AuthSession>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function forgotPasswordRequest(payload: ForgotPasswordPayload) {
  return requestJson<{ message: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function resetPasswordRequest(payload: ResetPasswordPayload) {
  return requestJson<{ message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function meRequest(token: string) {
  const response = await requestJson<{ user: AuthUser }>('/api/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.user
}
