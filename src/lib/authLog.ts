/** Dev-only auth logging. Set VITE_AUTH_DEBUG=true to enable in production builds. */
import { pushAuthEvent } from './authDebugStore'

export function isAuthDebugEnabled(): boolean {
  return (
    import.meta.env.DEV || import.meta.env.VITE_AUTH_DEBUG === 'true'
  )
}

export function authLog(message: string, data?: Record<string, unknown>): void {
  if (!isAuthDebugEnabled()) return
  pushAuthEvent('log', message, data)
  if (data) {
    console.log(`[auth] ${message}`, data)
  } else {
    console.log(`[auth] ${message}`)
  }
}

export function authWarn(message: string, data?: Record<string, unknown>): void {
  if (!isAuthDebugEnabled()) return
  pushAuthEvent('warn', message, data)
  if (data) {
    console.warn(`[auth] ${message}`, data)
  } else {
    console.warn(`[auth] ${message}`)
  }
}

export function authError(message: string, data?: Record<string, unknown>): void {
  if (!isAuthDebugEnabled()) return
  pushAuthEvent('error', message, data)
  if (data) {
    console.error(`[auth] ${message}`, data)
  } else {
    console.error(`[auth] ${message}`)
  }
}

export function paramsToObject(params: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {}
  params.forEach((value, key) => {
    out[key] = value
  })
  return out
}
