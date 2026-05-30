import { useEffect, useState } from 'react'
import {
  clearAuthDebugEvents,
  getAuthDebugEvents,
  getAuthDebugSnapshot,
  type AuthDebugEvent,
} from '../lib/authDebugStore'
import { authLog, isAuthDebugEnabled } from '../lib/authLog'
import '../pages/Login.css'

type AuthDevPanelProps = {
  page: string
}

export function AuthDevPanel({ page }: AuthDevPanelProps) {
  const [events, setEvents] = useState<AuthDebugEvent[]>([])
  const [snapshot] = useState(getAuthDebugSnapshot)

  useEffect(() => {
    if (!isAuthDebugEnabled()) return

    authLog(`${page} loaded`, snapshot)
    setEvents(getAuthDebugEvents())

    const interval = window.setInterval(() => {
      setEvents(getAuthDebugEvents())
    }, 500)

    return () => window.clearInterval(interval)
  }, [page, snapshot])

  if (!isAuthDebugEnabled()) {
    return null
  }

  return (
    <details className="auth-debug-panel" open>
      <summary>Auth debug — {page}</summary>
      <p className="auth-debug-hint">
        <strong>Not the terminal.</strong> These logs are on the web page and in
        the browser console (press <kbd>F12</kbd> → Console → filter{' '}
        <code>[auth]</code>). The <code>npm run dev</code> window only shows Vite
        startup messages.
      </p>

      <p className="auth-debug-hint">
        <strong>Config</strong>
      </p>
      <pre>{JSON.stringify(snapshot, null, 2)}</pre>

      <div className="auth-debug-actions">
        <button
          type="button"
          className="register-secondary-btn"
          onClick={() => {
            clearAuthDebugEvents()
            setEvents([])
          }}
        >
          Clear log
        </button>
      </div>

      <p className="auth-debug-hint">
        <strong>Recent events ({events.length})</strong>
      </p>
      {events.length === 0 ? (
        <p className="auth-debug-hint">No events yet. Click Continue with Google.</p>
      ) : (
        <pre>{JSON.stringify(events, null, 2)}</pre>
      )}
    </details>
  )
}
