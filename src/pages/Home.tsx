import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export function Home() {
  const { email, clearSession } = useAuth()
  const location = useLocation()
  const syncWarning =
    (location.state as { syncWarning?: string } | null)?.syncWarning ?? null

  return (
    <div className="home-page">
      <header className="home-header">
        <span className="home-brand">Stock</span>
        <button type="button" className="home-logout" onClick={clearSession}>
          Log out
        </button>
      </header>
      <main className="home-main">
        <h1>You&apos;re signed in</h1>
        <p className="home-email">{email}</p>
        {syncWarning ? (
          <div className="login-alert" role="alert">
            Account created, but profile sync failed: {syncWarning}
          </div>
        ) : null}
        <Link to="/change-password" className="home-link">
          Change password
        </Link>
      </main>
    </div>
  )
}
