import { apiRequest } from '../../../../shared/lib/api-client'
import type { AuthRole } from '../../../../shared/auth'

export type AdminUserRecord = {
  _id: string
  fullName: string
  email?: string
  phone?: string
  role: AuthRole
  isActive: boolean
  createdAt?: string
}

export type CreateStaffPayload = {
  fullName: string
  email: string
  phone?: string
  password: string
  role: 'serviceAdvisor' | 'technician' | 'accountant' | 'admin'
}

export function fetchAdminUsers(token: string) {
  return apiRequest<{ users: AdminUserRecord[] }>('/api/admin/users', { token })
}

/** POST /api/auth/staff — this one already exists on the backend. */
export function createStaffAccount(token: string, payload: CreateStaffPayload) {
  return apiRequest<{ user: AdminUserRecord }>('/api/auth/staff', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export function deactivateUser(token: string, userId: string) {
  return apiRequest<{ user: AdminUserRecord }>(`/api/admin/users/${userId}/deactivate`, {
    method: 'PATCH',
    token,
  })
}
