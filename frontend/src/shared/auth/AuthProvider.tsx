import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loginRequest, meRequest, registerRequest } from './api'
import { getPostLoginPath, isSupportedFrontendRole } from './routes'
import { clearStoredToken, loadStoredToken, storeToken } from './storage'
import type { AuthSession, AuthStatus, AuthUser, LoginPayload, RegisterPayload } from './types'

type AuthContextValue = {
  status: AuthStatus
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  isHydrating: boolean
  login: (payload: LoginPayload, remember: boolean) => Promise<AuthSession>
  register: (payload: RegisterPayload, remember: boolean) => Promise<AuthSession>
  logout: () => void
  refreshProfile: () => Promise<AuthUser | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)

  const logout = useCallback(() => {
    clearStoredToken()
    setToken(null)
    setUser(null)
    setStatus('anonymous')
  }, [])

  const refreshProfile = useCallback(async () => {
    const currentToken = token || loadStoredToken().token
    if (!currentToken) {
      logout()
      return null
    }

    try {
      const currentUser = await meRequest(currentToken)
      setToken(currentToken)
      setUser(currentUser)
      setStatus('authenticated')
      return currentUser
    } catch {
      logout()
      return null
    }
  }, [logout, token])

  useEffect(() => {
    let cancelled = false
    const stored = loadStoredToken()

    if (!stored.token) {
      setStatus('anonymous')
      return
    }

    void meRequest(stored.token)
      .then((currentUser) => {
        if (cancelled) return
        setToken(stored.token)
        setUser(currentUser)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!cancelled) logout()
      })

    return () => {
      cancelled = true
    }
  }, [logout])

  const login = useCallback(async (payload: LoginPayload, remember: boolean) => {
    const session = await loginRequest(payload)
    storeToken(session.token, remember)
    setToken(session.token)
    setUser(session.user)
    setStatus('authenticated')
    return session
  }, [])

  const register = useCallback(async (payload: RegisterPayload, remember: boolean) => {
    const session = await registerRequest(payload)
    storeToken(session.token, remember)
    setToken(session.token)
    setUser(session.user)
    setStatus('authenticated')
    return session
  }, [])

  const value = useMemo(
    () => ({
      status,
      token,
      user,
      isAuthenticated: status === 'authenticated' && !!user && !!token,
      isHydrating: status === 'loading' || status === 'idle',
      login,
      register,
      logout,
      refreshProfile,
    }),
    [login, logout, refreshProfile, register, status, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { getPostLoginPath, isSupportedFrontendRole }
