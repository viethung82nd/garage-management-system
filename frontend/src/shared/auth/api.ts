import { apiRequest } from '../lib/api-client'
import type { AuthSession, AuthUser, LoginPayload, RegisterPayload } from './types'

export function loginRequest(payload: LoginPayload) {
  return apiRequest<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function registerRequest(payload: RegisterPayload) {
  return apiRequest<AuthSession>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function meRequest(token: string) {
  const response = await apiRequest<{ user: AuthUser }>('/api/auth/me', { token })
  return response.user
}
