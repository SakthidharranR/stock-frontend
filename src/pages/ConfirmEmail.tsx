import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../context/AuthContext'
import { isCognitoConfigured } from '../lib/cognitoConfig'
import {
  clearPendingSignUp,
  confirmSignUp,
  getPendingSignUp,
  resendConfirmationCode,
  signIn,
  storePendingNewPasswordChallenge,
} from '../lib/cognito'
import { isIdentityApiConfigured, registerWithBackend } from '../lib/identityApi'
import './Login.css'

export function ConfirmEmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setSession } = useAuth()

  const routeState = location.state as {
    email?: string
    displayName?: string
    cognitoSub?: string
    syncWarning?: string
  } | null
  const emailFromState = routeState?.email ?? ''
  const displayNameFromState = routeState?.displayName ?? ''
  const cognitoSubFromState = routeState?.cognitoSub ?? ''
  const syncWarning = routeState?.syncWarning ?? null
  const pending = getPendingSignUp()
  const email = emailFromState || pending?.email || ''

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (!email) {
      navigate('/register', { replace: true })
    }
  }, [email, navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!isCognitoConfigured()) {
      setError('Cognito is not configured. Add your pool settings to .env.')
      return
    }

    const trimmedCode = code.trim()
    if (!trimmedCode) {
      setError('Enter the verification code from your email.')
      return
    }

    setIsSubmitting(true)
    try {
      await confirmSignUp(email, trimmedCode)

      const signup = getPendingSignUp()
      const cognitoSub = signup?.cognitoSub ?? cognitoSubFromState

      if (
        syncWarning &&
        cognitoSub &&
        isIdentityApiConfigured()
      ) {
        try {
          await registerWithBackend({
            email,
            display_name: displayNameFromState || undefined,
            cognito_sub: cognitoSub,
          })
        } catch {
          // User is confirmed in Cognito; they can fix backend separately.
        }
      }

      if (signup?.email === email && signup.password) {
        const result = await signIn(email, signup.password)
        clearPendingSignUp()

        if (result.status === 'success') {
          setSession({
            email: result.email,
            tokens: result.tokens,
          })
          navigate('/home', { replace: true })
          return
        }

        storePendingNewPasswordChallenge(result.cognitoUser, email)
        navigate('/change-password', {
          replace: true,
          state: { reason: 'new_password_required', email },
        })
        return
      }

      clearPendingSignUp()
      setSuccess('Email confirmed. You can log in now.')
      navigate('/login', {
        replace: true,
        state: { message: 'Email confirmed. Log in with your password.' },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResend() {
    setError(null)
    setSuccess(null)

    if (!isCognitoConfigured()) {
      setError('Cognito is not configured.')
      return
    }

    setIsResending(true)
    try {
      await resendConfirmationCode(email)
      setSuccess(
        'A new code was sent. Check your inbox and spam folder — it can take a few minutes.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend code.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AuthLayout
      title="Confirm your email"
      subtitle={
        email
          ? `We sent a verification code to ${email}.`
          : 'Enter your verification code.'
      }
      footer={
        <p>
          <Link to="/register">Back to sign up</Link>
          {' · '}
          <Link to="/login">Log in</Link>
        </p>
      }
    >
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="confirm-spam-notice" role="note">
          <strong>Check your spam or junk folder</strong>
          Verification emails often land there instead of your inbox — especially
          the first time. Also look in Promotions or Updates if you use Gmail.
          <ul>
            <li>Sender may appear as Amazon Web Services or no-reply@verificationemail.com</li>
            <li>Wait 2–3 minutes, then try <strong>Resend code</strong> below if you still don&apos;t see it</li>
          </ul>
        </div>

        {syncWarning ? (
          <div className="login-alert" role="alert">
            Profile sync failed: {syncWarning}
          </div>
        ) : null}

        {error ? (
          <div className="login-alert" role="alert">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="register-success" role="status">
            {success}
          </div>
        ) : null}

        <label className="login-field">
          <span className="login-label">Verification code</span>
          <input
            type="text"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </label>

        <button
          type="submit"
          className="login-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Verifying…' : 'Verify email'}
        </button>

        <button
          type="button"
          className="register-secondary-btn"
          onClick={handleResend}
          disabled={isResending || isSubmitting}
        >
          {isResending ? 'Sending…' : 'Resend code'}
        </button>
      </form>
    </AuthLayout>
  )
}
