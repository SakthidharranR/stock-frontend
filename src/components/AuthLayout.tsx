import { Link } from 'react-router-dom'
import { PRODUCT_NAME } from '../lib/brand'
import { AuthHero } from './AuthHero'
import './AuthLayout.css'

type AuthLayoutProps = {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <AuthHero />
      <div className="auth-panel">
        <header className="auth-header">
          <Link to="/login" className="auth-brand">
            {PRODUCT_NAME}
          </Link>
        </header>

        <main className="auth-main">
          <div className="auth-card">
            <h1 className="auth-title">{title}</h1>
            {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
            {children}
          </div>
          {footer ? <div className="auth-footer">{footer}</div> : null}
        </main>
      </div>
    </div>
  )
}
