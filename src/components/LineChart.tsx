import { useId } from 'react'
import { scaleChartX } from '../lib/portfolioDisplay'

type LineChartProps = {
  data: number[]
  times?: number[]
  positive?: boolean
  height?: number
  className?: string
  /** Price reference line; defaults to the first point. Flat segments sit on the vertical center. */
  baseline?: number
}

export function LineChart({
  data,
  times,
  positive = true,
  height = 200,
  className = '',
  baseline,
}: LineChartProps) {
  const reactId = useId().replace(/:/g, '')
  if (data.length < 2) {
    return null
  }

  const width = 400
  const padding = 4
  const ref = baseline ?? data[0]
  const halfSpan = Math.max(...data.map((value) => Math.abs(value - ref)), 0.0001)
  const plotHalf = height / 2 - padding
  const xs = scaleChartX(times, data.length, width, padding)

  const points = data.map((value, index) => {
    const x = xs[index] ?? padding
    const y = height / 2 - ((value - ref) / halfSpan) * plotHalf
    return { x, y }
  })

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`

  const stroke = positive ? 'var(--color-gain)' : 'var(--color-loss)'
  const gradientId = `chart-gradient-${positive ? 'up' : 'down'}-${reactId}`

  return (
    <svg
      className={`line-chart ${className}`.trim()}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="line-chart-area" d={areaPath} fill={`url(#${gradientId})`} />
      <path
        className="line-chart-line"
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
