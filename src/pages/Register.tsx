import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../context/AuthContext'
import { isCognitoConfigured } from '../lib/cognitoConfig'
import {
  signIn,
  signUp,
  storePendingSignUp,
} from '../lib/cognito'
import {
  passwordsMatch,
  validatePassword,
} from '../lib/passwordValidation'
import './Login.css'

export function Register() {
  const navigate = useNavigate()
  const { setSession, isAuthenticated } = useAuth()

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

    if (!isCognitoConfigured()) {
      setError('Cognito is not configured. Add your pool settings to .env.')
      return
    }

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      setError('Enter your email.')
      return
    }

    const passwordIssues = validatePassword(password)
    if (passwordIssues.length > 0) {
      setError(`Password must have: ${passwordIssues.join(', ')}.`)
      return
    }

    if (!passwordsMatch(password, confirmPassword)) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await signUp(
        trimmedEmail,
        password,
        displayName.trim() || undefined,
      )

      if (result.userConfirmed) {
        const signInResult = await signIn(trimmedEmail, password)
        if (signInResult.status === 'success') {
          setSession({
            email: signInResult.email,
            tokens: signInResult.tokens,
          })
          navigate('/home', { replace: true })
        } else {
          navigate('/change-password', {
            replace: true,
            state: { reason: 'new_password_required', email: trimmedEmail },
          })
        }
        return
      }

      storePendingSignUp({ email: trimmedEmail, password })
      navigate('/confirm-email', {
        replace: true,
        state: { email: trimmedEmail },
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
      subtitle="Create your account to get started."
      footer={
        <p>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      }
    >
      <form className="login-form" onSubmit={handleSubmit} noValidate>
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

        <button
          type="submit"
          className="login-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
    </AuthLayout>
  )
}
