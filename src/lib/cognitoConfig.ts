function requireEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env and add your Cognito settings.`,
    )
  }
  return value.trim()
}

export function getCognitoConfig() {
  return {
    region: requireEnv('VITE_COGNITO_REGION'),
    userPoolId: requireEnv('VITE_COGNITO_USER_POOL_ID'),
    clientId: requireEnv('VITE_COGNITO_CLIENT_ID'),
  }
}

export function isCognitoConfigured(): boolean {
  const poolId = import.meta.env.VITE_COGNITO_USER_POOL_ID?.trim()
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID?.trim()
  if (!poolId || !clientId) return false
  // Treat .env.example placeholders as not configured
  if (poolId.includes('XXXXXXXXX') || clientId.startsWith('your_')) {
    return false
  }
  return true
}

/** Local dev only: skip Cognito and use backend-only auth flows. */
export function isDevAuthBypass(): boolean {
  return import.meta.env.VITE_DEV_SKIP_COGNITO === 'true'
}

/** Fake tokens for dev mode — never sent to a real API. */
export function devAuthTokens() {
  return {
    accessToken: 'dev-access-token',
    idToken: 'dev-id-token',
    refreshToken: 'dev-refresh-token',
  }
}
