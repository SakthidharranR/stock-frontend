import './DashboardSkeleton.css'

type DashboardSkeletonProps = {
  holdingRows?: number
  suggestionRows?: number
  newsCards?: number
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`dash-skel${className ? ` ${className}` : ''}`} aria-hidden />
}

function SkeletonRow() {
  return (
    <div className="dash-skel-row" aria-hidden>
      <div className="dash-skel-row-body">
        <SkeletonBlock className="dash-skel-line dash-skel-line--sm" />
        <SkeletonBlock className="dash-skel-line dash-skel-line--xs" />
      </div>
      <div className="dash-skel-row-quote">
        <SkeletonBlock className="dash-skel-line dash-skel-line--sm" />
        <SkeletonBlock className="dash-skel-line dash-skel-line--xs" />
      </div>
    </div>
  )
}

export function DashboardSkeleton({
  holdingRows = 4,
  suggestionRows = 5,
  newsCards = 6,
}: DashboardSkeletonProps) {
  return (
    <div className="dash-skel-page" aria-busy="true" aria-label="Loading portfolio">
      <section className="dash-skel-panel dash-skel-panel--hero">
        <div className="dash-skel-hero">
          <div>
            <SkeletonBlock className="dash-skel-line dash-skel-line--label" />
            <SkeletonBlock className="dash-skel-value" />
            <SkeletonBlock className="dash-skel-line dash-skel-line--change" />
          </div>
          <div className="dash-skel-stats">
            <SkeletonBlock className="dash-skel-cash" />
            <SkeletonBlock className="dash-skel-cash" />
          </div>
        </div>
        <SkeletonBlock className="dash-skel-chart-fill" />
        <div className="dash-skel-ranges">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonBlock key={i} className="dash-skel-chip" />
          ))}
        </div>
      </section>

      <div className="dash-skel-mid">
        <section className="dash-skel-panel">
          <SkeletonBlock className="dash-skel-line dash-skel-line--title" />
          <div className="dash-skel-list">
            {Array.from({ length: holdingRows }, (_, i) => (
              <SkeletonRow key={`h-${i}`} />
            ))}
          </div>
        </section>

        <div className="dash-skel-side">
          <section className="dash-skel-panel">
            <SkeletonBlock className="dash-skel-line dash-skel-line--title" />
            <SkeletonBlock className="dash-skel-alloc" />
          </section>
          <section className="dash-skel-panel">
            <SkeletonBlock className="dash-skel-line dash-skel-line--title" />
            <div className="dash-skel-list">
              {Array.from({ length: suggestionRows }, (_, i) => (
                <SkeletonRow key={`s-${i}`} />
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="dash-skel-panel">
        <SkeletonBlock className="dash-skel-line dash-skel-line--title" />
        <div className="dash-skel-news-grid">
          {Array.from({ length: newsCards }, (_, i) => (
            <SkeletonBlock key={`n-${i}`} className="dash-skel-news-card" />
          ))}
        </div>
      </section>
    </div>
  )
}
