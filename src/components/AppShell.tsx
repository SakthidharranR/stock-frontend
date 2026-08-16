import { NavLink, Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import './AppShell.css'

const NAV = [
  { to: '/home', label: 'Portfolio', end: true },
  { to: '/account', label: 'Account' },
  { to: '/search', label: 'Search' },
]

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Main">
        <NavLink to="/home" className="app-sidebar-brand" end>
          Stock
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
        <Outlet />
      </div>
    </div>
  )
}
