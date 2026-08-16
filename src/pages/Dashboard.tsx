import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AllocationPie, buildHoldingSlices } from '../components/AllocationPie'
import { ChartRangePicker } from '../components/ChartRangePicker'
import { DashboardSkeleton } from '../components/DashboardSkeleton'
import { LineChart } from '../components/LineChart'
import { StockRow } from '../components/StockRow'
import { useAuth } from '../context/AuthContext'
import type { ChartRange, Holding, Stock } from '../data/mockMarket'
import {
  MOCK_HOLDINGS,
  MOCK_SUGGESTIONS,
  formatChange,
  formatCurrency,
  getNews as getMockNews,
  getPortfolioSeries,
  getPortfolioSummary,
} from '../data/mockMarket'
import {
  getNews,
  getSuggestions,
  isMarketApiConfigured,
  quoteToStock,
  type NewsArticle,
} from '../lib/marketApi'
import {
  getHoldings,
  getPortfolio,
  holdingToStock,
  isPortfolioApiConfigured,
} from '../lib/portfolioApi'
import {
  chartPointsToSeries,
  portfolioChangeHint,
  portfolioSeriesFromSummary,
  toPortfolioDisplaySummary,
} from '../lib/portfolioDisplay'
import './Dashboard.css'

type FeedArticle = NewsArticle & { symbol: string }

function formatNewsTime(iso: string | undefined): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

async function fetchHoldingsNews(symbols: string[]): Promise<FeedArticle[]> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))].slice(0, 5)
  const batches = await Promise.all(
    unique.map(async (symbol) => {
      try {
        const articles = await getNews(symbol)
        return articles.slice(0, 3).map((a) => ({ ...a, symbol }))
      } catch {
        return [] as FeedArticle[]
      }
    }),
  )
  const seen = new Set<string>()
  const merged: FeedArticle[] = []
  for (const article of batches.flat()) {
    if (seen.has(article.id)) continue
    seen.add(article.id)
    merged.push(article)
  }
  merged.sort((a, b) => {
    const ta = a.published_at ? new Date(a.published_at).getTime() : 0
    const tb = b.published_at ? new Date(b.published_at).getTime() : 0
    return tb - ta
  })
  return merged.slice(0, 12)
}

export function Dashboard() {
  const location = useLocation()
  const { accessToken, email } = useAuth()
  const syncWarning =
    (location.state as { syncWarning?: string } | null)?.syncWarning ?? null

  const marketOn = isMarketApiConfigured()
  const portfolioOn = isPortfolioApiConfigured()
  const mockMode = !marketOn && !portfolioOn

  const [range, setRange] = useState<ChartRange>('1D')
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [suggestions, setSuggestions] = useState<Stock[]>([])
  const [news, setNews] = useState<FeedArticle[]>([])
  const [summary, setSummary] = useState({
    value: 0,
    change: 0,
    changePercent: 0,
    cash: 0,
  })
  const [chartSeries, setChartSeries] = useState<number[]>([])
  const [useLive, setUseLive] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [ready, setReady] = useState(mockMode)
  const [rangePending, setRangePending] = useState(false)
  const loadGenerationRef = useRef(0)
  const readyRef = useRef(mockMode)

  const loadData = useCallback(async () => {
    const loadId = ++loadGenerationRef.current

    if (mockMode) {
      const mockSummary = getPortfolioSummary(range)
      setHoldings(MOCK_HOLDINGS)
      setSuggestions(MOCK_SUGGESTIONS)
      setSummary({ ...mockSummary, cash: 2400 })
      setChartSeries(getPortfolioSeries(range))
      setNews(
        MOCK_HOLDINGS.flatMap((h) =>
          getMockNews(h.symbol).slice(0, 2).map((n, i) => ({
            id: `${h.symbol}-${i}`,
            headline: n.headline,
            source: n.source,
            symbol: h.symbol,
            published_at: new Date(Date.now() - i * 3_600_000).toISOString(),
          })),
        ),
      )
      setUseLive(false)
      setReady(true)
      readyRef.current = true
      setRangePending(false)
      return
    }

    if (portfolioOn && !accessToken) {
      setHoldings([])
      setSummary({ value: 0, change: 0, changePercent: 0, cash: 0 })
      setChartSeries([])
      setNews([])
      setUseLive(false)
      setReady(true)
      readyRef.current = true
      setRangePending(false)
      return
    }

    if (readyRef.current) {
      setRangePending(true)
    }

    try {
      setLoadError(null)
      let portfolioLoaded = false
      let nextHoldings: Holding[] = []

      if (portfolioOn && accessToken) {
        const [portfolio, holdingRows] = await Promise.all([
          getPortfolio(accessToken, email, range),
          getHoldings(accessToken, email),
        ])
        if (loadId !== loadGenerationRef.current) return
        nextHoldings = holdingRows.map(holdingToStock)
        setSummary({
          ...toPortfolioDisplaySummary(portfolio),
          cash: portfolio.cash_balance,
        })
        setChartSeries(chartPointsToSeries(portfolio.chart_points))
        setHoldings(nextHoldings)
        portfolioLoaded = true
      }

      if (marketOn) {
        const items = await getSuggestions({
          exclude: nextHoldings.map((h) => h.symbol),
          limit: 12,
        })
        if (loadId !== loadGenerationRef.current) return
        setSuggestions(items.map(quoteToStock))
      }

      if (loadId !== loadGenerationRef.current) return

      if (marketOn && nextHoldings.length > 0) {
        const feed = await fetchHoldingsNews(nextHoldings.map((h) => h.symbol))
        if (loadId !== loadGenerationRef.current) return
        setNews(feed)
      } else if (nextHoldings.length === 0) {
        setNews([])
      }

      if (portfolioOn) {
        setUseLive(portfolioLoaded)
      } else {
        setUseLive(marketOn)
      }
      setReady(true)
      readyRef.current = true
    } catch (err) {
      if (loadId !== loadGenerationRef.current) return
      setLoadError(err instanceof Error ? err.message : 'Failed to load market data')
      setUseLive(false)
      if (portfolioOn && !readyRef.current) {
        setHoldings([])
        setSummary({ value: 0, change: 0, changePercent: 0, cash: 0 })
        setChartSeries([])
        setNews([])
      }
      setReady(true)
      readyRef.current = true
    } finally {
      if (loadId === loadGenerationRef.current) {
        setRangePending(false)
      }
    }
  }, [accessToken, email, range, marketOn, portfolioOn, mockMode])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const series = useMemo(() => {
    if (mockMode) {
      return getPortfolioSeries(range)
    }
    return portfolioSeriesFromSummary(chartSeries, summary.value)
  }, [mockMode, chartSeries, summary.value, range])

  const displaySummary = mockMode
    ? { ...getPortfolioSummary(range), cash: summary.cash }
    : summary
  const isUp = displaySummary.change >= 0
  const showSkeleton = !mockMode && !ready

  const allocationSlices = useMemo(
    () => buildHoldingSlices(holdings, displaySummary.cash),
    [holdings, displaySummary.cash],
  )

  const ownedSymbols = useMemo(
    () => new Set(holdings.map((h) => h.symbol.toUpperCase())),
    [holdings],
  )

  const discover = useMemo(
    () => suggestions.filter((s) => !ownedSymbols.has(s.symbol.toUpperCase())),
    [suggestions, ownedSymbols],
  )

  const movers = useMemo(() => {
    return [...holdings]
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 3)
  }, [holdings])

  const equityValue = useMemo(
    () => holdings.reduce((sum, h) => sum + h.shares * h.price, 0),
    [holdings],
  )

  return (
    <div className="dashboard">
      <main className="dashboard-main">
        {syncWarning ? (
          <div className="dashboard-alert" role="alert">
            Account created, but profile sync failed: {syncWarning}
          </div>
        ) : null}

        {loadError ? (
          <div className="dashboard-alert" role="alert">
            {loadError}
          </div>
        ) : null}

        {showSkeleton ? (
          <DashboardSkeleton />
        ) : (
          <div
            className={
              rangePending
                ? 'dashboard-content dashboard-content--pending'
                : 'dashboard-content'
            }
            aria-busy={rangePending || undefined}
          >
            <section
              className={`dash-hero-panel${isUp ? ' dash-hero-panel--up' : ' dash-hero-panel--down'}`}
              aria-label="Portfolio performance"
            >
              <div className="portfolio-hero">
                <div className="portfolio-hero-text">
                  <p className="portfolio-label">Portfolio value</p>
                  <h1 className="portfolio-value">{formatCurrency(displaySummary.value)}</h1>
                  <p
                    className={`portfolio-change${isUp ? ' portfolio-change--up' : ' portfolio-change--down'}`}
                  >
                    {formatChange(displaySummary.change, displaySummary.changePercent)}
                    <span className="portfolio-change-period"> · {range}</span>
                  </p>
                </div>
                <div className="portfolio-stat-row">
                  <div className="portfolio-stat">
                    <span className="portfolio-meta-label">Buying power</span>
                    <span className="portfolio-meta-value">
                      {formatCurrency(displaySummary.cash)}
                    </span>
                  </div>
                  <div className="portfolio-stat">
                    <span className="portfolio-meta-label">Invested</span>
                    <span className="portfolio-meta-value">{formatCurrency(equityValue)}</span>
                  </div>
                </div>
              </div>

              <div className="portfolio-chart-wrap">
                <LineChart data={series} positive={isUp} height={280} />
              </div>

              <div className="portfolio-chart-footer">
                <ChartRangePicker value={range} onChange={setRange} />
                {useLive ? (
                  <p className="dashboard-section-hint">{portfolioChangeHint(range)}</p>
                ) : null}
              </div>
            </section>

            <div className="dash-mid">
              <section className="dash-panel" aria-label="Your stocks">
                <div className="dash-panel-head">
                  <h2 className="dashboard-section-title">Your stocks</h2>
                  <span className="dash-panel-count">{holdings.length}</span>
                </div>
                {holdings.length === 0 ? (
                  <p className="dashboard-section-hint">
                    No holdings yet — search a stock to buy.
                  </p>
                ) : (
                  <div
                    className={
                      holdings.length > 5
                        ? 'dashboard-list dashboard-list--scroll'
                        : 'dashboard-list'
                    }
                  >
                    {holdings.map((holding) => (
                      <StockRow
                        key={holding.symbol}
                        stock={holding}
                        subtitle={`${holding.shares} shares · avg ${formatCurrency(holding.avgCost)}`}
                      />
                    ))}
                  </div>
                )}

                {movers.length > 0 ? (
                  <div className="dash-movers">
                    <h3 className="dash-movers-title">Biggest moves</h3>
                    <div className="dash-movers-row">
                      {movers.map((m) => (
                        <Link
                          key={m.symbol}
                          to={`/stock/${m.symbol}`}
                          className={`dash-mover${m.changePercent >= 0 ? ' dash-mover--up' : ' dash-mover--down'}`}
                        >
                          <span className="dash-mover-sym">{m.symbol}</span>
                          <span className="dash-mover-chg">
                            {formatChange(m.change, m.changePercent)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              <aside className="dash-side">
                <section className="dash-panel" aria-label="Allocation">
                  <h2 className="dashboard-section-title">Allocation</h2>
                  <AllocationPie slices={allocationSlices} size={128} />
                </section>

                <section className="dash-panel dash-panel--discover" aria-label="Discover">
                  <h2 className="dashboard-section-title">Discover</h2>
                  <div
                    className={
                      discover.length > 3
                        ? 'dash-discover-list dash-discover-list--scroll'
                        : 'dash-discover-list'
                    }
                  >
                    {discover.map((stock) => (
                      <StockRow key={stock.symbol} stock={stock} />
                    ))}
                    {discover.length === 0 ? (
                      <p className="dashboard-section-hint">No new suggestions right now.</p>
                    ) : null}
                  </div>
                </section>
              </aside>
            </div>

            <section className="dash-panel dash-news" aria-label="News for your stocks">
              <div className="dash-panel-head">
                <h2 className="dashboard-section-title">News for your stocks</h2>
              </div>
              {news.length === 0 ? (
                <p className="dashboard-section-hint">
                  {holdings.length === 0
                    ? 'Buy a stock to see related headlines here.'
                    : 'No recent headlines for your holdings.'}
                </p>
              ) : (
                <div className="dash-news-grid">
                  {news.map((item) => (
                    <article key={item.id} className="dash-news-card">
                      <Link to={`/stock/${item.symbol}`} className="dash-news-symbol">
                        {item.symbol}
                      </Link>
                      {item.url ? (
                        <a
                          href={item.url}
                          className="dash-news-headline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {item.headline}
                        </a>
                      ) : (
                        <p className="dash-news-headline">{item.headline}</p>
                      )}
                      <p className="dash-news-meta">
                        {item.source ?? 'News'}
                        {item.published_at ? ` · ${formatNewsTime(item.published_at)}` : ''}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
