import type { Occasion } from './types'

const DAY = 86_400_000

export const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n)

export const daysBetween = (a: number, b: number) => Math.round((b - a) / DAY)

export const daysAgo = (ts: number) => Math.max(0, daysBetween(ts, Date.now()))

export function agoLabel(ts: number): string {
  const d = daysAgo(ts)
  if (d === 0) return 'heute'
  if (d === 1) return 'gestern'
  return `vor ${d} Tagen`
}

/** Nächstes Vorkommen eines Anlasses (Monat/Tag) ab heute. */
export function nextOccurrence(o: Pick<Occasion, 'month' | 'day'>, now = new Date()): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let d = new Date(start.getFullYear(), o.month - 1, o.day)
  if (d < start) d = new Date(start.getFullYear() + 1, o.month - 1, o.day)
  return d
}

export function daysUntil(o: Pick<Occasion, 'month' | 'day'>): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return daysBetween(start.getTime(), nextOccurrence(o, now).getTime())
}

export function untilLabel(days: number): string {
  if (days === 0) return 'heute'
  if (days === 1) return 'morgen'
  return `in ${days} Tagen`
}

export const dateLabel = (o: Pick<Occasion, 'month' | 'day'>) =>
  nextOccurrence(o).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })

export const shortDate = (ts: number) =>
  new Date(ts).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })

export const timeLabel = (ts: number) =>
  new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export const normalize = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim()

export const uid = () => Math.random().toString(36).slice(2, 10)

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export const initial = (name: string) => (name.trim()[0] ?? '?').toUpperCase()

export const dayAgoTs = (d: number) => Date.now() - d * DAY

/** "2026-11-08" -> { month: 11, day: 8 } */
export function parseMonthDay(iso: string): { month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? { month: Number(m[2]), day: Number(m[3]) } : null
}

export function toInputDate(o: Pick<Occasion, 'month' | 'day'>): string {
  const y = new Date().getFullYear()
  return `${y}-${String(o.month).padStart(2, '0')}-${String(o.day).padStart(2, '0')}`
}
