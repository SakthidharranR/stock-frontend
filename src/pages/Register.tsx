import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { useAuth } from '../context/AuthContext'
import { PRODUCT_NAME } from '../lib/brand'
import {
  isCognitoConfigured,
  isDevAuthBypass,
  devAuthTokens,
} from '../lib/cognitoConfig'
import {
  signIn,
  signUp,
  storePendingNewPasswordChallenge,
  storePendingSignUp,
} from '../lib/cognito'
import {
  isIdentityApiConfigured,
  syncProfileWithBackend,
} from '../lib/identityApi'
import {
  passwordsMatch,
  validatePassword,
} from '../lib/passwordValidation'
import './Login.css'

function devCognitoSub(): string {
  return `dev-${crypto.randomUUID()}`
}

export function Register() {
  const navigate = useNavigate()
  const { setSession, isAuthenticated } = useAuth()
  const devBypass = isDevAuthBypass()

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true })
    }
  }, [isAuthenticated, navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (devBypass) {
      if (!isIdentityApiConfigured()) {
        setError(
          'Dev mode requires VITE_IDENTITY_API_URL in .env (e.g. http://localhost:8081).',
        )
        return
      }
    } else if (!isCognitoConfigured()) {
      setError('Cognito is not configured. Add your pool settings to .env.')
      return
    }

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      setError('Enter your email.')
      return
    }

    if (!devBypass) {
      const passwordIssues = validatePassword(password)
      if (passwordIssues.length > 0) {
        setError(`Password must have: ${passwordIssues.join(', ')}.`)
        return
      }

      if (!passwordsMatch(password, confirmPassword)) {
        setError('Passwords do not match.')
        return
      }
    }

    setIsSubmitting(true)
    try {
      if (devBypass) {
        const syncError = await syncProfileWithBackend({
          email: trimmedEmail,
          display_name: displayName.trim() || undefined,
          cognito_sub: devCognitoSub(),
        })
        if (syncError) {
          setError(syncError)
          return
        }

        setSession({
          email: trimmedEmail,
          tokens: devAuthTokens(),
        })
        navigate('/home', {
          replace: true,
          state: syncError ? { syncWarning: syncError } : undefined,
        })
        return
      }

      const result = await signUp(
        trimmedEmail,
        password,
        displayName.trim() || undefined,
      )

      const syncWarning = await syncProfileWithBackend({
        email: result.email,
        display_name: displayName.trim() || undefined,
        cognito_sub: result.userSub,
      })

      if (result.userConfirmed) {
        const signInResult = await signIn(trimmedEmail, password)
        if (signInResult.status === 'success') {
          setSession({
            email: signInResult.email,
            tokens: signInResult.tokens,
          })
          navigate('/home', {
            replace: true,
            state: syncWarning ? { syncWarning } : undefined,
          })
        } else {
          storePendingNewPasswordChallenge(
            signInResult.cognitoUser,
            trimmedEmail,
          )
          navigate('/change-password', {
            replace: true,
            state: { reason: 'new_password_required', email: trimmedEmail },
          })
        }
        return
      }

      storePendingSignUp({
        email: trimmedEmail,
        password,
        cognitoSub: result.userSub,
      })
      navigate('/confirm-email', {
        replace: true,
        state: {
          email: trimmedEmail,
          cognitoSub: result.userSub,
          displayName: displayName.trim(),
          ...(syncWarning ? { syncWarning } : {}),
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const passwordIssues =
    password.length > 0 ? validatePassword(password) : []

  return (
    <AuthLayout
      title="Sign up"
      subtitle={
        devBypass
          ? 'Dev mode: email and display name are sent to the identity backend only.'
          : `Create a ${PRODUCT_NAME} account to start paper trading.`
      }
      footer={
        <p>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      }
    >
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        {devBypass ? (
          <div className="register-success" role="status">
            Cognito is skipped. Start the Go server on port 8081 before signing
            up.
          </div>
        ) : (
          <>
            <GoogleSignInButton disabled={isSubmitting} />
            <div className="auth-divider" role="separator">
              <span>or sign up with email</span>
            </div>
          </>
        )}

        {error ? (
          <div className="login-alert" role="alert">
            {error}
          </div>
        ) : null}

        <label className="login-field">
          <span className="login-label">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </label>

        <label className="login-field">
          <span className="login-label">Display name</span>
          <input
            type="text"
            name="displayName"
            autoComplete="name"
            placeholder="How we'll show your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={isSubmitting}
          />
        </label>

        {!devBypass ? (
          <>
            <label className="login-field">
              <span className="login-label">Password</span>
              <div className="login-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  className="login-toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {passwordIssues.length > 0 ? (
                <ul className="register-hints">
                  {passwordIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : password.length > 0 ? (
                <p className="register-hints-ok">Password meets requirements</p>
              ) : null}
            </label>

            <label className="login-field">
              <span className="login-label">Confirm password</span>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </label>
          </>
        ) : null}

        <button
          type="submit"
          className="login-submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? devBypass
              ? 'Sending to backend…'
              : 'Creating account…'
            : devBypass
              ? 'Register (backend only)'
              : 'Sign up'}
        </button>
      </form>
    </AuthLayout>
  )
}
