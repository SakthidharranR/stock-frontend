import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'

/** Forgot password — Cognito forgotPassword / confirmPassword next. */
export function ForgotPassword() {
  return (
    <AuthLayout
      title="Forgot password"
      subtitle="We'll email you a reset code. (Wire to Cognito next.)"
      footer={
        <p>
          <Link to="/login">Back to log in</Link>
        </p>
      }
    >
      <p className="auth-placeholder">
        Steps: request code with email → confirm code + new password.
      </p>
    </AuthLayout>
  )
}
