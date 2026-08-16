export type SymbolSearchResult = {
  symbol: string
  name: string
  exchange: string
}

export type QuoteResult = {
  symbol: string
  name?: string
  price: number
  change: number
  change_percent: number
  prev_close?: number
}

export type CandlePoint = {
  time: number
  close: number
}

export type CandlesResponse = {
  symbol: string
  range: string
  resolution: string
  points: CandlePoint[]
}

export type NewsArticle = {
  id: string
  headline: string
  source?: string
  url?: string
  published_at?: string
}

export type SuggestionItem = {
  symbol: string
  name: string
  label?: string
  price: number
  change: number
  change_percent: number
}

export function isMarketApiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_MARKET_API_URL?.trim())
}

function getMarketApiUrl(): string {
  const url = import.meta.env.VITE_MARKET_API_URL?.trim()
  if (!url) {
    throw new Error('Missing VITE_MARKET_API_URL')
  }
  return url.replace(/\/$/, '')
}

export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  const params = new URLSearchParams({ q: query })
  const res = await fetch(`${getMarketApiUrl()}/symbols/search?${params}`)
  if (!res.ok) {
    throw new Error(`Market search failed (${res.status})`)
  }
  return res.json() as Promise<SymbolSearchResult[]>
}

export async function getQuote(symbol: string): Promise<QuoteResult> {
  const res = await fetch(`${getMarketApiUrl()}/quotes/${encodeURIComponent(symbol)}`)
  if (!res.ok) {
    throw new Error(`Quote fetch failed (${res.status})`)
  }
  return res.json() as Promise<QuoteResult>
}

export async function getQuotesBatch(symbols: string[]): Promise<QuoteResult[]> {
  if (symbols.length === 0) return []
  const params = new URLSearchParams({ symbols: symbols.join(',') })
  const res = await fetch(`${getMarketApiUrl()}/quotes?${params}`)
  if (!res.ok) {
    throw new Error(`Batch quotes failed (${res.status})`)
  }
  return res.json() as Promise<QuoteResult[]>
}

export async function getCandles(
  symbol: string,
  range: string,
): Promise<CandlesResponse> {
  const params = new URLSearchParams({ range })
  const res = await fetch(
    `${getMarketApiUrl()}/candles/${encodeURIComponent(symbol)}?${params}`,
  )
  if (!res.ok) {
    throw new Error(`Candles fetch failed (${res.status})`)
  }
  return res.json() as Promise<CandlesResponse>
}

export async function getNews(symbol: string): Promise<NewsArticle[]> {
  const res = await fetch(`${getMarketApiUrl()}/news/${encodeURIComponent(symbol)}`)
  if (!res.ok) {
    throw new Error(`News fetch failed (${res.status})`)
  }
  return res.json() as Promise<NewsArticle[]>
}

export async function getSuggestions(options?: {
  exclude?: string[]
  limit?: number
}): Promise<SuggestionItem[]> {
  const params = new URLSearchParams()
  if (options?.exclude?.length) {
    params.set('exclude', options.exclude.join(','))
  }
  if (options?.limit != null) {
    params.set('limit', String(options.limit))
  }
  const qs = params.toString()
  const res = await fetch(`${getMarketApiUrl()}/suggestions${qs ? `?${qs}` : ''}`)
  if (!res.ok) {
    throw new Error(`Suggestions fetch failed (${res.status})`)
  }
  return res.json() as Promise<SuggestionItem[]>
}

export function quoteToStock(quote: QuoteResult) {
  return {
    symbol: quote.symbol,
    name: quote.name ?? quote.symbol,
    price: quote.price,
    change: quote.change,
    changePercent: quote.change_percent,
  }
}

export function candlesToSeries(points: CandlePoint[]): number[] {
  return points.map((p) => p.close)
}
