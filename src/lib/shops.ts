import { curOf, hostOf, uid } from './format'
import { readFound, pushLog } from './priceCheck'
import type { Item, Shop } from './types'

export const MAX_SHOPS = 5

const shopCur = (s: Shop) => s.currency ?? 'EUR'
const key = (link: string) => hostOf(link).toLowerCase() + '|' + link.trim().replace(/^https?:\/\/(www\.)?/i, '').replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase()

export type AddResult = { ok: true; shop: Shop } | { ok: false; why: 'empty' | 'full' | 'dupe' | 'main' }

/** Neuen Shop vorbereiten. Prüft leere, doppelte und zu viele Links. */
export function makeShop(item: Pick<Item, 'link' | 'shops'>, link: string): AddResult {
  const l = link.trim()
  if (!l) return { ok: false, why: 'empty' }
  const shops = item.shops ?? []
  if (shops.length >= MAX_SHOPS) return { ok: false, why: 'full' }
  if (item.link && key(item.link) === key(l)) return { ok: false, why: 'main' }
  if (shops.some((s) => key(s.link) === key(l))) return { ok: false, why: 'dupe' }
  return { ok: true, shop: { id: uid(), link: l } }
}

/** Liest den Preis eines Shops. Fehler und fehlender Preis werden gemerkt, nichts wirft. */
export async function readShop(shop: Shop, now = Date.now()): Promise<Shop> {
  try {
    const { found } = await readFound(shop.link)
    if (!found || found === 'lost') return { ...shop, at: now, err: true }
    return { ...shop, price: found.price, currency: found.currency === 'EUR' ? undefined : found.currency, guess: found.guess || undefined, at: now, err: undefined }
  } catch {
    return { ...shop, at: now, err: true }
  }
}

export interface Offer {
  /** null = Hauptlink */
  shop: Shop | null
  price: number
}

/** Alle vergleichbaren Angebote (gleiche Währung wie der Eintrag), günstigstes zuerst. */
export function offers(item: Item): Offer[] {
  const cur = curOf(item)
  const out: Offer[] = []
  if (item.price !== undefined) out.push({ shop: null, price: item.price })
  for (const s of item.shops ?? []) if (s.price !== undefined && !s.err && shopCur(s) === cur) out.push({ shop: s, price: s.price })
  return out.sort((a, b) => a.price - b.price)
}

/** Günstigster Shop, falls er billiger als der Hauptlink ist (mindestens 1 Cent). */
export function cheaperShop(item: Item): Offer | null {
  if (item.price === undefined) return null
  const best = offers(item)[0]
  if (!best || !best.shop || best.price >= item.price - 0.005) return null
  return best
}

/** Tauscht den Hauptlink gegen einen Shop. Der alte Hauptlink wandert in die Shop-Liste, der Verlauf beginnt neu. */
export function promoteShop(item: Item, shopId: string, now = Date.now()): Partial<Item> | null {
  const s = (item.shops ?? []).find((x) => x.id === shopId)
  if (!s || s.price === undefined) return null
  const old: Shop | null = item.link ? { id: uid(), link: item.link, price: item.price, currency: item.currency, at: item.priceCheckedAt } : null
  const k = s.guess ? 'guess' : 'sure'
  return {
    link: s.link,
    price: s.price,
    currency: s.currency,
    priceState: k,
    priceBase: s.price,
    priceSpot: undefined,
    priceGuessOk: undefined,
    priceSuggest: undefined,
    priceNo: undefined,
    priceCheckedAt: now,
    priceLog: pushLog(undefined, { t: now, p: s.price, k }),
    shops: [...(item.shops ?? []).filter((x) => x.id !== shopId), ...(old ? [old] : [])].slice(0, MAX_SHOPS),
  }
}

