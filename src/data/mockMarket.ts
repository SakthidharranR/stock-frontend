export type ChartRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'

export type Stock = {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
}

export type Holding = Stock & {
  shares: number
  avgCost: number
}

export type NewsItem = {
  id: string
  headline: string
  source: string
  timeAgo: string
}

const PORTFOLIO_SERIES: Record<ChartRange, number[]> = {
  '1D': [12480, 12420, 12455, 12390, 12410, 12520, 12580, 12610, 12590, 12640, 12720, 12810, 12847],
  '1W': [11820, 11940, 12100, 12050, 12280, 12410, 12560, 12690, 12780, 12847],
  '1M': [10950, 11200, 11120, 11480, 11620, 11890, 12140, 12310, 12550, 12847],
  '3M': [9800, 10120, 10450, 10200, 10880, 11240, 11560, 11920, 12280, 12847],
  '1Y': [8200, 8800, 9100, 8600, 9400, 10200, 10850, 11400, 12100, 12847],
  ALL: [5000, 6200, 5800, 7100, 8400, 7900, 9200, 10100, 11500, 12847],
}

const STOCK_SERIES: Record<string, Record<ChartRange, number[]>> = {
  AAPL: {
    '1D': [178, 177.2, 177.8, 176.9, 177.5, 178.4, 179.1, 179.8, 179.4, 180.2, 180.9, 181.4, 182.15],
    '1W': [172, 174, 175.5, 174.8, 177, 178.5, 179.2, 180.5, 181, 182.15],
    '1M': [165, 168, 170, 169, 173, 175, 177, 179, 180.5, 182.15],
    '3M': [155, 158, 162, 160, 166, 170, 173, 176, 179, 182.15],
    '1Y': [145, 150, 152, 148, 158, 165, 170, 174, 178, 182.15],
    ALL: [120, 135, 128, 142, 155, 148, 162, 170, 176, 182.15],
  },
  MSFT: {
    '1D': [412, 410.5, 411.2, 409.8, 410.9, 413, 414.2, 415, 414.5, 415.8, 416.5, 417.2, 418.4],
    '1W': [398, 402, 405, 404, 408, 411, 413, 415, 416.5, 418.4],
    '1M': [385, 390, 392, 388, 395, 400, 405, 410, 415, 418.4],
    '3M': [360, 368, 375, 370, 382, 390, 398, 405, 412, 418.4],
    '1Y': [320, 335, 340, 330, 355, 370, 385, 395, 408, 418.4],
    ALL: [250, 280, 270, 300, 330, 315, 350, 375, 400, 418.4],
  },
  NVDA: {
    '1D': [878, 872, 875, 868, 871, 882, 888, 892, 889, 895, 902, 908, 912.5],
    '1W': [820, 840, 855, 848, 870, 885, 895, 905, 908, 912.5],
    '1M': [750, 780, 795, 788, 820, 845, 860, 880, 900, 912.5],
    '3M': [680, 710, 740, 720, 780, 820, 850, 875, 895, 912.5],
    '1Y': [480, 520, 550, 530, 620, 700, 780, 840, 880, 912.5],
    ALL: [220, 280, 260, 350, 420, 380, 520, 650, 800, 912.5],
  },
  GOOGL: {
    '1D': [168.5, 167.8, 168.2, 167.1, 167.9, 169, 169.8, 170.2, 169.9, 170.5, 171, 171.4, 172.3],
    '1W': [162, 164, 165.5, 165, 167, 168.5, 169.5, 170.8, 171.5, 172.3],
    '1M': [155, 158, 160, 159, 163, 165, 167, 169, 171, 172.3],
    '3M': [145, 148, 152, 150, 158, 162, 165, 168, 170, 172.3],
    '1Y': [130, 135, 138, 132, 145, 152, 158, 164, 168, 172.3],
    ALL: [95, 110, 105, 120, 135, 128, 145, 155, 165, 172.3],
  },
  TSLA: {
    '1D': [242, 240.5, 241.2, 239.8, 240.5, 243, 244.5, 245, 244.2, 245.8, 246.5, 247, 248.9],
    '1W': [228, 232, 235, 234, 238, 241, 243, 245.5, 247, 248.9],
    '1M': [210, 215, 218, 216, 225, 230, 235, 240, 245, 248.9],
    '3M': [195, 200, 208, 202, 215, 222, 228, 235, 242, 248.9],
    '1Y': [175, 185, 190, 180, 200, 215, 225, 235, 242, 248.9],
    ALL: [120, 140, 130, 160, 180, 170, 200, 220, 235, 248.9],
  },
  AMZN: {
    '1D': [198, 197.2, 197.8, 196.9, 197.5, 198.8, 199.5, 200.1, 199.8, 200.4, 201, 201.5, 202.4],
    '1W': [190, 192, 194, 193.5, 196, 198, 199, 200.5, 201.5, 202.4],
    '1M': [178, 182, 185, 183, 188, 192, 195, 198, 200, 202.4],
    '3M': [165, 170, 175, 172, 180, 185, 190, 195, 199, 202.4],
    '1Y': [140, 148, 152, 145, 160, 170, 178, 188, 195, 202.4],
    ALL: [100, 115, 108, 125, 140, 132, 155, 175, 190, 202.4],
  },
}

export const MOCK_HOLDINGS: Holding[] = [
  {
    symbol: 'AAPL',
    name: 'Apple',
    price: 182.15,
    change: 2.34,
    changePercent: 1.3,
    shares: 12,
    avgCost: 168.4,
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA',
    price: 912.5,
    change: 8.12,
    changePercent: 0.9,
    shares: 4,
    avgCost: 780.2,
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft',
    price: 418.4,
    change: -1.85,
    changePercent: -0.44,
    shares: 6,
    avgCost: 395.0,
  },
]

export const MOCK_SUGGESTIONS: Stock[] = [
  {
    symbol: 'GOOGL',
    name: 'Alphabet',
    price: 172.3,
    change: 1.12,
    changePercent: 0.65,
  },
  {
    symbol: 'TSLA',
    name: 'Tesla',
    price: 248.9,
    change: 4.55,
    changePercent: 1.86,
  },
  {
    symbol: 'AMZN',
    name: 'Amazon',
    price: 202.4,
    change: -0.62,
    changePercent: -0.31,
  },
]

const NEWS_BY_SYMBOL: Record<string, NewsItem[]> = {
  AAPL: [
    {
      id: 'aapl-1',
      headline: 'Apple suppliers signal steady iPhone demand ahead of fall cycle',
      source: 'Market Wire',
      timeAgo: '2h ago',
    },
    {
      id: 'aapl-2',
      headline: 'Services revenue growth remains a focal point for analysts',
      source: 'Tech Daily',
      timeAgo: '5h ago',
    },
    {
      id: 'aapl-3',
      headline: 'EU regulators continue review of App Store policy changes',
      source: 'Global Finance',
      timeAgo: '1d ago',
    },
  ],
  MSFT: [
    {
      id: 'msft-1',
      headline: 'Azure growth outlook draws attention ahead of earnings season',
      source: 'Cloud Report',
      timeAgo: '3h ago',
    },
    {
      id: 'msft-2',
      headline: 'Copilot adoption metrics in focus for enterprise investors',
      source: 'Tech Daily',
      timeAgo: '8h ago',
    },
  ],
  NVDA: [
    {
      id: 'nvda-1',
      headline: 'Data center GPU demand stays elevated amid AI buildouts',
      source: 'Semiconductor Today',
      timeAgo: '1h ago',
    },
    {
      id: 'nvda-2',
      headline: 'Analysts debate valuation after recent rally in chip names',
      source: 'Market Wire',
      timeAgo: '6h ago',
    },
  ],
  GOOGL: [
    {
      id: 'googl-1',
      headline: 'Search ad spend trends improve in latest channel checks',
      source: 'Ad Insights',
      timeAgo: '4h ago',
    },
  ],
  TSLA: [
    {
      id: 'tsla-1',
      headline: 'Delivery estimates revised modestly higher for the quarter',
      source: 'Auto EV',
      timeAgo: '2h ago',
    },
  ],
  AMZN: [
    {
      id: 'amzn-1',
      headline: 'Retail margins in focus as logistics costs normalize',
      source: 'Retail Pulse',
      timeAgo: '3h ago',
    },
  ],
}

const DEFAULT_NEWS: NewsItem[] = [
  {
    id: 'generic-1',
    headline: 'Broader market holds steady as investors await economic data',
    source: 'Market Wire',
    timeAgo: '4h ago',
  },
  {
    id: 'generic-2',
    headline: 'Sector rotation continues among large-cap technology names',
    source: 'Finance Today',
    timeAgo: '9h ago',
  },
]

export function getPortfolioSeries(range: ChartRange): number[] {
  return PORTFOLIO_SERIES[range]
}

export function getStockSeries(symbol: string, range: ChartRange): number[] {
  const upper = symbol.toUpperCase()
  return STOCK_SERIES[upper]?.[range] ?? generateFallbackSeries(upper, range)
}

function generateFallbackSeries(symbol: string, range: ChartRange): number[] {
  const base = symbol.split('').reduce((sum, c) => sum + c.charCodeAt(0), 100)
  const length = range === '1D' ? 13 : 10
  const values: number[] = []
  for (let i = 0; i < length; i += 1) {
    const wave = Math.sin(i * 0.7 + base * 0.01) * 4
    values.push(base + i * 1.2 + wave)
  }
  return values
}

export function getPortfolioSummary(range: ChartRange) {
  const series = getPortfolioSeries(range)
  const value = series[series.length - 1]
  const start = series[0]
  const change = value - start
  const changePercent = (change / start) * 100
  return { value, change, changePercent }
}

export function findStock(symbol: string): Stock | undefined {
  const upper = symbol.toUpperCase()
  const holding = MOCK_HOLDINGS.find((h) => h.symbol === upper)
  if (holding) return holding
  return MOCK_SUGGESTIONS.find((s) => s.symbol === upper)
}

export function findHolding(symbol: string): Holding | undefined {
  return MOCK_HOLDINGS.find((h) => h.symbol === symbol.toUpperCase())
}

export function getNews(symbol: string): NewsItem[] {
  return NEWS_BY_SYMBOL[symbol.toUpperCase()] ?? DEFAULT_NEWS
}

export const CHART_RANGES: ChartRange[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL']

export function formatCurrency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatChange(change: number, percent: number): string {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${formatCurrency(change)} (${sign}${percent.toFixed(2)}%)`
}
