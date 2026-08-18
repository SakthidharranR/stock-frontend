import { SourceCodeLinks } from '../components/SourceCodeLinks'
import './SourceCode.css'

export function SourceCode() {
  return (
    <main className="source-page">
      <header className="source-page-hero">
        <p className="source-page-label">Open source</p>
        <h1 className="source-page-title">Source code</h1>
        <p className="source-page-body">
          Markets Forge is split into a React frontend and a Python backend. Both
          repositories are public.
        </p>
      </header>
      <SourceCodeLinks variant="page" />
    </main>
  )
}
