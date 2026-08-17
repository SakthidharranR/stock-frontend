import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ChartRangePicker } from '../components/ChartRangePicker'
import { LineChart } from '../components/LineChart'
import { useAuth } from '../context/AuthContext'
import type { ChartRange, Holding, Stock } from '../data/mockMarket'
import {
  findHolding,
  findStock,
  formatChange,
  formatCurrency,
  getNews as getMockNews,
  getStockSeries,
} from '../data/mockMarket'
import {
  candlesToSeries,
  candlesToTimes,
  getCandles,
  getNews,
  getQuote,
  isMarketApiConfigured,
  quoteToStock,
} from '../lib/marketApi'
import {
  createOrder,
  getHoldings,
  getOrders,
  holdingToStock,
  isPortfolioApiConfigured,
  type OrderItem,
} from '../lib/portfolioApi'
import './StockDetail.css'

function formatTimeAgo(iso: string | undefined): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function StockDetailSkeleton() {
  return (
    <div className="stock-detail-skel" aria-busy="true" aria-label="Loading stock">
      <div className="stock-detail-skel-main">
        <div className="stock-detail-skel-block stock-detail-skel-symbol" />
        <div className="stock-detail-skel-block stock-detail-skel-name" />
        <div className="stock-detail-skel-block stock-detail-skel-price" />
        <div className="stock-detail-skel-block stock-detail-skel-change" />
        <div className="stock-detail-skel-block stock-detail-skel-chart" />
        <div className="stock-detail-skel-ranges">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="stock-detail-skel-block stock-detail-skel-chip" />
          ))}
        </div>
      </div>
      <div className="stock-detail-skel-side">
        <div className="stock-detail-skel-block stock-detail-skel-panel" />
        <div className="stock-detail-skel-block stock-detail-skel-panel stock-detail-skel-panel--short" />
      </div>
    </div>
  )
}

export function StockDetail() {
  const { symbol = '' } = useParams()
  const { accessToken, email } = useAuth()
  const marketOn = isMarketApiConfigured()
  const portfolioOn = isPortfolioApiConfigured()
  const mockMode = !marketOn && !portfolioOn

  const [stock, setStock] = useState<Stock | null>(null)
  const [holding, setHolding] = useState<Holding | undefined>()
  const [activity, setActivity] = useState<OrderItem[]>([])
  const [range, setRange] = useState<ChartRange>('1D')
  const [series, setSeries] = useState<number[]>([])
  const [chartTimes, setChartTimes] = useState<number[]>([])
  const [news, setNews] = useState<
    { id: string; headline: string; source: string; timeAgo: string; url?: string }[]
  >([])
  const [quantity, setQuantity] = useState('1')
  const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy')
  const [tradeError, setTradeError] = useState<string | null>(null)
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null)
  const [trading, setTrading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [chartError, setChartError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [rangePending, setRangePending] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const loadGenerationRef = useRef(0)
  const readyRef = useRef(false)
  const activeSymbolRef = useRef(symbol.toUpperCase())

  const loadData = useCallback(async () => {
    const sym = symbol.toUpperCase()
    if (!sym) return
    const loadId = ++loadGenerationRef.current
    const symbolChanged = activeSymbolRef.current !== sym
    activeSymbolRef.current = sym

    if (symbolChanged) {
      readyRef.current = false
      setReady(false)
      setStock(null)
      setHolding(undefined)
      setActivity([])
      setSeries([])
      setChartTimes([])
      setNews([])
      setNotFound(false)
    }

    if (mockMode) {
      const mock = findStock(sym)
      setStock(mock ?? null)
      setHolding(findHolding(sym))
      setActivity([])
      setSeries(mock ? getStockSeries(mock.symbol, range) : [])
      setChartTimes([])
      setNews(mock ? getMockNews(mock.symbol) : [])
      setNotFound(!mock)
      setReady(true)
      readyRef.current = true
      setRangePending(false)
      return
    }

    const isInitial = !readyRef.current
    if (!isInitial) {
      setRangePending(true)
    }

    setLoadError(null)
    setChartError(null)

    try {
      const quoteTask = marketOn
        ? getQuote(sym)
            .then((quote) => {
              if (loadId !== loadGenerationRef.current) return
              setStock(quoteToStock(quote))
              setNotFound(false)
            })
            .catch((err: unknown) => {
              if (loadId !== loadGenerationRef.current) return
              setLoadError(err instanceof Error ? err.message : 'Failed to load quote')
              setStock(null)
              setNotFound(true)
            })
        : Promise.resolve()

      const candlesTask = marketOn
        ? getCandles(sym, range)
            .then((candles) => {
              if (loadId !== loadGenerationRef.current) return
              setSeries(candlesToSeries(candles.points))
              setChartTimes(candlesToTimes(candles.points))
            })
            .catch((err: unknown) => {
              if (loadId !== loadGenerationRef.current) return
              setChartError(err instanceof Error ? err.message : 'Chart unavailable')
              setSeries([])
              setChartTimes([])
            })
        : Promise.resolve()

      const newsTask = marketOn
        ? getNews(sym)
            .then((articles) => {
              if (loadId !== loadGenerationRef.current) return
              setNews(
                articles.map((a) => ({
                  id: a.id,
                  headline: a.headline,
                  source: a.source ?? 'News',
                  timeAgo: formatTimeAgo(a.published_at),
                  url: a.url,
                })),
              )
            })
            .catch(() => {
              if (loadId !== loadGenerationRef.current) return
              setNews([])
            })
        : Promise.resolve()

      const holdingsTask =
        portfolioOn && accessToken
          ? getHoldings(accessToken, email)
              .then((holdings) => {
                if (loadId !== loadGenerationRef.current) return
                const match = holdings.find((h) => h.symbol === sym)
                setHolding(match ? holdingToStock(match) : undefined)
              })
              .catch(() => {
                if (loadId !== loadGenerationRef.current) return
              })
          : Promise.resolve().then(() => {
              if (loadId !== loadGenerationRef.current) return
              if (portfolioOn && !accessToken) {
                setHolding(undefined)
              }
            })

      const activityTask =
        portfolioOn && accessToken
          ? getOrders(accessToken, email, sym)
              .then((orders) => {
                if (loadId !== loadGenerationRef.current) return
                setActivity(orders)
              })
              .catch(() => {
                if (loadId !== loadGenerationRef.current) return
                setActivity([])
              })
          : Promise.resolve().then(() => {
              if (loadId !== loadGenerationRef.current) return
              setActivity([])
            })

      await Promise.all([quoteTask, holdingsTask, activityTask])
      if (loadId !== loadGenerationRef.current) return

      await Promise.all([candlesTask, newsTask])
      if (loadId !== loadGenerationRef.current) return

      setReady(true)
      readyRef.current = true
    } finally {
      if (loadId === loadGenerationRef.current) {
        setRangePending(false)
      }
    }
  }, [symbol, range, accessToken, email, marketOn, portfolioOn, mockMode])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const chartEnd = series[series.length - 1] ?? stock?.price ?? 0
  const chartStart = series[0] ?? stock?.price ?? 0
  const rangeChange =
    range === '1D' && stock ? stock.change : chartEnd - chartStart
  const rangePercent =
    range === '1D' && stock
      ? stock.changePercent
      : chartStart
        ? (rangeChange / chartStart) * 100
        : 0
  const isUp = rangeChange >= 0

  const equity = holding && stock ? holding.shares * stock.price : null
  const costBasis = holding ? holding.shares * holding.avgCost : null
  const totalReturn = equity !== null && costBasis !== null ? equity - costBasis : null
  const returnSinceBuy =
    holding && stock && holding.avgCost
      ? {
          dollars: stock.price - holding.avgCost,
          percent: ((stock.price - holding.avgCost) / holding.avgCost) * 100,
        }
      : null
  const heroChange = returnSinceBuy
    ? returnSinceBuy.dollars
    : (stock?.change ?? 0)
  const heroChangePercent = returnSinceBuy
    ? returnSinceBuy.percent
    : (stock?.changePercent ?? 0)
  const heroChangeLabel = returnSinceBuy ? 'Since you bought' : 'Today'

  const estimatedTotal = useMemo(() => {
    const qty = parseFloat(quantity)
    if (!stock || Number.isNaN(qty) || qty <= 0) return null
    return qty * stock.price
  }, [quantity, stock])

  async function handleTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTradeError(null)
    setTradeSuccess(null)

    if (!portfolioOn || !accessToken) {
      setTradeError('Portfolio API is not configured.')
      return
    }

    const qty = parseFloat(quantity)
    if (Number.isNaN(qty) || qty <= 0) {
      setTradeError('Enter a valid quantity.')
      return
    }

    setTrading(true)
    try {
      const result = await createOrder(accessToken, email, {
        symbol: symbol.toUpperCase(),
        side: tradeSide,
        quantity: qty,
      })
      setTradeSuccess(
        `${tradeSide === 'buy' ? 'Bought' : 'Sold'} ${qty} shares at ${formatCurrency(result.order.fill_price)}`,
      )
      await loadData()
    } catch (err) {
      setTradeError(err instanceof Error ? err.message : 'Trade failed')
    } finally {
      setTrading(false)
    }
  }

  if (notFound && ready) {
    return <Navigate to="/home" replace />
  }

  return (
    <div className="stock-detail">
      <main className="stock-detail-main">
        <Link to="/home" className="stock-detail-back">
          ← Portfolio
        </Link>
        {!ready || !stock ? (
          <StockDetailSkeleton />
        ) : (
          <div
            className={
              rangePending
                ? 'stock-detail-content stock-detail-content--pending'
                : 'stock-detail-content'
            }
            aria-busy={rangePending || undefined}
          >
            {loadError ? (
              <p className="stock-detail-load-error" role="alert">
                {loadError}
              </p>
            ) : null}

            <section className="stock-detail-primary">
              <header className="stock-detail-hero">
                <div className="stock-detail-hero-main">
                  <h1 className="stock-detail-symbol">{stock.symbol}</h1>
                  <p className="stock-detail-name">{stock.name}</p>
                </div>
                <div className="stock-detail-hero-quote">
                  <p className="stock-detail-price">{formatCurrency(stock.price)}</p>
                  <p
                    className={`stock-detail-change${heroChange >= 0 ? ' stock-detail-change--up' : ' stock-detail-change--down'}`}
                  >
                    {heroChangeLabel} {formatChange(heroChange, heroChangePercent)}
                  </p>
                </div>
              </header>

              {chartError ? (
                <p className="stock-detail-load-error" role="alert">
                  {chartError}
                </p>
              ) : null}

              {series.length > 0 ? (
                <>
                  <div className="stock-detail-chart-wrap">
                    <LineChart
                      data={series}
                      times={chartTimes}
                      positive={isUp}
                      height={280}
                      baseline={stock.price - stock.change}
                    />
                  </div>
                  <div className="stock-detail-chart-meta">
                    <p className="stock-detail-range-summary">
                      <span
                        className={
                          isUp
                            ? 'stock-detail-range-summary--up'
                            : 'stock-detail-range-summary--down'
                        }
                      >
                        {formatChange(rangeChange, rangePercent)}
                      </span>
                      <span className="stock-detail-range-period"> · {range}</span>
                    </p>
                    <ChartRangePicker value={range} onChange={setRange} />
                  </div>
                </>
              ) : (
                <ChartRangePicker value={range} onChange={setRange} />
              )}

              {news.length > 0 ? (
                <section className="stock-detail-news-strip" aria-label="News">
                  <h2>News</h2>
                  <ul className="stock-detail-news">
                    {news.slice(0, 4).map((item) => (
                      <li key={item.id} className="stock-detail-news-item">
                        {item.url ? (
                          <a
                            href={item.url}
                            className="stock-detail-news-headline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {item.headline}
                          </a>
                        ) : (
                          <p className="stock-detail-news-headline">{item.headline}</p>
                        )}
                        <p className="stock-detail-news-meta">
                          {item.source} · {item.timeAgo}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </section>

            <aside className="stock-detail-sidebar">
              {portfolioOn ? (
                <section className="stock-detail-panel" aria-label="Trade">
                  <h2>Trade</h2>
                  <form className="stock-detail-trade" onSubmit={handleTrade}>
                    <div className="stock-detail-trade-tabs">
                      <button
                        type="button"
                        className={tradeSide === 'buy' ? 'active' : ''}
                        onClick={() => setTradeSide('buy')}
                      >
                        Buy
                      </button>
                      <button
                        type="button"
                        className={tradeSide === 'sell' ? 'active' : ''}
                        onClick={() => setTradeSide('sell')}
                      >
                        Sell
                      </button>
                    </div>
                    <label className="stock-detail-trade-label">
                      Shares
                      <input
                        type="number"
                        min="0.000001"
                        step="any"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                    </label>
                    {estimatedTotal !== null ? (
                      <p className="stock-detail-trade-estimate">
                        Est. total: {formatCurrency(estimatedTotal)}
                      </p>
                    ) : null}
                    {tradeError ? (
                      <p className="stock-detail-trade-error" role="alert">
                        {tradeError}
                      </p>
                    ) : null}
                    {tradeSuccess ? (
                      <p className="stock-detail-trade-success" role="status">
                        {tradeSuccess}
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      className="stock-detail-trade-submit"
                      disabled={trading}
                    >
                      {trading ? 'Submitting…' : `Submit ${tradeSide}`}
                    </button>
                  </form>
                </section>
              ) : null}

              {holding ? (
                <section className="stock-detail-panel" aria-label="Your position">
                  <h2>Your position</h2>
                  <dl className="stock-detail-stats">
                    <div>
                      <dt>Shares</dt>
                      <dd>{holding.shares}</dd>
                    </div>
                    <div>
                      <dt>Avg cost</dt>
                      <dd>{formatCurrency(holding.avgCost)}</dd>
                    </div>
                    <div>
                      <dt>Equity</dt>
                      <dd>{formatCurrency(equity ?? 0)}</dd>
                    </div>
                    <div>
                      <dt>Total return</dt>
                      <dd
                        className={
                          totalReturn !== null && totalReturn >= 0 ? 'stat-up' : 'stat-down'
                        }
                      >
                        {totalReturn !== null ? formatCurrency(totalReturn) : '—'}
                      </dd>
                    </div>
                  </dl>
                </section>
              ) : null}

              {portfolioOn ? (
                <section className="stock-detail-panel" aria-label="Your activity">
                  <h2>Your activity</h2>
                  {activity.length === 0 ? (
                    <p className="stock-detail-activity-empty">
                      No buys or sells for this stock yet.
                    </p>
                  ) : (
                    <ul className="stock-detail-activity">
                      {activity.map((order) => (
                        <li key={order.id} className="stock-detail-activity-row">
                          <div>
                            <span
                              className={
                                order.side === 'buy'
                                  ? 'stock-detail-activity-side stock-detail-activity-side--buy'
                                  : 'stock-detail-activity-side stock-detail-activity-side--sell'
                              }
                            >
                              {order.side === 'buy' ? 'Bought' : 'Sold'}
                            </span>
                            <span className="stock-detail-activity-meta">
                              {order.quantity} shares @ {formatCurrency(order.fill_price)}
                            </span>
                            <span className="stock-detail-activity-time">
                              {new Date(order.created_at).toLocaleString()}
                            </span>
                          </div>
                          <span className="stock-detail-activity-total">
                            {formatCurrency(order.total)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}

              {marketOn ? (
                <p className="stock-detail-source-hint">
                  Prices from Finnhub (may differ slightly from your broker).
                </p>
              ) : null}
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
