import { isCognitoConfigured, isDevAuthBypass } from './cognitoConfig'
import {
  getOAuthRedirectUri,
  getOAuthScopes,
  isGoogleSsoConfigured,
} from './cognitoOAuth'

export type AuthDebugEvent = {
  time: string
  level: 'log' | 'warn' | 'error'
  message: string
  data?: Record<string, unknown>
}

const EVENTS_KEY = 'stock_auth_debug_events'
const MAX_EVENTS = 12

function readEvents(): AuthDebugEvent[] {
  try {
    const raw = sessionStorage.getItem(EVENTS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as AuthDebugEvent[]
  } catch {
    return []
  }
}

function writeEvents(events: AuthDebugEvent[]): void {
  sessionStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)))
}

export function pushAuthEvent(
  level: AuthDebugEvent['level'],
  message: string,
  data?: Record<string, unknown>,
): void {
  const events = readEvents()
  events.unshift({
    time: new Date().toLocaleTimeString(),
    level,
    message,
    data,
  })
  writeEvents(events)
}

export function getAuthDebugEvents(): AuthDebugEvent[] {
  return readEvents()
}

export function clearAuthDebugEvents(): void {
  sessionStorage.removeItem(EVENTS_KEY)
}

export function getAuthDebugSnapshot(): Record<string, unknown> {
  return {
    devMode: import.meta.env.DEV,
    cognitoConfigured: isCognitoConfigured(),
    googleSsoConfigured: isGoogleSsoConfigured(),
    devBypass: isDevAuthBypass(),
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID?.trim() ?? '(missing)',
    domain: import.meta.env.VITE_COGNITO_DOMAIN?.trim() ?? '(missing)',
    redirectUri: getOAuthRedirectUri(),
    scopes: getOAuthScopes(),
  }
}
