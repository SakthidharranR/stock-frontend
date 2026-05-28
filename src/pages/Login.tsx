import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../context/AuthContext'
import { isCognitoConfigured } from '../lib/cognitoConfig'
import { signIn } from '../lib/cognito'
import './Login.css'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setSession, isAuthenticated } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? '/home'

  useEffect(() => {
    const message = (location.state as { message?: string } | null)?.message
    if (message) {
      setNotice(message)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true })
    }
  }, [isAuthenticated, navigate, redirectTo])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!isCognitoConfigured()) {
      setError('Cognito is not configured. Add your pool settings to .env.')
      return
    }

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Enter your email.')
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await signIn(trimmedEmail, password)

      if (result.status === 'new_password_required') {
        navigate('/change-password', {
          replace: true,
          state: {
            reason: 'new_password_required',
            email: trimmedEmail,
          },
        })
        return
      }

      setSession({
        email: result.email,
        tokens: result.tokens,
      })
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Log in"
      subtitle="Welcome back. Enter your account details."
      footer={
        <p>
          Don&apos;t have an account? <Link to="/register">Sign up</Link>
        </p>
      }
    >
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        {notice ? (
          <div className="register-success" role="status">
            {notice}
          </div>
        ) : null}
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
          <span className="login-label-row">
            <span className="login-label">Password</span>
            <Link to="/forgot-password" className="login-forgot">
              Forgot password?
            </Link>
          </span>
          <div className="login-password-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              placeholder="Your password"
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
        </label>

        <button
          type="submit"
          className="login-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  )
}
