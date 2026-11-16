import { useId, useRef, useState, type PointerEvent } from 'react'
import { money } from '../lib/format'
import { nearest } from '../lib/chart'
import type { PricePoint } from '../lib/types'
import { useT } from '../state/ui'

const W = 320
const H = 150
const PAD = { l: 12, r: 12, t: 24, b: 24 }

const day = (ts: number) => new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })
const dayLong = (ts: number) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

interface Props {
  points: PricePoint[]
  base?: number
  target?: number
  cur: string
}

/** Preisverlauf als Stufenlinie mit Fläche: Ein Preis gilt bis zur nächsten Messung. Antippen oder Ziehen zeigt einzelne Messpunkte. */
export function PriceChart({ points, base, target, cur }: Props) {
  const t = useT()
  const gid = useId().replace(/:/g, '')
  const ref = useRef<SVGSVGElement>(null)
  const [pick, setPick] = useState<number | null>(null)
  const prices = points.map((p) => p.p).concat(base !== undefined ? [base] : [], target !== undefined ? [target] : [])
  let lo = Math.min(...prices)
  let hi = Math.max(...prices)
  if (hi - lo < 0.01) {
    lo -= 1
    hi += 1
  }
  const pad = (hi - lo) * 0.14
  lo -= pad
  hi += pad
  const t0 = points[0].t
  const span = points[points.length - 1].t - t0
  const x = (p: PricePoint, i: number) => PAD.l + (span > 0 ? (p.t - t0) / span : points.length > 1 ? i / (points.length - 1) : 0.5) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
  let line = ''
  points.forEach((p, i) => {
    const px = x(p, i).toFixed(1)
    const py = y(p.p).toFixed(1)
    if (!i) line = `M${px} ${py}`
    else line += ` H${px} V${py}`
  })
  const lastX = x(points[points.length - 1], points.length - 1)
  const area = `${line} V${H - PAD.b} H${x(points[0], 0).toFixed(1)} Z`
  let lowI = 0
  let highI = 0
  points.forEach((p, i) => {
    if (p.p < points[lowI].p - 0.005) lowI = i
    if (p.p > points[highI].p + 0.005) highI = i
  })
  const last = points[points.length - 1]
  const shown = pick !== null ? points[pick] : last
  const shownI = pick ?? points.length - 1
  const sx = x(shown, shownI)
  const anchor = sx > W - 64 ? 'end' : sx < 64 ? 'start' : 'middle'

  const move = (e: PointerEvent<SVGSVGElement>) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r || r.width === 0) return
    const fx = ((e.clientX - r.left) / r.width) * W
    setPick(nearest(points, Math.min(1, Math.max(0, (fx - PAD.l) / (W - PAD.l - PAD.r)))))
  }

  return (
    <div className="pchart-wrap">
      <svg
        ref={ref}
        className="pchart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t('Preisverlauf mit {n} Punkten, zuletzt {p}', { n: points.length, p: money(last.p, cur) })}
        data-testid="price-chart"
        onPointerDown={(e) => {
          ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
          move(e)
        }}
        onPointerMove={(e) => {
          if (e.buttons || e.pointerType === 'mouse') move(e)
        }}
        onPointerLeave={() => setPick(null)}
        onPointerUp={(e) => {
          if (e.pointerType !== 'mouse') window.setTimeout(() => setPick(null), 1800)
        }}
      >
        <defs>
          <linearGradient id={`pg${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="pchart__g0" />
            <stop offset="100%" className="pchart__g1" />
          </linearGradient>
        </defs>
        {base !== undefined && <line className="pchart__base" x1={PAD.l} x2={W - PAD.r} y1={y(base)} y2={y(base)} />}
        {target !== undefined && (
          <g className="pchart__target">
            <line x1={PAD.l} x2={W - PAD.r} y1={y(target)} y2={y(target)} />
            <text x={W - PAD.r} y={y(target) - 4} textAnchor="end">
              {t('Wunschpreis')} {money(target, cur)}
            </text>
          </g>
        )}
        <path className="pchart__area" d={area} fill={`url(#pg${gid})`} />
        <path className="pchart__line" d={line} />
        <line className="pchart__now" x1={lastX} x2={W - PAD.r} y1={y(last.p)} y2={y(last.p)} />
        {points.map((p, i) => (
          <circle key={i} className="pchart__dot" data-guess={p.k === 'guess' || undefined} data-low={points.length > 2 && i === lowI && lowI !== highI ? true : undefined} cx={x(p, i)} cy={y(p.p)} r={i === lowI && points.length > 2 && lowI !== highI ? 4.4 : 3.4} />
        ))}
        {pick !== null && (
          <g className="pchart__pick">
            <line x1={sx} x2={sx} y1={PAD.t - 6} y2={H - PAD.b} />
            <circle cx={sx} cy={y(shown.p)} r={6} />
          </g>
        )}
        <text className="pchart__val" x={sx} y={Math.max(14, y(shown.p) - 10)} textAnchor={anchor}>
          {money(shown.p, cur)}
        </text>
        <text className="pchart__day" x={PAD.l} y={H - 6}>
          {day(t0)}
        </text>
        <text className="pchart__day" x={W - PAD.r} y={H - 6} textAnchor="end">
          {day(last.t)}
        </text>
      </svg>
      <p className="pchart__read" aria-live="polite" data-testid="chart-read">
        {pick !== null ? `${dayLong(shown.t)} · ${money(shown.p, cur)}${shown.k === 'guess' ? ' · ' + t('geraten') : ''}` : t('Tippe oder ziehe im Diagramm für einzelne Tage.')}
      </p>
    </div>
  )
}
