export { AuthProvider, getPostLoginPath, isSupportedFrontendRole } from './AuthProvider'
export { getRoleLabel } from './routes'
export { useAuth } from './useAuth'
export type { AuthRole, AuthSession, AuthStatus, AuthUser, LoginPayload, RegisterPayload } from './types'

import type { AuthUser } from './types'

export function getUserInitials(userOrName?: AuthUser | string | null) {
  const source = typeof userOrName === 'string' ? userOrName : userOrName?.fullName || userOrName?.email || ''
  const words = source.trim().split(/\s+/).filter(Boolean)

  if (!words.length) return '--'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
}
