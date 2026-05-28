import { Link, useLocation } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'

type ChangePasswordState = {
  reason?: 'new_password_required'
  email?: string
}

/** Change password — Cognito completeNewPasswordChallenge / changePassword next. */
export function ChangePassword() {
  const location = useLocation()
  const state = (location.state as ChangePasswordState | null) ?? {}
  const isForced = state.reason === 'new_password_required'

  return (
    <AuthLayout
      title={isForced ? 'Set a new password' : 'Change password'}
      subtitle={
        isForced
          ? `Cognito requires a new password${state.email ? ` for ${state.email}` : ''}.`
          : 'Update your password while signed in.'
      }
      footer={
        <p>
          <Link to="/login">Back to log in</Link>
        </p>
      }
    >
      <p className="auth-placeholder">
        Implement Cognito completeNewPasswordChallenge (forced) or
        changePassword (signed in) here.
      </p>
    </AuthLayout>
  )
}
