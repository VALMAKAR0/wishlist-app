import { money } from '../lib/format'
import type { PricePoint } from '../lib/types'
import { useT } from '../state/ui'

const W = 320
const H = 132
const PAD = { l: 10, r: 10, t: 22, b: 24 }

const day = (ts: number) => new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })

/** Linien-Diagramm des Preisverlaufs. Gefüllte Punkte sind sicher, hohle sind geraten. */
export function PriceChart({ points, base, cur }: { points: PricePoint[]; base?: number; cur: string }) {
  const t = useT()
  const prices = points.map((p) => p.p).concat(base !== undefined ? [base] : [])
  let lo = Math.min(...prices)
  let hi = Math.max(...prices)
  if (hi - lo < 0.01) {
    lo -= 1
    hi += 1
  }
  const pad = (hi - lo) * 0.12
  lo -= pad
  hi += pad
  const t0 = points[0].t
  const span = points[points.length - 1].t - t0
  const x = (p: PricePoint, i: number) => PAD.l + ((span > 0 ? (p.t - t0) / span : points.length > 1 ? i / (points.length - 1) : 0.5) * (W - PAD.l - PAD.r))
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p, i).toFixed(1)} ${y(p.p).toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  const lx = x(last, points.length - 1)
  const anchor = lx > W - 60 ? 'end' : 'middle'
  return (
    <svg className="pchart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('Preisverlauf mit {n} Punkten, zuletzt {p}', { n: points.length, p: money(last.p, cur) })} data-testid="price-chart">
      {base !== undefined && <line className="pchart__base" x1={PAD.l} x2={W - PAD.r} y1={y(base)} y2={y(base)} />}
      <path className="pchart__line" d={line} />
      {points.map((p, i) => (
        <circle key={i} className="pchart__dot" data-guess={p.k === 'guess' || undefined} cx={x(p, i)} cy={y(p.p)} r={3.6} />
      ))}
      <text className="pchart__val" x={lx} y={y(last.p) - 9} textAnchor={anchor}>
        {money(last.p, cur)}
      </text>
      <text className="pchart__day" x={PAD.l} y={H - 6}>
        {day(t0)}
      </text>
      <text className="pchart__day" x={W - PAD.r} y={H - 6} textAnchor="end">
        {day(last.t)}
      </text>
    </svg>
  )
}
