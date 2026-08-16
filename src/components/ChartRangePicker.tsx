import type { ChartRange } from '../data/mockMarket'
import { CHART_RANGES } from '../data/mockMarket'
import './ChartRangePicker.css'

type ChartRangePickerProps = {
  value: ChartRange
  onChange: (range: ChartRange) => void
}

export function ChartRangePicker({ value, onChange }: ChartRangePickerProps) {
  return (
    <div className="chart-range-picker" role="tablist" aria-label="Chart time range">
      {CHART_RANGES.map((range) => (
        <button
          key={range}
          type="button"
          role="tab"
          aria-selected={value === range}
          className={`chart-range-btn${value === range ? ' chart-range-btn--active' : ''}`}
          onClick={() => onChange(range)}
        >
          {range}
        </button>
      ))}
    </div>
  )
}
