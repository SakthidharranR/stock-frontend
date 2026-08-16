import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { isMarketApiConfigured, searchSymbols } from '../lib/marketApi'
import { formatCurrency } from '../data/mockMarket'
import './SearchPage.css'

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<
    { symbol: string; name: string; price: number; change: number; changePercent: number }[]
  >([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const useApi = isMarketApiConfigured()

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    if (!useApi) return

    const trimmed = query.trim()
    if (trimmed.length < 1) {
      setResults([])
      setError(null)
      return
    }

    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const symbols = await searchSymbols(trimmed)
        setResults(
          symbols.map((s) => ({
            symbol: s.symbol,
            name: s.name,
            price: 0,
            change: 0,
            changePercent: 0,
          })),
        )
        setSearchParams(trimmed ? { q: trimmed } : {}, { replace: true })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [query, useApi, setSearchParams])

  return (
    <div className="search-page">
      <main className="search-page-main">
        <h1 className="search-page-title">Search stocks</h1>
        <input
          type="search"
          className="search-page-input"
          placeholder="Search by symbol or name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        {!useApi ? (
          <p className="search-page-hint">
            Set <code>VITE_MARKET_API_URL</code> in .env to enable live search.
          </p>
        ) : null}

        {loading ? <p className="search-page-status">Searching…</p> : null}
        {error ? (
          <p className="search-page-error" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && results.length === 0 && query.trim() ? (
          <p className="search-page-status">No matches for &ldquo;{query.trim()}&rdquo;</p>
        ) : null}

        <div className="search-page-list">
          {results.map((stock) => (
            <Link
              key={stock.symbol}
              to={`/stock/${stock.symbol}`}
              className="search-page-row"
            >
              <div>
                <span className="search-page-symbol">{stock.symbol}</span>
                <span className="search-page-name">{stock.name}</span>
              </div>
              {stock.price > 0 ? (
                <span className="search-page-price">{formatCurrency(stock.price)}</span>
              ) : null}
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
