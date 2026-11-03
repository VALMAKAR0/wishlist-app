import type { TFn } from './i18n'
import type { DateFmt, Occasion } from './types'

const DAY = 86_400_000

// Sprache für Zahlen und Datumsangaben. Der UIProvider setzt sie vor jedem Rendern.
let locale = 'de-DE'
export const setLocale = (l: string) => {
  locale = l
}

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CZK', 'PLN', 'DKK', 'SEK', 'NOK', 'JPY', 'CAD', 'AUD']

// Hauptwährung, Kurse (Einheiten je 1 Euro) und Datumsformat. Der UIProvider setzt sie vor jedem Rendern.
let mainCur = 'EUR'
let rates: Record<string, number> = {}
let dateFmt: DateFmt = 'auto'
export const setMoney = (main: string, r: Record<string, number>) => {
  mainCur = main
  rates = r
}
export const setDateFmt = (f: DateFmt) => {
  dateFmt = f
}
export const mainCurrency = () => mainCur

export const money = (n: number, cur?: string) => {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: cur ?? mainCur }).format(n)
  } catch {
    return `${n.toFixed(2)} ${cur ?? mainCur}`
  }
}

export const curOf = (i: { currency?: string }) => i.currency ?? 'EUR'

const rateOf = (c: string) => (c === 'EUR' ? 1 : rates[c])
export const hasRate = (c: string) => Number.isFinite(rateOf(c)) && (rateOf(c) as number) > 0

/** Rechnet einen Betrag in die Hauptwährung um. Fehlt ein Kurs, bleibt der Betrag unverändert. */
export function convert(n: number, from: string, to = mainCur): number {
  if (from === to) return n
  if (!hasRate(from) || !hasRate(to)) return n
  return (n / (rateOf(from) as number)) * (rateOf(to) as number)
}

/** Preis eines Eintrags in der Hauptwährung, 0 ohne Preis. */
export const priceOf = (i: { price?: number; currency?: string; cur?: string }): number =>
  i.price === undefined ? 0 : convert(i.price, i.currency ?? i.cur ?? 'EUR')

/** Preis in seiner eigenen Währung, bei fremder Währung mit Umrechnung dahinter. */
export function priceText(price: number, cur: string | undefined): { main: string; sub?: string } {
  const c = cur ?? 'EUR'
  if (c === mainCur) return { main: money(price, c) }
  return { main: money(price, c), sub: hasRate(c) && hasRate(mainCur) ? `≈ ${money(convert(price, c))}` : undefined }
}

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

const p2 = (n: number) => String(n).padStart(2, '0')

/** Zahlenformate nach Einstellung. null = Automatik (Sprache und Monatsname). */
function numeric(d: Date, withYear: boolean): string | null {
  const dd = p2(d.getDate())
  const mm = p2(d.getMonth() + 1)
  const y = d.getFullYear()
  if (dateFmt === 'dmy') return withYear ? `${dd}.${mm}.${y}` : `${dd}.${mm}.`
  if (dateFmt === 'mdy') return withYear ? `${mm}/${dd}/${y}` : `${mm}/${dd}`
  if (dateFmt === 'iso') return withYear ? `${y}-${mm}-${dd}` : `${mm}-${dd}`
  return null
}

export function isoLabel(iso: string, withYear = true): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const num = numeric(d, withYear)
  if (num) return withYear ? `${d.toLocaleDateString(locale, { weekday: 'short' })} ${num}` : num
  return withYear ? d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : d.toLocaleDateString(locale, { day: 'numeric', month: 'long' })
}

export const dateLabel = (o: Pick<Occasion, 'month' | 'day'>) => {
  const d = nextOccurrence(o)
  return numeric(d, false) ?? d.toLocaleDateString(locale, { day: 'numeric', month: 'long' })
}

export const shortDate = (ts: number) => {
  const d = new Date(ts)
  return numeric(d, false) ?? d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

export const longDate = (ts: number) => {
  const d = new Date(ts)
  return numeric(d, true) ?? d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

export const monthShort = (ts: number) => new Date(ts).toLocaleDateString(locale, { month: 'short' })

export const timeLabel = (ts: number) => {
  const d = new Date(ts)
  const num = numeric(d, true)
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  return num ? `${num} ${time}` : d.toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const normalize = (s: string) =>
  s.toLowerCase().replace(/ß/g, 'ss').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

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
