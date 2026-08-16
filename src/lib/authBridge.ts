import {
  isJwtExpired,
  refreshSessionTokens,
  type AuthTokens,
} from './cognito'
import { isDevAuthBypass } from './cognitoConfig'

type SessionSnapshot = {
  email: string
  tokens: AuthTokens
}

type AuthBridge = {
  getSession: () => SessionSnapshot | null
  setTokens: (tokens: AuthTokens) => void
  clearSession: () => void
}

let bridge: AuthBridge | null = null
let refreshInFlight: Promise<string | null> | null = null

export function bindAuthBridge(next: AuthBridge | null) {
  bridge = next
}

/** Return a non-expired access token, refreshing via Cognito when needed. */
export async function resolveAccessToken(): Promise<string | null> {
  const session = bridge?.getSession() ?? null
  if (!session?.tokens.accessToken) return null

  if (isDevAuthBypass() || session.tokens.accessToken.startsWith('dev-')) {
    return session.tokens.accessToken
  }

  if (!isJwtExpired(session.tokens.accessToken)) {
    return session.tokens.accessToken
  }

  if (!session.tokens.refreshToken) {
    bridge?.clearSession()
    return null
  }

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const tokens = await refreshSessionTokens(
          session.email,
          session.tokens.refreshToken,
        )
        bridge?.setTokens(tokens)
        return tokens.accessToken
      } catch {
        bridge?.clearSession()
        return null
      } finally {
        refreshInFlight = null
      }
    })()
  }

  return refreshInFlight
}
