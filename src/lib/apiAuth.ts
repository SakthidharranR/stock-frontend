import { isDevAuthBypass } from './cognitoConfig'

export function buildAuthHeaders(
  accessToken: string | null,
  email: string | null,
): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }
  if (isDevAuthBypass() && accessToken?.startsWith('dev-') && email) {
    headers['X-Dev-Email'] = email
  }
  return headers
}
