import { PRODUCT_NAME, PRODUCT_TAGLINE } from '../lib/brand'
import { SourceCodeLinks } from './SourceCodeLinks'
import './AuthHero.css'

export function AuthHero() {
  return (
    <aside className="auth-hero">
      <div className="auth-hero-glow" aria-hidden />
      <svg
        className="auth-hero-chart"
        viewBox="0 0 640 720"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <linearGradient id="authHeroStroke" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#3d7eff" />
            <stop offset="55%" stopColor="#7aa2ff" />
            <stop offset="100%" stopColor="#c5d7ff" />
          </linearGradient>
          <linearGradient id="authHeroFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F8CFF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4F8CFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          className="auth-hero-area"
          d="M0 520 C 80 500, 120 430, 180 410 C 250 385, 280 455, 340 430 C 410 400, 430 300, 500 280 C 560 265, 600 210, 640 180 L 640 720 L 0 720 Z"
          fill="url(#authHeroFill)"
        />
        <path
          className="auth-hero-line"
          d="M0 520 C 80 500, 120 430, 180 410 C 250 385, 280 455, 340 430 C 410 400, 430 300, 500 280 C 560 265, 600 210, 640 180"
          fill="none"
          stroke="url(#authHeroStroke)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
      <div className="auth-hero-copy">
        <p className="auth-hero-kicker">{PRODUCT_NAME}</p>
        <h2 className="auth-hero-title">{PRODUCT_TAGLINE}</h2>
        <p className="auth-hero-body">
          Paper-trade US stocks with live market data. No real money. Built for interviews,
          practice, and getting the feel of a real brokerage.
        </p>
        <SourceCodeLinks variant="hero" />
      </div>
    </aside>
  )
}
