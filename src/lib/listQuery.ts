import { hostOf } from './format'
import { priceDelta } from './priceCheck'
import type { Item, SortMode } from './types'

export type Filt = 'link' | 'noprice' | 'drop' | 'target' | 'prio' | 'note'

export const FILTS: Filt[] = ['prio', 'drop', 'target', 'link', 'noprice', 'note']

export interface ListQuery {
  q: string
  f: Filt[]
  kind: string | null
}

export const EMPTY_QUERY: ListQuery = { q: '', f: [], kind: null }

export const isActive = (q: ListQuery) => !!q.q.trim() || q.f.length > 0 || q.kind !== null

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')

/** Wunschpreis erreicht: Preis da, gleiche Währung, höchstens der Wunschpreis. */
export const targetHit = (i: Pick<Item, 'price' | 'priceTarget'>) => i.price !== undefined && i.priceTarget !== undefined && i.price <= i.priceTarget + 0.005

/** Tiefstpreis im Verlauf (mindestens drei Messpunkte). */
export function lowest(i: Pick<Item, 'price' | 'priceLog'>): { p: number; t: number } | null {
  const log = i.priceLog ?? []
  if (log.length < 3) return null
  let best = log[0]
  for (const pt of log) if (pt.p < best.p - 0.005) best = pt
  return { p: best.p, t: best.t }
}

/** Steht der aktuelle Preis auf dem Tiefstpreis des Verlaufs, und war er schon mal höher? */
export function atLowest(i: Pick<Item, 'price' | 'priceLog'>): boolean {
  const low = lowest(i)
  if (!low || i.price === undefined) return false
  const log = i.priceLog ?? []
  return i.price <= low.p + 0.005 && log.some((pt) => pt.p > low.p + 0.005)
}

const has = (i: Item, f: Filt): boolean => {
  switch (f) {
    case 'link':
      return !!i.link
    case 'noprice':
      return i.price === undefined
    case 'drop': {
      const d = priceDelta(i)
      return d !== null && d < 0
    }
    case 'target':
      return targetHit(i)
    case 'prio':
      return !!i.prio
    case 'note':
      return !!i.note
  }
}

/** Trifft der Eintrag Suche, Filter und Art? Filter sind UND-verknüpft. */
export function matches(i: Item, q: ListQuery): boolean {
  if (q.kind !== null && (i.kind ?? '').trim().toLowerCase() !== q.kind.toLowerCase()) return false
  for (const f of q.f) if (!has(i, f)) return false
  const words = norm(q.q).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = norm([i.name, i.kind ?? '', i.note ?? '', i.link ? hostOf(i.link) : ''].join(' '))
  return words.every((w) => hay.includes(w))
}

/** Arten der Einträge mit Anzahl, häufigste zuerst. */
export function kindsOf(items: Item[]): { kind: string; n: number }[] {
  const m = new Map<string, { kind: string; n: number }>()
  for (const i of items) {
    const k = i.kind?.trim()
    if (!k) continue
    const key = k.toLowerCase()
    const e = m.get(key)
    if (e) e.n += 1
    else m.set(key, { kind: k, n: 1 })
  }
  return [...m.values()].sort((a, b) => b.n - a.n || a.kind.localeCompare(b.kind))
}

/** Wie viele Einträge ein Filter treffen würde (für die Zahlen an den Chips). */
export const countFor = (items: Item[], f: Filt) => items.filter((i) => has(i, f)).length

const dropOf = (i: Item) => {
  const d = priceDelta(i)
  return d !== null && d < 0 && i.priceBase ? d / i.priceBase : 0
}

/** Sortiert eine Kopie. priceOf rechnet in die Hauptwährung um. Ohne Preis steht immer hinten. */
export function sortList(list: Item[], mode: SortMode, priceOf: (i: Item) => number): Item[] {
  const a = [...list]
  const byNew = (x: Item, y: Item) => y.createdAt - x.createdAt
  const priced = (x: Item, y: Item, dir: 1 | -1) => (x.price === undefined ? (y.price === undefined ? byNew(x, y) : 1) : y.price === undefined ? -1 : dir * (priceOf(x) - priceOf(y)) || byNew(x, y))
  switch (mode) {
    case 'old':
      return a.sort((x, y) => x.createdAt - y.createdAt)
    case 'name':
      return a.sort((x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: 'base', numeric: true }))
    case 'priceDown':
      return a.sort((x, y) => priced(x, y, -1))
    case 'priceUp':
      return a.sort((x, y) => priced(x, y, 1))
    case 'prio':
      return a.sort((x, y) => (y.prio ?? 0) - (x.prio ?? 0) || byNew(x, y))
    case 'drop':
      return a.sort((x, y) => dropOf(x) - dropOf(y) || (targetHit(y) ? 1 : 0) - (targetHit(x) ? 1 : 0) || byNew(x, y))
    default:
      return a.sort(byNew)
  }
}

