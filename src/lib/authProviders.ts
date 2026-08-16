/** Helpers for detecting Google / external Cognito accounts. */

export type FederatedIdentity = {
  providerName?: string
  providerType?: string
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

function parseIdentitiesClaim(raw: unknown): FederatedIdentity[] {
  if (Array.isArray(raw)) {
    return raw.filter(
      (entry): entry is FederatedIdentity =>
        Boolean(entry) && typeof entry === 'object',
    )
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed)
        ? parsed.filter(
            (entry): entry is FederatedIdentity =>
              Boolean(entry) && typeof entry === 'object',
          )
        : []
    } catch {
      return []
    }
  }
  return []
}

export function getExternalProvidersFromIdToken(idToken: string | null | undefined): string[] {
  if (!idToken) return []
  const payload = decodeJwtPayload(idToken)
  if (!payload) return []
  const providers: string[] = []
  for (const item of parseIdentitiesClaim(payload.identities)) {
    const name = item.providerName || item.providerType
    if (typeof name === 'string' && name.trim()) {
      providers.push(name.trim())
    }
  }
  return providers
}

export function isExternalProviderAccount(idToken: string | null | undefined): boolean {
  return getExternalProvidersFromIdToken(idToken).length > 0
}

export function externalProviderPasswordMessage(providers: string[]): string {
  const label =
    providers.find((p) => p.toLowerCase() === 'google') ??
    providers[0] ??
    'Google'
  return (
    `This account uses ${label} sign-in, so there is no password to change or reset. ` +
    'Use Continue with Google on the login page.'
  )
}
