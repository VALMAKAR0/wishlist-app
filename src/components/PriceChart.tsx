import { useId, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { motion } from 'motion/react'
import { money } from '../lib/format'
import { nearest } from '../lib/chart'
import type { PricePoint } from '../lib/types'
import { useT } from '../state/ui'

const H = 156
const PAD = { l: 12, r: 12, t: 26, b: 24 }

const day = (ts: number) => new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })
const dayLong = (ts: number) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

interface Props {
  points: PricePoint[]
  base?: number
  target?: number
  cur: string
  /** Noch kein echter Verlauf: Linie gestrichelt, ohne Messpunkte und ohne Antippen. Leere Punkte = leeres Diagramm. */
  sketch?: boolean
}

/** Breite des Diagramms in Pixeln, damit Schrift und Linien auf Handy und Tablet gleich groß bleiben. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(320)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const set = () => setW(Math.max(220, Math.round(el.getBoundingClientRect().width)))
    set()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(set) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])
  return { ref, w }
}

/** Preisverlauf als Stufenlinie mit Fläche: Ein Preis gilt bis zur nächsten Messung. Antippen oder Ziehen zeigt einzelne Messpunkte. */
export function PriceChart({ points, base, target, cur, sketch }: Props) {
  const t = useT()
  const gid = useId().replace(/:/g, '')
  const { ref: box, w: W } = useWidth()
  const svg = useRef<SVGSVGElement>(null)
  const [pick, setPick] = useState<number | null>(null)
  const empty = points.length === 0

  if (empty) {
    const ys = [0.3, 0.55, 0.42, 0.68, 0.5]
    const step = (W - PAD.l - PAD.r) / (ys.length - 1)
    const y = (f: number) => PAD.t + f * (H - PAD.t - PAD.b)
    let d = `M${PAD.l} ${y(ys[0])}`
    ys.forEach((f, i) => i && (d += ` H${(PAD.l + i * step).toFixed(1)} V${y(f).toFixed(1)}`))
    return (
      <div className="pchart-wrap" ref={box}>
        <svg className="pchart" data-empty width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('Noch kein Preisverlauf')} data-testid="price-chart">
          <path className="pchart__ghost" d={d} />
          {target !== undefined && <text className="pchart__day" x={W - PAD.r} y={H - 6} textAnchor="end">{t('Wunschpreis')} {money(target, cur)}</text>}
        </svg>
      </div>
    )
  }

  const prices = points.map((p) => p.p).concat(base !== undefined ? [base] : [], target !== undefined ? [target] : [])
  let lo = Math.min(...prices)
  let hi = Math.max(...prices)
  if (hi - lo < 0.01) {
    lo -= Math.max(1, hi * 0.05)
    hi += Math.max(1, hi * 0.05)
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
  const area = `${line} V${H - PAD.b} H${x(points[0], 0).toFixed(1)} Z`
  let lowI = 0
  let highI = 0
  points.forEach((p, i) => {
    if (p.p < points[lowI].p - 0.005) lowI = i
    if (p.p > points[highI].p + 0.005) highI = i
  })
  const showLow = !sketch && points.length > 2 && lowI !== highI
  const last = points[points.length - 1]
  const shownI = pick ?? points.length - 1
  const shown = points[shownI]
  const sx = x(shown, shownI)
  const anchor = sx > W - 70 ? 'end' : sx < 70 ? 'start' : 'middle'

  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (sketch) return
    const r = svg.current?.getBoundingClientRect()
    if (!r || r.width === 0) return
    const fx = ((e.clientX - r.left) / r.width) * W
    setPick(nearest(points, Math.min(1, Math.max(0, (fx - PAD.l) / (W - PAD.l - PAD.r)))))
  }

  return (
    <div className="pchart-wrap" ref={box}>
      <svg
        ref={svg}
        className="pchart"
        data-sketch={sketch || undefined}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t('Preisverlauf mit {n} Punkten, zuletzt {p}', { n: points.length, p: money(last.p, cur) })}
        data-testid="price-chart"
        onPointerDown={(e) => {
          if (sketch) return
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
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} className="pchart__grid" x1={PAD.l} x2={W - PAD.r} y1={PAD.t + f * (H - PAD.t - PAD.b)} y2={PAD.t + f * (H - PAD.t - PAD.b)} />
        ))}
        {base !== undefined && <line className="pchart__base" x1={PAD.l} x2={W - PAD.r} y1={y(base)} y2={y(base)} />}
        {target !== undefined && (
          <g className="pchart__target">
            <line x1={PAD.l} x2={W - PAD.r} y1={y(target)} y2={y(target)} />
            <text x={W - PAD.r} y={y(target) - 5} textAnchor="end">
              {t('Wunschpreis')} {money(target, cur)}
            </text>
          </g>
        )}
        <motion.path className="pchart__area" d={area} fill={`url(#pg${gid})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.15 }} />
        {sketch ? <path className="pchart__line" data-sketch d={line} /> : <motion.path className="pchart__line" d={line} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />}
        {!sketch &&
          points.map((p, i) => (
            <motion.circle
              key={i}
              className="pchart__dot"
              data-guess={p.k === 'guess' || undefined}
              data-low={showLow && i === lowI ? true : undefined}
              cx={x(p, i)}
              cy={y(p.p)}
              r={showLow && i === lowI ? 4.4 : 3.4}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.25 + Math.min(i, 20) * 0.025, type: 'spring', stiffness: 500, damping: 24 }}
            />
          ))}
        {sketch && <circle className="pchart__dot" cx={x(last, points.length - 1)} cy={y(last.p)} r={3.8} />}
        {pick !== null && (
          <g className="pchart__pick">
            <line x1={sx} x2={sx} y1={PAD.t - 8} y2={H - PAD.b} />
            <circle cx={sx} cy={y(shown.p)} r={6.5} />
          </g>
        )}
        <text className="pchart__val" x={sx} y={Math.max(15, y(shown.p) - 11)} textAnchor={anchor}>
          {money(shown.p, cur)}
        </text>
        <text className="pchart__day" x={PAD.l} y={H - 6}>
          {sketch ? t('seit') + ' ' + day(t0) : day(t0)}
        </text>
        <text className="pchart__day" x={W - PAD.r} y={H - 6} textAnchor="end">
          {sketch ? t('heute') : day(last.t)}
        </text>
      </svg>
      {!sketch && (
        <p className="pchart__read" aria-live="polite" data-testid="chart-read">
          {pick !== null ? `${dayLong(shown.t)} · ${money(shown.p, cur)}${shown.k === 'guess' ? ' · ' + t('geraten') : ''}` : t('Tippe oder ziehe im Diagramm für einzelne Tage.')}
        </p>
      )}
    </div>
  )
}
