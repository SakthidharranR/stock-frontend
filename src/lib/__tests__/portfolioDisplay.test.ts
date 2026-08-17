import {
  chartPointsToSeries,
  holdingToStock,
  portfolioChangeHint,
  portfolioSeriesFromSummary,
  scaleChartX,
  toPortfolioDisplaySummary,
} from '../portfolioDisplay'
import type { HoldingItem } from '../portfolioApi'

describe('holdingToStock', () => {
  it('maps cost-basis change fields from the holdings API', () => {
    const holding: HoldingItem = {
      symbol: 'MSFT',
      name: 'Microsoft',
      shares: 1,
      avg_cost: 499.99,
      price: 499.99,
      change: 0,
      change_percent: 0,
      equity: 499.99,
    }

    const stock = holdingToStock(holding)

    expect(stock.symbol).toBe('MSFT')
    expect(stock.price).toBe(499.99)
    expect(stock.change).toBe(0)
    expect(stock.changePercent).toBe(0)
    expect(stock.avgCost).toBe(499.99)
  })
})

describe('toPortfolioDisplaySummary', () => {
  it('uses API range change fields for the hero summary', () => {
    expect(
      toPortfolioDisplaySummary({
        total_value: 10150,
        day_change: 350,
        day_change_percent: 3.57,
      }),
    ).toEqual({
      value: 10150,
      change: 350,
      changePercent: 3.57,
    })
  })
})

describe('portfolioChangeHint', () => {
  it('describes start-of-day or first purchase for 1D', () => {
    expect(portfolioChangeHint('1D')).toContain('start of the day')
    expect(portfolioChangeHint('1D')).toContain('first purchase')
  })

  it('describes selected range for non-1D periods', () => {
    expect(portfolioChangeHint('1W')).toContain('1W')
    expect(portfolioChangeHint('1Y')).toContain('1Y')
    expect(portfolioChangeHint('ALL')).toContain('chart')
    expect(portfolioChangeHint('1M')).not.toContain('start of the day')
  })
})

describe('chartPointsToSeries', () => {
  it('maps point values in order', () => {
    expect(
      chartPointsToSeries([
        { time: 1, value: 10000 },
        { time: 2, value: 10150 },
      ]),
    ).toEqual([10000, 10150])
  })

  it('returns empty for no points', () => {
    expect(chartPointsToSeries([])).toEqual([])
  })
})

describe('scaleChartX', () => {
  it('spaces points evenly when times are missing', () => {
    expect(scaleChartX(undefined, 3, 100, 0)).toEqual([0, 50, 100])
  })

  it('places a late point near the right edge', () => {
    const xs = scaleChartX([0, 90, 100], 3, 100, 0)
    expect(xs[0]).toBe(0)
    expect(xs[1]).toBe(90)
    expect(xs[2]).toBe(100)
  })
})

describe('portfolioSeriesFromSummary', () => {
  it('prefers live chart series when present', () => {
    expect(portfolioSeriesFromSummary([100, 110, 105], 105)).toEqual([100, 110, 105])
  })

  it('falls back to a flat pair when only total value exists', () => {
    expect(portfolioSeriesFromSummary([], 10000)).toEqual([10000, 10000])
  })

  it('returns empty when there is no value', () => {
    expect(portfolioSeriesFromSummary([], 0)).toEqual([])
  })
})
