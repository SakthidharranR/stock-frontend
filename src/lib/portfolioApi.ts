import { buildAuthHeaders } from './apiAuth'
import { resolveAccessToken } from './authBridge'

export type PortfolioSummary = {
  cash_balance: number
  equity: number
  total_value: number
  day_change: number
  day_change_percent: number
  chart_points: { time: number; value: number }[]
}

export type HoldingItem = {
  symbol: string
  name: string
  shares: number
  avg_cost: number
  price: number
  change: number
  change_percent: number
  equity: number
}

export type OrderItem = {
  id: string
  symbol: string
  side: string
  quantity: number
  fill_price: number
  total: number
  created_at: string
}

export type OrderResponse = {
  order: OrderItem
  cash_balance: number
}

export function isPortfolioApiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_PORTFOLIO_API_URL?.trim())
}

function getPortfolioApiUrl(): string {
  const url = import.meta.env.VITE_PORTFOLIO_API_URL?.trim()
  if (!url) {
    throw new Error('Missing VITE_PORTFOLIO_API_URL')
  }
  return url.replace(/\/$/, '')
}

function authFetch(
  path: string,
  accessToken: string | null,
  email: string | null,
  init?: RequestInit,
) {
  return fetch(`${getPortfolioApiUrl()}${path}`, {
    ...init,
    headers: {
      ...buildAuthHeaders(accessToken, email),
      ...(init?.headers ?? {}),
    },
  })
}

async function authFetchWithRetry(
  path: string,
  accessToken: string | null,
  email: string | null,
  init?: RequestInit,
): Promise<Response> {
  const fresh = (await resolveAccessToken()) ?? accessToken
  let res = await authFetch(path, fresh, email, init)
  if (res.status === 401 && fresh) {
    const retried = (await resolveAccessToken()) ?? fresh
    await new Promise((resolve) => window.setTimeout(resolve, 200))
    res = await authFetch(path, retried, email, init)
  }
  return res
}

export async function getPortfolio(
  accessToken: string | null,
  email: string | null,
  range = '1D',
): Promise<PortfolioSummary> {
  const params = new URLSearchParams({ range })
  const res = await authFetchWithRetry(`/portfolio?${params}`, accessToken, email)
  if (!res.ok) {
    throw new Error(`Portfolio fetch failed (${res.status})`)
  }
  return res.json() as Promise<PortfolioSummary>
}

export async function getHoldings(
  accessToken: string | null,
  email: string | null,
): Promise<HoldingItem[]> {
  const res = await authFetchWithRetry('/holdings', accessToken, email)
  if (!res.ok) {
    throw new Error(`Holdings fetch failed (${res.status})`)
  }
  return res.json() as Promise<HoldingItem[]>
}

export async function createOrder(
  accessToken: string | null,
  email: string | null,
  payload: { symbol: string; side: 'buy' | 'sell'; quantity: number },
): Promise<OrderResponse> {
  const res = await authFetchWithRetry('/orders', accessToken, email, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Order failed (${res.status})`)
  }
  return res.json() as Promise<OrderResponse>
}

export async function getOrders(
  accessToken: string | null,
  email: string | null,
  symbol?: string,
  limit = 50,
): Promise<OrderItem[]> {
  const params = new URLSearchParams()
  if (symbol) params.set('symbol', symbol)
  params.set('limit', String(limit))
  const qs = params.toString()
  const res = await authFetchWithRetry(
    `/orders${qs ? `?${qs}` : ''}`,
    accessToken,
    email,
  )
  if (!res.ok) {
    throw new Error(`Orders fetch failed (${res.status})`)
  }
  return res.json() as Promise<OrderItem[]>
}

export type CashTransferItem = {
  id: string
  side: 'deposit' | 'withdraw' | string
  amount: number
  created_at: string
}

export type CashTransferResponse = {
  transfer: CashTransferItem
  cash_balance: number
}

export async function createCashTransfer(
  accessToken: string | null,
  email: string | null,
  payload: { side: 'deposit' | 'withdraw'; amount: number },
): Promise<CashTransferResponse> {
  const res = await authFetchWithRetry('/cash', accessToken, email, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Cash transfer failed (${res.status})`)
  }
  return res.json() as Promise<CashTransferResponse>
}

export async function getCashTransfers(
  accessToken: string | null,
  email: string | null,
): Promise<CashTransferItem[]> {
  const res = await authFetchWithRetry('/cash', accessToken, email)
  if (!res.ok) {
    throw new Error(`Cash history failed (${res.status})`)
  }
  return res.json() as Promise<CashTransferItem[]>
}

export { holdingToStock } from './portfolioDisplay'
