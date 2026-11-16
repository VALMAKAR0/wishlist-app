import type { PricePoint } from './types'

export type Range = 30 | 90 | 0

const DAY = 86_400_000

/** Punkte im Zeitraum (Tage, 0 = alles). Der letzte Punkt davor bleibt als Startwert, damit die Linie links nicht abbricht. */
export function inRange(points: PricePoint[], range: Range, now: number): PricePoint[] {
  if (!range || points.length < 3) return points
  const from = now - range * DAY
  const i = points.findIndex((p) => p.t >= from)
  if (i <= 0) return i === 0 ? points : points.slice(-2)
  return points.slice(i - 1)
}

/** Lohnt sich die Zeitraum-Auswahl? Erst wenn der Verlauf länger als ein Monat ist. */
export const rangeUseful = (points: PricePoint[]) => points.length >= 3 && points[points.length - 1].t - points[0].t > 31 * DAY

export interface Stats {
  low: PricePoint
  high: PricePoint
  avg: number
  /** Abstand des aktuellen Preises zum Tiefstpreis in Prozent (0 = Tiefstpreis). */
  aboveLow: number
}

/** Kennzahlen eines Verlaufs. Der Durchschnitt ist zeitgewichtet: Ein Preis, der lange galt, zählt mehr. */
export function statsOf(points: PricePoint[], now: number): Stats | null {
  if (points.length < 2) return null
  let low = points[0]
  let high = points[0]
  let sum = 0
  let dur = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (p.p < low.p - 0.005) low = p
    if (p.p > high.p + 0.005) high = p
    const end = i + 1 < points.length ? points[i + 1].t : Math.max(now, p.t)
    const d = Math.max(end - p.t, 1)
    sum += p.p * d
    dur += d
  }
  const last = points[points.length - 1].p
  return { low, high, avg: Math.round((sum / dur) * 100) / 100, aboveLow: low.p > 0 ? Math.round(((last - low.p) / low.p) * 1000) / 10 : 0 }
}

/** Nächster Punkt zu einer x-Position (0..1 über die Zeitachse). */
export function nearest(points: PricePoint[], frac: number): number {
  if (points.length < 2) return 0
  const t0 = points[0].t
  const span = points[points.length - 1].t - t0
  if (span <= 0) return Math.round(frac * (points.length - 1))
  const target = t0 + frac * span
  let best = 0
  for (let i = 1; i < points.length; i++) if (Math.abs(points[i].t - target) < Math.abs(points[best].t - target)) best = i
  return best
}
