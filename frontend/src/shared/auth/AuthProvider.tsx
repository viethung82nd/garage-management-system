import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loginRequest, meRequest, registerRequest, updateMeRequest, type UpdateMePayload } from './api'
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
  updateProfile: (payload: UpdateMePayload) => Promise<AuthUser>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function applySession(session: AuthSession, remember: boolean, setStatus: (status: AuthStatus) => void, setToken: (token: string | null) => void, setUser: (user: AuthUser | null) => void) {
  storeToken(session.token, remember)
  setToken(session.token)
  setUser(session.user)
  setStatus('authenticated')
}

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

    const bootstrap = async () => {
      const stored = loadStoredToken()
      if (!stored.token) {
        if (!cancelled) {
          setStatus('anonymous')
        }
        return
      }

      try {
        const currentUser = await meRequest(stored.token)
        if (cancelled) return
        setToken(stored.token)
        setUser(currentUser)
        setStatus('authenticated')
      } catch {
        if (cancelled) return
        logout()
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [logout])

  const updateProfile = useCallback(
    async (payload: UpdateMePayload) => {
      if (!token) throw new Error('Not authenticated')
      const updatedUser = await updateMeRequest(token, payload)
      setUser(updatedUser)
      return updatedUser
    },
    [token],
  )

  const login = useCallback(
    async (payload: LoginPayload, remember: boolean) => {
      const session = await loginRequest(payload)
      applySession(session, remember, setStatus, setToken, setUser)
      return session
    },
    [],
  )

  const register = useCallback(
    async (payload: RegisterPayload, remember: boolean) => {
      const session = await registerRequest(payload)
      applySession(session, remember, setStatus, setToken, setUser)
      return session
    },
    [],
  )

  const value = useMemo<AuthContextValue>(
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
      updateProfile,
    }),
    [login, logout, refreshProfile, register, status, token, updateProfile, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext, getPostLoginPath, isSupportedFrontendRole }
