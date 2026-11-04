import { curOf } from './format'
import { fetchProduct, spotOf, type PriceCandidate } from './linkImport'
import type { Item, PricePoint, PriceSpot, PriceState } from './types'

export interface Found {
  price: number
  currency: string
  guess: boolean
}

export type Outcome =
  | { kind: 'none' }
  | { kind: 'currency'; currency: string }
  | { kind: 'same' }
  | { kind: 'set'; price: number }
  | { kind: 'changed'; from: number; to: number }
  | { kind: 'suggest'; from: number; to: number; guess: boolean }
  | { kind: 'ignored' }
  | { kind: 'lost' }

const LOG_MAX = 120
const DAY = 20 * 3_600_000
const same = (a: number, b: number) => Math.abs(a - b) < 0.005

/** Hängt einen Punkt an den Verlauf: nur bei neuem Preis oder nach etwa einem Tag, höchstens LOG_MAX Punkte. */
export function pushLog(log: PricePoint[] | undefined, pt: PricePoint): PricePoint[] {
  const out = log ? [...log] : []
  const last = out[out.length - 1]
  if (last && same(last.p, pt.p) && pt.t - last.t < DAY) out[out.length - 1] = { ...last, t: pt.t, k: pt.k === 'sure' || last.k === 'sure' ? 'sure' : pt.k }
  else out.push(pt)
  return out.length > LOG_MAX ? out.slice(out.length - LOG_MAX) : out
}

/** Änderung seit dem Hinzufügen: negativ = gesunken. Null, wenn nichts zu zeigen ist. */
export function priceDelta(i: Pick<Item, 'price' | 'priceBase' | 'priceTrack'>): number | null {
  if (i.priceTrack === false || i.price === undefined || i.priceBase === undefined) return null
  const d = Math.round((i.price - i.priceBase) * 100) / 100
  return Math.abs(d) < 0.005 ? null : d
}

/** Entscheidet, was ein gefundener Preis mit dem Eintrag macht. Rein, ohne Netz. */
export function applyCheck(item: Item, found: Found | null | 'lost', now: number): { patch: Partial<Item>; outcome: Outcome } {
  const patch: Partial<Item> = { priceCheckedAt: now }
  if (found === 'lost') return { patch, outcome: { kind: 'lost' } }
  if (!found) return { patch, outcome: { kind: 'none' } }
  if (found.currency !== curOf(item)) return { patch, outcome: { kind: 'currency', currency: found.currency } }
  const k: PriceState = found.guess ? 'guess' : 'sure'
  if (item.price === undefined) {
    return {
      patch: { ...patch, price: found.price, currency: found.currency === 'EUR' ? undefined : found.currency, priceState: k, priceBase: found.price, priceLog: pushLog(item.priceLog, { t: now, p: found.price, k }), priceSuggest: undefined },
      outcome: { kind: 'set', price: found.price },
    }
  }
  if (same(found.price, item.price)) {
    return { patch: { ...patch, priceLog: pushLog(item.priceLog, { t: now, p: item.price, k: item.priceState ?? k }), priceSuggest: undefined }, outcome: { kind: 'same' } }
  }
  if (item.priceNo !== undefined && same(found.price, item.priceNo)) return { patch, outcome: { kind: 'ignored' } }
  const trusted = item.priceState === 'sure' && (!found.guess || !!item.priceGuessOk)
  const log = pushLog(item.priceLog, { t: now, p: found.price, k: trusted ? 'sure' : k })
  if (trusted) {
    return { patch: { ...patch, price: found.price, priceLog: log, priceSuggest: undefined, priceNo: undefined }, outcome: { kind: 'changed', from: item.price, to: found.price } }
  }
  return {
    patch: { ...patch, priceLog: log, priceSuggest: { price: found.price, guess: found.guess, at: now } },
    outcome: { kind: 'suggest', from: item.price, to: found.price, guess: found.guess },
  }
}

/** Nimmt den Vorschlag an: Der Preis gilt ab jetzt als sicher. */
export function acceptSuggestion(item: Item, now: number): Partial<Item> {
  const s = item.priceSuggest
  if (!s) return {}
  return { price: s.price, priceState: 'sure', priceGuessOk: s.guess || item.priceGuessOk ? true : undefined, priceSuggest: undefined, priceNo: undefined, priceLog: pushLog(item.priceLog, { t: now, p: s.price, k: 'sure' }) }
}

/** Lehnt den Vorschlag ab und merkt sich den Wert, damit er nicht gleich wiederkommt. */
export const rejectSuggestion = (item: Item): Partial<Item> => ({ priceSuggest: undefined, priceNo: item.priceSuggest?.price })

/** „Der Preis stimmt“: aus geraten oder eingetragen wird sicher. */
export const confirmPrice = (item: Item, now: number): Partial<Item> =>
  item.price === undefined ? {} : { priceState: 'sure', priceGuessOk: item.priceState === 'guess' || item.priceGuessOk ? true : undefined, priceLog: pushLog(item.priceLog, { t: now, p: item.price, k: 'sure' }) }

/** Preisfelder beim Speichern im Formular. Gibt nur zurück, was sich ändern muss. */
export function priceFieldsOnSave(prev: Item | undefined, price: number | undefined, currency: string, from: PriceState | null, now: number, spot?: PriceSpot): Partial<Item> {
  if (price === undefined) return { priceState: undefined, priceGuessOk: undefined, priceSpot: undefined, priceBase: undefined, priceSuggest: undefined, priceNo: undefined, priceLog: undefined }
  const unchanged = prev && prev.price !== undefined && same(prev.price, price) && curOf(prev) === currency && !from
  if (unchanged) return {}
  const k: PriceState = from ?? 'user'
  const reset = !prev || prev.price === undefined || !same(prev.price, price) || curOf(prev) !== currency
  return {
    priceState: k,
    priceGuessOk: reset ? undefined : prev?.priceGuessOk,
    priceSpot: from === 'sure' && spot ? spot : reset ? undefined : prev?.priceSpot,
    priceBase: reset ? price : (prev?.priceBase ?? price),
    priceSuggest: undefined,
    priceNo: undefined,
    priceLog: reset ? pushLog(prev && curOf(prev) === currency ? prev.priceLog : undefined, { t: now, p: price, k }) : prev?.priceLog,
  }
}

/** Was eine Prüfung von der Seite mitbringt: den Preis (oder „Stelle verloren“) und alle Kandidaten. */
export interface Read {
  found: Found | null | 'lost'
  candidates: PriceCandidate[]
}

/** Liest den Preis von der Seite des Eintrags, wenn vorhanden von der gewählten Stelle. Wirft LinkError wie fetchProduct. */
export async function readFound(link: string, spot?: PriceSpot): Promise<Read> {
  const { product, lost } = await fetchProduct(link, spot)
  const candidates = product.candidates ?? []
  if (spot && lost) return { found: 'lost', candidates }
  if (product.price === undefined) return { found: null, candidates }
  return { found: { price: product.price, currency: product.currency ?? 'EUR', guess: !!product.priceGuess }, candidates }
}

/** Prüft einen Eintrag online. */
export async function checkItem(item: Item, now = Date.now()): Promise<{ patch: Partial<Item>; outcome: Outcome }> {
  return applyCheck(item, (await readFound(item.link ?? '', item.priceSpot)).found, now)
}

/** Preisfelder, wenn der Nutzer einen Kandidaten als richtige Stelle wählt: Der Preis gilt als sicher, die Stelle wird gemerkt. */
export function chooseCandidate(prev: Item | undefined, c: PriceCandidate, now: number): Partial<Item> {
  const cur = c.currency
  const sameAsBefore = !!prev && prev.price !== undefined && same(prev.price, c.price) && curOf(prev) === cur
  return {
    price: c.price,
    currency: cur === 'EUR' ? undefined : cur,
    priceState: 'sure',
    priceGuessOk: undefined,
    priceSpot: spotOf(c),
    priceSuggest: undefined,
    priceNo: undefined,
    priceBase: sameAsBefore ? (prev?.priceBase ?? c.price) : c.price,
    priceLog: pushLog(prev && curOf(prev) === cur ? prev.priceLog : undefined, { t: now, p: c.price, k: 'sure' }),
  }
}
export interface Summary {
  total: number
  down: number
  up: number
  set: number
  suggest: number
  same: number
  none: number
  lost: number
  failed: number
}

export const checkable = (i: Item): boolean => !i.deletedAt && !i.bought && !!i.link?.trim() && i.priceTrack !== false

/** Prüft alle beobachteten Einträge nacheinander (mit kleiner Pause, um Shops zu schonen). */
export async function checkAll(items: Item[], apply: (id: string, patch: Partial<Item>) => void, onProgress?: (done: number, total: number) => void, gap = 600): Promise<Summary> {
  const todo = items.filter(checkable)
  const sum: Summary = { total: todo.length, down: 0, up: 0, set: 0, suggest: 0, same: 0, none: 0, lost: 0, failed: 0 }
  let done = 0
  for (const it of todo) {
    try {
      const r = await checkItem(it)
      apply(it.id, r.patch)
      const o = r.outcome
      if (o.kind === 'changed') (o.to < o.from ? (sum.down += 1) : (sum.up += 1))
      else if (o.kind === 'set') sum.set += 1
      else if (o.kind === 'suggest') sum.suggest += 1
      else if (o.kind === 'lost') sum.lost += 1
      else if (o.kind === 'same' || o.kind === 'ignored') sum.same += 1
      else sum.none += 1
    } catch {
      sum.failed += 1
    }
    done += 1
    onProgress?.(done, todo.length)
    if (done < todo.length && gap > 0) await new Promise((res) => setTimeout(res, gap))
  }
  return sum
}
