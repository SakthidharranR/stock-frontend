import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../context/AuthContext'
import {
  changePassword,
  completeNewPasswordChallenge,
  getPendingNewPasswordChallenge,
} from '../lib/cognito'
import { isCognitoConfigured, isDevAuthBypass } from '../lib/cognitoConfig'
import {
  passwordsMatch,
  validatePassword,
} from '../lib/passwordValidation'
import './Login.css'

type ChangePasswordState = {
  reason?: 'new_password_required'
  email?: string
}

export function ChangePassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setSession, isAuthenticated, email: sessionEmail } = useAuth()
  const devBypass = isDevAuthBypass()

  const state = (location.state as ChangePasswordState | null) ?? {}
  const isForced = state.reason === 'new_password_required'
  const forcedEmail = state.email ?? getPendingNewPasswordChallenge()?.email ?? ''

  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const passwordIssues =
    password.length > 0 ? validatePassword(password) : []

  useEffect(() => {
    if (isForced && !devBypass && !getPendingNewPasswordChallenge()) {
      navigate('/login', {
        replace: true,
        state: {
          message: 'Sign in again to set your new password.',
        },
      })
    }
  }, [isForced, devBypass, navigate])

  useEffect(() => {
    if (!isForced && !devBypass && !isAuthenticated) {
      navigate('/login', {
        replace: true,
        state: { from: '/change-password' },
      })
    }
  }, [isForced, devBypass, isAuthenticated, navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (devBypass) {
      setSuccess('Dev mode: password changes are not sent to Cognito.')
      return
    }

    if (!isCognitoConfigured()) {
      setError('Cognito is not configured. Add your pool settings to .env.')
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
      if (isForced) {
        const pending = getPendingNewPasswordChallenge()
        if (!pending) {
          setError('Session expired. Sign in again to set your new password.')
          return
        }

        const result = await completeNewPasswordChallenge(
          pending.cognitoUser,
          password,
        )

        setSession({
          email: result.email,
          tokens: result.tokens,
        })
        navigate('/home', { replace: true })
        return
      }

      if (!currentPassword) {
        setError('Enter your current password.')
        return
      }

      await changePassword(currentPassword, password)
      setSuccess('Password updated successfully.')
      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title={isForced ? 'Set a new password' : 'Change password'}
      subtitle={
        isForced
          ? `Cognito requires a new password${forcedEmail ? ` for ${forcedEmail}` : ''}.`
          : sessionEmail
            ? `Update the password for ${sessionEmail}.`
            : 'Update your password while signed in.'
      }
      footer={
        <p>
          {isForced || !isAuthenticated ? (
            <Link to="/login">Back to log in</Link>
          ) : (
            <Link to="/home">Back to home</Link>
          )}
        </p>
      }
    >
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        {devBypass ? (
          <div className="register-success" role="status">
            Cognito is skipped in dev mode. Password changes are not applied.
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

        {!isForced && !devBypass ? (
          <label className="login-field">
            <span className="login-label">Current password</span>
            <div className="login-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="currentPassword"
                autoComplete="current-password"
                placeholder="Your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
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
          </label>
        ) : null}

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
          {isSubmitting
            ? 'Saving…'
            : isForced
              ? 'Set password & continue'
              : 'Update password'}
        </button>
      </form>
    </AuthLayout>
  )
}
