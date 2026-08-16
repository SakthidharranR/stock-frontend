import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { bindAuthBridge } from '../lib/authBridge'
import {
  isJwtExpired,
  refreshSessionTokens,
  signOut as cognitoSignOut,
  type AuthTokens,
} from '../lib/cognito'
import { isDevAuthBypass } from '../lib/cognitoConfig'

const STORAGE_KEY = 'stock_auth_session'

type StoredSession = {
  email: string
  tokens: AuthTokens
}

type AuthContextValue = {
  email: string | null
  accessToken: string | null
  idToken: string | null
  isAuthenticated: boolean
  setSession: (session: StoredSession) => void
  clearSession: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredSession
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<StoredSession | null>(loadSession)

  const setSession = useCallback((next: StoredSession) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setSessionState(next)
  }, [])

  const clearSession = useCallback(() => {
    if (!isDevAuthBypass()) {
      cognitoSignOut()
    }
    sessionStorage.removeItem(STORAGE_KEY)
    setSessionState(null)
  }, [])

  const setTokens = useCallback((tokens: AuthTokens) => {
    setSessionState((prev) => {
      if (!prev) return prev
      const next = { ...prev, tokens }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  useLayoutEffect(() => {
    bindAuthBridge({
      getSession: () => {
        try {
          const raw = sessionStorage.getItem(STORAGE_KEY)
          if (!raw) return null
          return JSON.parse(raw) as StoredSession
        } catch {
          return null
        }
      },
      setTokens,
      clearSession,
    })
    return () => bindAuthBridge(null)
  }, [setTokens, clearSession])

  // Proactively refresh an expired access token after reload / tab restore.
  useEffect(() => {
    if (!session || isDevAuthBypass()) return
    if (session.tokens.accessToken.startsWith('dev-')) return
    if (!isJwtExpired(session.tokens.accessToken)) return
    if (!session.tokens.refreshToken) {
      clearSession()
      return
    }

    let cancelled = false
    void refreshSessionTokens(session.email, session.tokens.refreshToken)
      .then((tokens) => {
        if (!cancelled) setTokens(tokens)
      })
      .catch(() => {
        if (!cancelled) clearSession()
      })

    return () => {
      cancelled = true
    }
  }, [session, setTokens, clearSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      email: session?.email ?? null,
      accessToken: session?.tokens.accessToken ?? null,
      idToken: session?.tokens.idToken ?? null,
      isAuthenticated: Boolean(session?.tokens.accessToken),
      setSession,
      clearSession,
    }),
    [session, setSession, clearSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
