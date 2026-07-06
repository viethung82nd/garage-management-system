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

/**
 * There is no GET /api/admin/users on the backend yet, so the list is mocked
 * locally until that endpoint ships. Kept async so call sites don't need to
 * change when it's wired to a real request later.
 */
export async function fetchAdminUsers(_token: string): Promise<{ users: AdminUserRecord[] }> {
  return { users: [] }
}

/** POST /api/auth/staff — this one already exists on the backend. */
export function createStaffAccount(token: string, payload: CreateStaffPayload) {
  return apiRequest<{ user: AdminUserRecord }>('/api/auth/staff', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

/** No deactivate endpoint on the backend yet — mocked until it ships. */
export async function deactivateUser(_token: string, _userId: string): Promise<{ message: string }> {
  return { message: 'User deactivated (mock — backend endpoint not implemented yet)' }
}
