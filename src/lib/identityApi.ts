import { buildAuthHeaders } from './apiAuth'

export type RegisterPayload = {
  email: string
  display_name?: string
  cognito_sub: string
}

export type RegisterResponse = {
  email: string
  display_name?: string
  cognito_sub: string
  message: string
}

export type PasswordOptionsResponse = {
  email: string
  found: boolean
  can_use_password: boolean
  providers: string[]
  message: string | null
}

export function isIdentityApiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_IDENTITY_API_URL?.trim())
}

function getIdentityApiUrl(): string {
  const url = import.meta.env.VITE_IDENTITY_API_URL?.trim()
  if (!url) {
    throw new Error(
      'Missing VITE_IDENTITY_API_URL. Copy .env.example to .env and set the identity service URL.',
    )
  }
  return url.replace(/\/$/, '')
}

export async function registerWithBackend(
  payload: RegisterPayload,
): Promise<RegisterResponse> {
  const res = await fetch(`${getIdentityApiUrl()}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email,
      display_name: payload.display_name ?? '',
      cognito_sub: payload.cognito_sub,
    }),
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(
      body?.error ?? `Identity service returned ${res.status}`,
    )
  }

  return res.json() as Promise<RegisterResponse>
}

export async function fetchCurrentUser(
  accessToken: string | null,
  email: string | null,
): Promise<{ id: string; email: string; display_name?: string }> {
  const headers = buildAuthHeaders(accessToken, email)
  const res = await fetch(`${getIdentityApiUrl()}/users/me`, { headers })
  if (!res.ok) {
    throw new Error(`Failed to fetch profile (${res.status})`)
  }
  return res.json()
}

export async function fetchPasswordOptions(
  email: string,
): Promise<PasswordOptionsResponse> {
  const res = await fetch(`${getIdentityApiUrl()}/auth/password-options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Password options failed (${res.status})`)
  }
  return res.json() as Promise<PasswordOptionsResponse>
}

/** Creates profile on first sign-in; ignores duplicate user errors on return visits. */
export async function syncProfileWithBackend(
  payload: RegisterPayload,
): Promise<string | null> {
  if (!isIdentityApiConfigured()) {
    return 'Identity API URL is not configured. Add VITE_IDENTITY_API_URL to .env.'
  }

  try {
    await registerWithBackend(payload)
    return null
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Identity service unavailable'
    if (
      message.toLowerCase().includes('already') ||
      message.includes('409')
    ) {
      return null
    }
    return message
  }
}
