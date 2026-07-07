import type { AuthRole, AuthUser } from './types'

export type { AuthRole, AuthUser } from './types'

const USER_STORAGE_KEYS = ['auth:user', 'auth_user', 'currentUser', 'user']
const SESSION_STORAGE_KEYS = ['auth', 'session', 'authSession']

function parseJson(value: string | null) {
  if (!value) return undefined

  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

function readStoredUser(): AuthUser | undefined {
  if (typeof window === 'undefined') return undefined

  for (const key of USER_STORAGE_KEYS) {
    const value = parseJson(window.localStorage.getItem(key) || window.sessionStorage.getItem(key))
    if (value?.fullName || value?.email || value?.role) return value
  }

  for (const key of SESSION_STORAGE_KEYS) {
    const value = parseJson(window.localStorage.getItem(key) || window.sessionStorage.getItem(key))
    const user = value?.user || value?.profile || value?.account
    if (user?.fullName || user?.email || user?.role) return user
  }

  return undefined
}

export function getRoleLabel(role?: AuthRole | string) {
  const labels: Record<string, string> = {
    accountant: 'Kế toán',
    admin: 'Quản trị viên',
    onlineCustomer: 'Khách hàng online',
    serviceAdvisor: 'Cố vấn dịch vụ',
    technician: 'Kỹ thuật viên',
    walkInCustomer: 'Khách vãng lai',
  }

  return role ? labels[role] || role : 'Chưa xác định vai trò'
}

export function getUserInitials(userOrName?: AuthUser | string | null) {
  const source = typeof userOrName === 'string' ? userOrName : userOrName?.fullName || userOrName?.email || ''
  const words = source.trim().split(/\s+/).filter(Boolean)

  if (!words.length) return '--'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
}

export function useAuth() {
  const user = readStoredUser()

  return { user }
}
