import { type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PRODUCT_NAME } from '../lib/brand'
import './AppHeader.css'

type AppHeaderProps = {
  showBack?: boolean
  backTo?: string
  showSearch?: boolean
  showBrand?: boolean
}

export function AppHeader({
  showBack = false,
  backTo = '/home',
  showSearch = true,
  showBrand = true,
}: AppHeaderProps) {
  const { clearSession } = useAuth()
  const navigate = useNavigate()

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const input = form.elements.namedItem('q') as HTMLInputElement
    const q = input.value.trim()
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  return (
    <header className={`app-header${showBrand ? '' : ' app-header--shell'}`}>
      <div className="app-header-start">
        {showBack ? (
          <Link to={backTo} className="app-header-back" aria-label="Back">
            ←
          </Link>
        ) : null}
        {showBrand ? (
          <Link to="/home" className="app-header-brand">
            {PRODUCT_NAME}
          </Link>
        ) : (
          <span className="app-header-spacer" aria-hidden />
        )}
      </div>
      {showSearch ? (
        <form className="app-header-search" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            name="q"
            className="app-header-search-input"
            placeholder="Search"
            aria-label="Search stocks"
          />
        </form>
      ) : null}
      <button
        type="button"
        className="app-header-logout"
        onClick={() => {
          clearSession()
          navigate('/login', { replace: true })
        }}
      >
        Log Out
      </button>
    </header>
  )
}
