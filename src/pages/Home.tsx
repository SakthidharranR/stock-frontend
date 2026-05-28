import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Home() {
  const { email, clearSession } = useAuth()

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
        <p className="home-hint">
          Identity service sync comes next after you build{' '}
          <code>stock-backend/services/identity</code>.
        </p>
        <Link to="/change-password" className="home-link">
          Change password
        </Link>
      </main>
    </div>
  )
}
