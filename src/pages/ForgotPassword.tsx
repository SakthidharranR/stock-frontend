import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { confirmForgotPassword, forgotPassword } from '../lib/cognito'
import { isCognitoConfigured, isDevAuthBypass } from '../lib/cognitoConfig'
import {
  fetchPasswordOptions,
  isIdentityApiConfigured,
} from '../lib/identityApi'
import {
  passwordsMatch,
  validatePassword,
} from '../lib/passwordValidation'
import './Login.css'

type Step = 'request' | 'confirm'

export function ForgotPassword() {
  const navigate = useNavigate()
  const devBypass = isDevAuthBypass()

  const [step, setStep] = useState<Step>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [ssoNotice, setSsoNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const passwordIssues =
    password.length > 0 ? validatePassword(password) : []

  async function handleRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setSsoNotice(null)

    if (devBypass) {
      setError('Password reset requires Cognito. Turn off VITE_DEV_SKIP_COGNITO.')
      return
    }

    if (!isCognitoConfigured()) {
      setError('Cognito is not configured. Add your pool settings to .env.')
      return
    }

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      setError('Enter your email.')
      return
    }

    setIsSubmitting(true)
    try {
      if (isIdentityApiConfigured()) {
        try {
          const options = await fetchPasswordOptions(trimmedEmail)
          if (options.found && !options.can_use_password) {
            setSsoNotice(
              options.message ??
                'This account uses Google sign-in, so there is no password to reset. Use Continue with Google on the login page.',
            )
            return
          }
        } catch {
          // Fall through to Cognito forgot-password if lookup fails.
        }
      }

      await forgotPassword(trimmedEmail)
      setEmail(trimmedEmail)
      setStep('confirm')
      setSuccess(
        'Reset code sent. Check your inbox and spam folder — it can take a few minutes.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset code.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const trimmedCode = code.trim()
    if (!trimmedCode) {
      setError('Enter the verification code from your email.')
      return
    }

    const issues = validatePassword(password)
    if (issues.length > 0) {
      setError(`Password requirements: ${issues.join(', ')}.`)
      return
    }

    if (!passwordsMatch(password, confirmPassword)) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      await confirmForgotPassword(email, trimmedCode, password)
      navigate('/login', {
        replace: true,
        state: {
          message: 'Password updated. Log in with your new password.',
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Forgot password"
      subtitle={
        step === 'request'
          ? "Enter your email and we'll send a reset code."
          : `Enter the code sent to ${email} and choose a new password.`
      }
      footer={
        <p>
          <Link to="/login">Back to log in</Link>
        </p>
      }
    >
      {step === 'request' ? (
        <form className="login-form" onSubmit={handleRequestCode} noValidate>
          {devBypass ? (
            <div className="register-success" role="status">
              Cognito is skipped in dev mode. Password reset is not available.
            </div>
          ) : null}

          {error ? (
            <div className="login-alert" role="alert">
              {error}
            </div>
          ) : null}
          {ssoNotice ? (
            <div className="confirm-spam-notice" role="status">
              <strong>Google sign-in account</strong>
              {ssoNotice}
            </div>
          ) : null}
          {success ? (
            <div className="register-success" role="status">
              {success}
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
              onChange={(e) => {
                setEmail(e.target.value)
                setSsoNotice(null)
              }}
              disabled={isSubmitting}
              required
            />
          </label>

          <button
            type="submit"
            className="login-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Checking…' : 'Send reset code'}
          </button>
        </form>
      ) : (
        <form className="login-form" onSubmit={handleResetPassword} noValidate>
          <div className="confirm-spam-notice" role="note">
            <strong>Check your spam or junk folder</strong>
            Reset codes often land there instead of your inbox.
          </div>

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

          <label className="login-field">
            <span className="login-label">New password</span>
            <div className="login-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="new-password"
                placeholder="New password"
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
            <span className="login-label">Confirm new password</span>
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </label>

          <button
            type="submit"
            className="login-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating…' : 'Reset password'}
          </button>

          <button
            type="button"
            className="register-secondary-btn"
            onClick={() => {
              setStep('request')
              setCode('')
              setPassword('')
              setConfirmPassword('')
              setError(null)
              setSuccess(null)
            }}
            disabled={isSubmitting}
          >
            Use a different email
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
