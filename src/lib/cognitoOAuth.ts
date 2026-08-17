import { getCognitoConfig, isCognitoConfigured } from './cognitoConfig'
import type { AuthTokens } from './cognito'
import { authError, authLog } from './authLog'

const PKCE_VERIFIER_KEY = 'stock_oauth_pkce_verifier'
const OAUTH_STATE_KEY = 'stock_oauth_state'
const OAUTH_REDIRECT_KEY = 'stock_oauth_redirect'
const OAUTH_CODE_LOCK_PREFIX = 'stock_oauth_code_lock_'

export type IdTokenClaims = {
  sub: string
  email: string
  name?: string
}

export type GoogleSignInResult = {
  tokens: AuthTokens
  sub: string
  email: string
  name?: string
}

export function isGoogleSsoConfigured(): boolean {
  if (!isCognitoConfigured()) return false
  return Boolean(import.meta.env.VITE_COGNITO_DOMAIN?.trim())
}

export function getOAuthScopes(): string {
  const fromEnv = import.meta.env.VITE_COGNITO_OAUTH_SCOPES?.trim()
  if (fromEnv) return fromEnv
  // Default: openid + email only (profile must be enabled separately on app client)
  return 'openid email'
}

export function getOAuthRedirectUri(): string {
  const fromEnv = import.meta.env.VITE_COGNITO_OAUTH_REDIRECT_URI?.trim()
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`
  }
  return 'http://localhost:5173/auth/callback'
}

export function getGoogleSsoSetupHint(): string | null {
  if (!isCognitoConfigured()) {
    return 'Add Cognito pool settings to .env first.'
  }
  if (!import.meta.env.VITE_COGNITO_DOMAIN?.trim()) {
    return 'Add VITE_COGNITO_DOMAIN to .env (Cognito → App integration → Domain).'
  }
  return null
}

function normalizeCognitoDomain(raw: string): string {
  return raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
}

function getOAuthSettings() {
  const { clientId } = getCognitoConfig()
  const domain = normalizeCognitoDomain(import.meta.env.VITE_COGNITO_DOMAIN ?? '')
  const redirectUri = getOAuthRedirectUri()

  if (!domain) {
    throw new Error(
      'Google SSO is not configured. Set VITE_COGNITO_DOMAIN in .env to your Cognito domain (e.g. my-app.auth.us-east-1.amazoncognito.com).',
    )
  }

  return { clientId, domain, redirectUri }
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const verifier = base64UrlEncode(bytes)
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  )
  const challenge = base64UrlEncode(new Uint8Array(digest))
  return { verifier, challenge }
}

function createOAuthState(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

export function parseIdToken(idToken: string): IdTokenClaims {
  const parts = idToken.split('.')
  if (parts.length < 2) {
    throw new Error('Invalid ID token.')
  }

  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
  const json = JSON.parse(atob(padded)) as {
    sub?: string
    email?: string
    name?: string
    given_name?: string
  }

  if (!json.sub || !json.email) {
    throw new Error('ID token is missing required user information.')
  }

  return {
    sub: json.sub,
    email: json.email.toLowerCase(),
    name: json.name ?? json.given_name,
  }
}

export function startGoogleSignIn(redirectTo = '/home'): void {
  void (async () => {
    const { clientId, domain, redirectUri } = getOAuthSettings()
    const { verifier, challenge } = await createPkcePair()
    const state = createOAuthState()

    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier)
    sessionStorage.setItem(OAUTH_STATE_KEY, state)
    sessionStorage.setItem(OAUTH_REDIRECT_KEY, redirectTo)

    const scope = getOAuthScopes()
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      identity_provider: 'Google',
      prompt: 'select_account',
    })

    const authorizeUrl = `https://${domain}/oauth2/authorize?${params.toString()}`
    authLog('Starting Google SSO redirect', {
      domain,
      clientId,
      redirectUri,
      scope,
      identityProvider: 'Google',
      authorizeUrl,
    })

    window.location.assign(authorizeUrl)
  })()
}

export function consumeOAuthRedirect(): string {
  const redirect = sessionStorage.getItem(OAUTH_REDIRECT_KEY) ?? '/home'
  sessionStorage.removeItem(OAUTH_REDIRECT_KEY)
  return redirect
}

/** Prevents React Strict Mode from processing the same authorization code twice. */
export function acquireOAuthCodeLock(code: string): boolean {
  const key = `${OAUTH_CODE_LOCK_PREFIX}${code}`
  if (sessionStorage.getItem(key)) {
    return false
  }
  sessionStorage.setItem(key, 'processing')
  return true
}

export function releaseOAuthCodeLock(code: string): void {
  sessionStorage.removeItem(`${OAUTH_CODE_LOCK_PREFIX}${code}`)
}

export function markOAuthCodeComplete(code: string): void {
  sessionStorage.setItem(`${OAUTH_CODE_LOCK_PREFIX}${code}`, 'done')
}

export async function completeGoogleSignIn(
  code: string,
  state: string,
): Promise<GoogleSignInResult> {
  const savedState = sessionStorage.getItem(OAUTH_STATE_KEY)
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY)

  if (!savedState || state !== savedState) {
    authError('OAuth state mismatch or missing', {
      hasSavedState: Boolean(savedState),
      stateMatches: savedState === state,
    })
    throw new Error('Sign-in session expired. Try again.')
  }
  if (!verifier) {
    authError('PKCE verifier missing from sessionStorage')
    throw new Error('Sign-in session expired. Try again.')
  }

  const { clientId, domain, redirectUri } = getOAuthSettings()
  authLog('Exchanging authorization code for tokens', {
    domain,
    clientId,
    redirectUri,
    codeLength: code.trim().length,
  })

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    code: code.trim(),
    redirect_uri: redirectUri,
    code_verifier: verifier,
  })

  const res = await fetch(`https://${domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as {
      error_description?: string
      error?: string
    } | null
    authError('Token exchange failed', {
      status: res.status,
      statusText: res.statusText,
      error: errBody?.error,
      errorDescription: errBody?.error_description,
    })
    throw new Error(
      errBody?.error_description ??
        errBody?.error ??
        `Could not complete Google sign-in (HTTP ${res.status}).`,
    )
  }

  const data = (await res.json()) as {
    access_token?: string
    id_token?: string
    refresh_token?: string
  }

  if (!data.access_token || !data.id_token || !data.refresh_token) {
    throw new Error('Incomplete token response from Cognito.')
  }

  const claims = parseIdToken(data.id_token)

  authLog('Google SSO succeeded', {
    email: claims.email,
    sub: claims.sub,
    name: claims.name,
    hasAccessToken: Boolean(data.access_token),
    hasRefreshToken: Boolean(data.refresh_token),
  })

  sessionStorage.removeItem(OAUTH_STATE_KEY)
  sessionStorage.removeItem(PKCE_VERIFIER_KEY)

  return {
    tokens: {
      accessToken: data.access_token,
      idToken: data.id_token,
      refreshToken: data.refresh_token,
    },
    sub: claims.sub,
    email: claims.email,
    name: claims.name,
  }
}
