import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { AuthDevPanel } from '../components/AuthDevPanel'
import { useAuth } from '../context/AuthContext'
import {
  authError,
  authLog,
  isAuthDebugEnabled,
  paramsToObject,
} from '../lib/authLog'
import {
  acquireOAuthCodeLock,
  completeGoogleSignIn,
  consumeOAuthRedirect,
  getOAuthRedirectUri,
  isGoogleSsoConfigured,
  markOAuthCodeComplete,
  releaseOAuthCodeLock,
} from '../lib/cognitoOAuth'
import { syncProfileWithBackend } from '../lib/identityApi'
import './Login.css'

function formatOAuthError(params: URLSearchParams): string {
  const error = params.get('error')
  const description = params.get('error_description')

  if (description === 'invalid_scope' || description?.includes('invalid_scope')) {
    return (
      'invalid_scope: Cognito rejected the OAuth scopes. In AWS Console → StockApp → ' +
      'Login pages → Edit, enable OpenID Connect scopes: openid and email (and profile if you want names). ' +
      'Then restart and try again.'
    )
  }

  if (error && description) {
    return `${error}: ${description}`
  }
  return description ?? error ?? 'OAuth sign-in failed.'
}

export function AuthCallback() {
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [debugDetails, setDebugDetails] = useState<Record<string, string> | null>(
    null,
  )
  const showDebug = isAuthDebugEnabled()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const query = paramsToObject(params)

    authLog('Auth callback loaded', {
      path: window.location.pathname,
      query,
      redirectUri: getOAuthRedirectUri(),
      googleSsoConfigured: isGoogleSsoConfigured(),
    })

    if (showDebug) {
      setDebugDetails(query)
    }

    if (!isGoogleSsoConfigured()) {
      const message = 'Google SSO is not configured.'
      authError(message)
      setError(message)
      return
    }

    const oauthError = params.get('error')
    if (oauthError) {
      const message = formatOAuthError(params)
      authError('OAuth error returned in callback URL', query)
      setError(message)
      return
    }

    const code = params.get('code')
    const state = params.get('state')
    if (!code || !state) {
      const message = 'Missing authorization response. Try signing in again.'
      authError(message, query)
      setError(message)
      return
    }

    if (!acquireOAuthCodeLock(code)) {
      authLog('Skipping duplicate OAuth callback (already handled)', { code })
      return
    }

    void (async () => {
      try {
        authLog('Processing authorization code')
        const result = await completeGoogleSignIn(code, state)

        authLog('Syncing profile with identity backend', {
          email: result.email,
          sub: result.sub,
        })

        const syncWarning = await syncProfileWithBackend({
          email: result.email,
          display_name: result.name,
          cognito_sub: result.sub,
        })

        if (syncWarning) {
          authError('Profile sync warning', { syncWarning })
        }

        setSession({
          email: result.email,
          tokens: result.tokens,
        })

        markOAuthCodeComplete(code)

        const redirectTo = consumeOAuthRedirect()
        authLog('Redirecting after successful sign-in', { redirectTo })
        navigate(redirectTo, {
          replace: true,
          state: syncWarning ? { syncWarning } : undefined,
        })
      } catch (err) {
        releaseOAuthCodeLock(code)
        const message =
          err instanceof Error ? err.message : 'Google sign-in failed.'
        authError('Auth callback failed', { message })
        setError(message)
      }
    })()
  }, [navigate, setSession, showDebug])

  return (
    <AuthLayout
      title="Signing you in"
      subtitle="Completing Google sign-in…"
      footer={
        error ? (
          <p>
            <Link to="/login">Back to log in</Link>
          </p>
        ) : null
      }
    >
      {error ? (
        <div className="login-alert" role="alert">
          {error}
        </div>
      ) : (
        <p className="auth-placeholder">Just a moment…</p>
      )}

      {showDebug && debugDetails ? (
        <details className="auth-debug-panel">
          <summary>OAuth callback params</summary>
          <pre>{JSON.stringify(debugDetails, null, 2)}</pre>
        </details>
      ) : null}

      <AuthDevPanel page="AuthCallback" />
    </AuthLayout>
  )
}
