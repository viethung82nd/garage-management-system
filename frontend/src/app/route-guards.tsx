import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getPostLoginPath, useAuth, type AuthRole } from '../shared/auth'
import { theme } from '../shared/config/theme'

function AuthLoadingScreen() {
  return <div className="min-h-screen" style={{ background: theme.color.surfaceStrong, color: theme.color.onPrimary }} />
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { isAuthenticated, isHydrating } = useAuth()

  if (isHydrating) {
    return <AuthLoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/my-account" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

export function RequireRole({
  roles,
  children,
}: {
  roles: readonly AuthRole[]
  children: ReactNode
}) {
  const { isHydrating, user } = useAuth()

  if (isHydrating) {
    return <AuthLoadingScreen />
  }

  if (!user) {
    return <Navigate to="/my-account" replace />
  }

  if (!roles.includes(user.role)) {
    const redirectPath = getPostLoginPath(user.role)
    if (redirectPath) {
      return <Navigate to={redirectPath} replace />
    }

    return <Navigate to="/my-account" replace />
  }

  return <>{children}</>
}
