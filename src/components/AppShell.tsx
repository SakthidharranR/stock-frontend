import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { PRODUCT_NAME } from '../lib/brand'
import { Account } from '../pages/Account'
import { Home } from '../pages/Home'
import './AppShell.css'

const NAV = [
  { to: '/home', label: 'Portfolio', end: true },
  { to: '/account', label: 'Account' },
  { to: '/search', label: 'Search' },
]

export function AppShell() {
  const { pathname } = useLocation()
  const onPortfolio = pathname === '/home'
  const onAccount = pathname === '/account'
  const [keepAccount, setKeepAccount] = useState(onAccount)

  useEffect(() => {
    if (onAccount) setKeepAccount(true)
  }, [onAccount])

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Main">
        <NavLink to="/home" className="app-sidebar-brand" end>
          {PRODUCT_NAME}
        </NavLink>
        <nav className="app-sidebar-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? 'app-sidebar-link app-sidebar-link--active' : 'app-sidebar-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-shell-main">
        <AppHeader showBrand={false} />
        <div className={onPortfolio ? undefined : 'app-shell-page--inactive'}>
          <Home />
        </div>
        {keepAccount ? (
          <div className={onAccount ? undefined : 'app-shell-page--inactive'}>
            <Account />
          </div>
        ) : null}
        {onPortfolio || onAccount ? null : <Outlet />}
      </div>
    </div>
  )
}
