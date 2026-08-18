import { GITHUB_BACKEND_URL, GITHUB_FRONTEND_URL } from '../lib/brand'
import './SourceCodeLinks.css'

type SourceCodeLinksProps = {
  variant?: 'hero' | 'panel' | 'page'
}

const LINKS = [
  {
    href: GITHUB_FRONTEND_URL,
    label: 'Frontend',
    detail: 'React app · GitHub',
  },
  {
    href: GITHUB_BACKEND_URL,
    label: 'Backend',
    detail: 'APIs · GitHub',
  },
]

export function SourceCodeLinks({ variant = 'panel' }: SourceCodeLinksProps) {
  return (
    <div className={`source-links source-links--${variant}`}>
      <p className="source-links-kicker">Source code</p>
      <div className="source-links-row">
        {LINKS.map((link) => (
          <a
            key={link.href}
            className="source-links-card"
            href={link.href}
            target="_blank"
            rel="noreferrer"
          >
            <span className="source-links-label">{link.label}</span>
            <span className="source-links-detail">{link.detail}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
