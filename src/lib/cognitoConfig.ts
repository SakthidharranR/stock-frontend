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
  return Boolean(
    import.meta.env.VITE_COGNITO_USER_POOL_ID &&
      import.meta.env.VITE_COGNITO_CLIENT_ID,
  )
}
