const LOCAL_TOKEN_KEY = 'gms.auth.token'
const SESSION_TOKEN_KEY = 'gms.auth.token.session'

export type StoredAuthToken = {
  token: string | null
  persistent: boolean
}

export function loadStoredToken(): StoredAuthToken {
  const localToken = window.localStorage.getItem(LOCAL_TOKEN_KEY)
  if (localToken) {
    return { token: localToken, persistent: true }
  }

  const sessionToken = window.sessionStorage.getItem(SESSION_TOKEN_KEY)
  if (sessionToken) {
    return { token: sessionToken, persistent: false }
  }

  return { token: null, persistent: false }
}

export function storeToken(token: string, persistent: boolean) {
  clearStoredToken()
  if (persistent) {
    window.localStorage.setItem(LOCAL_TOKEN_KEY, token)
    return
  }

  window.sessionStorage.setItem(SESSION_TOKEN_KEY, token)
}

export function clearStoredToken() {
  window.localStorage.removeItem(LOCAL_TOKEN_KEY)
  window.sessionStorage.removeItem(SESSION_TOKEN_KEY)
}
