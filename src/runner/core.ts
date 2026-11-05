import { parseProduct } from '../lib/linkImport'
import { applyCheck, foundOf, type Found } from '../lib/priceCheck'
import type { Item, PriceSpot, PriceState } from '../lib/types'

export interface Snap {
  id: string
  name: string
  link: string
  price?: number
  currency?: string
  priceState?: PriceState
  priceGuessOk?: boolean
  priceSpot?: PriceSpot
  priceNo?: number
}

export interface Cfg {
  on: boolean
  hour: number
  items: Snap[]
}

export interface Result {
  id: string
  at: number
  found: Found | 'lost' | null
}

export interface Page {
  ok: boolean
  status: number
  text: string
  url: string
}

export interface Io {
  get(key: string): string | null
  set(key: string, value: string): void
  fetchText(url: string): Promise<Page>
  notify(n: { id: number; title: string; body: string; largeBody?: string }): void
  now(): Date
  wait(ms: number): Promise<void>
}

const OUT_MAX = 300
export const NOTE_ID = 7001

const read = <T,>(io: Io, key: string, fallback: T): T => {
  try {
    const raw = io.get(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export function fmtMoney(n: number, cur = 'EUR'): string {
  const [i, d] = n.toFixed(2).split('.')
  return `${group(i)},${d} ${cur === 'EUR' ? '€' : cur}`
}

/** Merkt Einstellung und Einträge, die die App übergibt. */
export function syncCfg(io: Io, details: Partial<Cfg> | undefined): void {
  const items = Array.isArray(details?.items) ? details.items.filter((s) => s && s.id && s.link) : []
  const cfg: Cfg = { on: !!details?.on, hour: typeof details?.hour === 'number' ? details.hour : 8, items }
  io.set('cfg', JSON.stringify(cfg))
}

/** Gibt die gesammelten Ergebnisse heraus und leert sie. */
export function collect(io: Io): { results: Result[] } {
  const results = read<Result[]>(io, 'out', [])
  io.set('out', '[]')
  return { results }
}

export function status(io: Io): { on: boolean; count: number; last: string; pending: number; runs: number } {
  const cfg = read<Cfg | null>(io, 'cfg', null)
  return { on: !!cfg?.on, count: cfg?.items.length ?? 0, last: io.get('last') ?? '', pending: read<Result[]>(io, 'out', []).length, runs: Number(io.get('runs') ?? 0) }
}

const NEUTRAL: Array<keyof Snap> = ['price', 'currency', 'priceState', 'priceNo']

/** Prüft alle Einträge einmal am Tag ab der eingestellten Stunde. force: sofort, ohne Tageslimit. */
export async function runCheck(io: Io, force = false): Promise<{ ran: boolean; reason?: string; checked: number; failed: number; drops: number }> {
  const none = (reason: string) => ({ ran: false, reason, checked: 0, failed: 0, drops: 0 })
  const cfg = read<Cfg | null>(io, 'cfg', null)
  if (!cfg || !cfg.on || !cfg.items.length) return none('off')
  const now = io.now()
  const today = dayKey(now)
  if (!force) {
    if (now.getHours() < cfg.hour) return none('early')
    if (io.get('last') === today) return none('done')
  }
  const out = read<Result[]>(io, 'out', [])
  const drops: Array<{ name: string; from: number; to: number; cur: string }> = []
  let ok = 0
  let failed = 0
  for (let i = 0; i < cfg.items.length; i++) {
    const snap = cfg.items[i]
    try {
      const page = await io.fetchText(snap.link)
      if (!page.ok) throw new Error(`HTTP ${page.status}`)
      const { product, lost } = parseProduct(page.text, page.url || snap.link, snap.priceSpot)
      const found = foundOf(product, lost, snap.priceSpot)
      const at = now.getTime()
      const r = applyCheck(snap as unknown as Item, found, at)
      for (const k of NEUTRAL) if (k in r.patch) (snap as unknown as Record<string, unknown>)[k] = (r.patch as Record<string, unknown>)[k]
      if (r.outcome.kind === 'changed' && r.outcome.to < r.outcome.from) drops.push({ name: snap.name, from: r.outcome.from, to: r.outcome.to, cur: snap.currency ?? 'EUR' })
      out.push({ id: snap.id, at, found })
      ok += 1
    } catch {
      failed += 1
    }
    if (i < cfg.items.length - 1) await io.wait(700)
  }
  io.set('cfg', JSON.stringify(cfg))
  io.set('out', JSON.stringify(out.length > OUT_MAX ? out.slice(out.length - OUT_MAX) : out))
  io.set('runs', String(Number(io.get('runs') ?? 0) + 1))
  if (ok > 0 || failed === 0) io.set('last', today)
  if (drops.length === 1) {
    const d = drops[0]
    io.notify({ id: NOTE_ID, title: 'Preis gesunken', body: `${d.name}: ${fmtMoney(d.from, d.cur)} → ${fmtMoney(d.to, d.cur)}` })
  } else if (drops.length > 1) {
    const lines = drops.map((d) => `${d.name}: ${fmtMoney(d.from, d.cur)} → ${fmtMoney(d.to, d.cur)}`)
    io.notify({ id: NOTE_ID, title: `${drops.length} Preise gesunken`, body: lines.join(', '), largeBody: lines.join('\n') })
  }
  return { ran: true, checked: ok, failed, drops: drops.length }
}
