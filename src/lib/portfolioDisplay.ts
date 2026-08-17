import type { ChartRange } from '../data/mockMarket'
import type { HoldingItem, PortfolioSummary } from './portfolioApi'

export function chartPointsToSeries(points: { time: number; value: number }[]): number[] {
  if (points.length === 0) return []
  return points.map((p) => p.value)
}

export function chartPointTimes(points: { time: number; value: number }[]): number[] {
  return points.map((p) => p.time)
}

export function scaleChartX(
  times: number[] | undefined,
  count: number,
  width: number,
  padding: number,
): number[] {
  const span = width - padding * 2
  if (count < 2) {
    return Array.from({ length: count }, () => padding)
  }
  if (!times || times.length !== count) {
    return Array.from(
      { length: count },
      (_, index) => padding + (index / (count - 1)) * span,
    )
  }
  const start = times[0]
  const end = times[times.length - 1]
  const duration = Math.max(end - start, 1)
  return times.map((time) => padding + ((time - start) / duration) * span)
}

export function portfolioSeriesFromSummary(
  chartSeries: number[],
  totalValue: number,
): number[] {
  if (chartSeries.length > 0) {
    return chartSeries
  }
  if (totalValue > 0) {
    return [totalValue, totalValue]
  }
  return []
}

export function portfolioChangeHint(range: ChartRange | string): string {
  if (range === '1D') {
    return "Today's change is measured from the start of the day, or from your first purchase today."
  }
  return `Change for ${range} matches the chart: current value vs the first point in that period.`
}

export function toPortfolioDisplaySummary(
  portfolio: Pick<PortfolioSummary, 'total_value' | 'day_change' | 'day_change_percent'>,
) {
  return {
    value: portfolio.total_value,
    change: portfolio.day_change,
    changePercent: portfolio.day_change_percent,
  }
}

export function holdingToStock(holding: HoldingItem) {
  return {
    symbol: holding.symbol,
    name: holding.name,
    price: holding.price,
    change: holding.change,
    changePercent: holding.change_percent,
    shares: holding.shares,
    avgCost: holding.avg_cost,
  }
}
