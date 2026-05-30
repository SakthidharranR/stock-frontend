import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { signOut as cognitoSignOut, type AuthTokens } from '../lib/cognito'
import { isDevAuthBypass } from '../lib/cognitoConfig'

const STORAGE_KEY = 'stock_auth_session'

type StoredSession = {
  email: string
  tokens: AuthTokens
}

type AuthContextValue = {
  email: string | null
  accessToken: string | null
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

  const value = useMemo<AuthContextValue>(
    () => ({
      email: session?.email ?? null,
      accessToken: session?.tokens.accessToken ?? null,
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
