import { useMemo } from 'react'
import { formatCurrency } from '../data/mockMarket'
import './AllocationPie.css'

export type AllocationSlice = {
  id: string
  label: string
  value: number
  color: string
}

const SLICE_COLORS = [
  '#4F8CFF',
  '#22C55E',
  '#F59E0B',
  '#A78BFA',
  '#38BDF8',
  '#F472B6',
  '#94A3B8',
  '#2DD4BF',
]

type AllocationPieProps = {
  slices: AllocationSlice[]
  size?: number
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, endDeg)
  const end = polar(cx, cy, r, startDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} L ${cx} ${cy} Z`
}

export function buildHoldingSlices(
  holdings: { symbol: string; shares: number; price: number }[],
  cash: number,
): AllocationSlice[] {
  const slices: AllocationSlice[] = holdings
    .map((h, i) => ({
      id: h.symbol,
      label: h.symbol,
      value: h.shares * h.price,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
    }))
    .filter((s) => s.value > 0)

  if (cash > 0) {
    slices.push({
      id: 'CASH',
      label: 'Cash',
      value: cash,
      color: '#6B7482',
    })
  }

  return slices.sort((a, b) => b.value - a.value)
}

export function AllocationPie({ slices, size = 160 }: AllocationPieProps) {
  const total = useMemo(
    () => slices.reduce((sum, s) => sum + s.value, 0),
    [slices],
  )

  const paths = useMemo(() => {
    if (total <= 0) return []
    let angle = 0
    return slices.map((slice) => {
      const sweep = (slice.value / total) * 360
      const start = angle
      const end = angle + Math.max(sweep, 0.01)
      angle = end
      return {
        ...slice,
        d: arcPath(50, 50, 42, start, end),
        percent: (slice.value / total) * 100,
      }
    })
  }, [slices, total])

  if (total <= 0 || slices.length === 0) {
    return (
      <div className="alloc-pie alloc-pie--empty">
        <p>No allocation yet</p>
      </div>
    )
  }

  // Single full circle when only one slice
  const single = slices.length === 1

  return (
    <div className="alloc-pie">
      <svg
        className="alloc-pie-svg"
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role="img"
        aria-label="Portfolio allocation"
      >
        {single ? (
          <circle cx="50" cy="50" r="42" fill={slices[0].color} />
        ) : (
          paths.map((p) => <path key={p.id} d={p.d} fill={p.color} />)
        )}
        <circle cx="50" cy="50" r="24" fill="var(--color-bg)" />
      </svg>
      <ul className="alloc-pie-legend">
        {(single ? slices.map((s) => ({ ...s, percent: 100 })) : paths).map((p) => (
          <li key={p.id}>
            <span className="alloc-pie-swatch" style={{ background: p.color }} />
            <span className="alloc-pie-label">{p.label}</span>
            <span className="alloc-pie-meta">
              {formatCurrency(p.value)} · {p.percent.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
