const LOCAL_TOKEN_KEY = 'gms.auth.token'
const SESSION_TOKEN_KEY = 'gms.auth.token.session'

export function loadStoredToken() {
  const localToken = window.localStorage.getItem(LOCAL_TOKEN_KEY)
  if (localToken) return { token: localToken, persistent: true }

  const sessionToken = window.sessionStorage.getItem(SESSION_TOKEN_KEY)
  if (sessionToken) return { token: sessionToken, persistent: false }

  return { token: null, persistent: false }
}

export function storeToken(token: string, persistent: boolean) {
  clearStoredToken()
  const storage = persistent ? window.localStorage : window.sessionStorage
  storage.setItem(persistent ? LOCAL_TOKEN_KEY : SESSION_TOKEN_KEY, token)
}

export function clearStoredToken() {
  window.localStorage.removeItem(LOCAL_TOKEN_KEY)
  window.sessionStorage.removeItem(SESSION_TOKEN_KEY)
}
