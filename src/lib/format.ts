import type { TFn } from './i18n'
import type { Occasion } from './types'

const DAY = 86_400_000

// Sprache für Zahlen und Datumsangaben. Der UIProvider setzt sie vor jedem Rendern.
let locale = 'de-DE'
export const setLocale = (l: string) => {
  locale = l
}

export const eur = (n: number) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

export const daysBetween = (a: number, b: number) => Math.round((b - a) / DAY)

export const daysAgo = (ts: number) => Math.max(0, daysBetween(ts, Date.now()))

export function agoLabel(ts: number, t: TFn): string {
  const d = daysAgo(ts)
  if (d === 0) return t('heute')
  if (d === 1) return t('gestern')
  return t('vor {n} Tagen', { n: d })
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

export function untilLabel(days: number, t: TFn): string {
  if (days === 0) return t('heute')
  if (days === 1) return t('morgen')
  return t('in {n} Tagen', { n: days })
}

/** Tage von heute bis zu einem Datum "JJJJ-MM-TT". Negativ = vorbei. */
export function daysUntilIso(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return daysBetween(start.getTime(), new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime())
}

export function distanceLabel(days: number, t: TFn): string {
  if (days === 0) return t('heute')
  if (days === 1) return t('morgen')
  if (days === -1) return t('gestern')
  return days > 0 ? t('in {n} Tagen', { n: days }) : t('vor {n} Tagen', { n: -days })
}

export function isoLabel(iso: string, withYear = true): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return withYear ? d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : d.toLocaleDateString(locale, { day: 'numeric', month: 'long' })
}

export const dateLabel = (o: Pick<Occasion, 'month' | 'day'>) =>
  nextOccurrence(o).toLocaleDateString(locale, { day: 'numeric', month: 'long' })

export const shortDate = (ts: number) => new Date(ts).toLocaleDateString(locale, { day: 'numeric', month: 'short' })

export const longDate = (ts: number) => new Date(ts).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })

export const monthShort = (ts: number) => new Date(ts).toLocaleDateString(locale, { month: 'short' })

export const timeLabel = (ts: number) =>
  new Date(ts).toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export const normalize = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

export const uid = () => Math.random().toString(36).slice(2, 10)

export const initial = (name: string) => (name.trim()[0] ?? '?').toUpperCase()

export const dayAgoTs = (d: number) => Date.now() - d * DAY

/** "2026-11-08" -> { month: 11, day: 8 } */
export function parseMonthDay(iso: string): { month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? { month: Number(m[2]), day: Number(m[3]) } : null
}

/** Nächstes Vorkommen als Eingabewert "JJJJ-MM-TT" (das Jahr ist bei jährlichen Anlässen nur ein Platzhalter). */
export function toInputDate(o: Pick<Occasion, 'month' | 'day'>): string {
  const d = nextOccurrence(o)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Macht aus einer Eingabe einen öffnebaren Link (ergänzt https://, falls es fehlt). */
export function toHref(link: string): string {
  const l = link.trim()
  return /^[a-z][a-z0-9+.-]*:/i.test(l) ? l : `https://${l}`
}

export const hostOf = (link: string) => {
  try {
    return new URL(toHref(link)).hostname.replace(/^www\./, '')
  } catch {
    return link
  }
}
