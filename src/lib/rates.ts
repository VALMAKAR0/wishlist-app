import { CURRENCIES } from './format'
import { httpGet } from './http'
import type { Item, ReceivedList } from './types'

const BASE = 'https://api.frankfurter.dev/v1/latest'

export const ratesUrl = (codes = CURRENCIES.filter((c) => c !== 'EUR')) => `${BASE}?base=EUR&symbols=${codes.join(',')}`

/** Liest die Antwort der Kurs-Schnittstelle. Nur bekannte Währungen mit sinnvollen Zahlen, sonst null. */
export function parseRates(json: unknown): Record<string, number> | null {
  if (typeof json !== 'object' || json === null) return null
  const r = (json as { rates?: unknown }).rates
  if (typeof r !== 'object' || r === null) return null
  const out: Record<string, number> = {}
  for (const c of CURRENCIES) {
    const v = (r as Record<string, unknown>)[c]
    if (c !== 'EUR' && typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 1e7) out[c] = v
  }
  return Object.keys(out).length ? out : null
}

/** Holt die Tageskurse der Europäischen Zentralbank (je 1 Euro). Wirft bei Fehlern. */
export async function fetchRates(): Promise<Record<string, number>> {
  const res = await httpGet(ratesUrl(), { Accept: 'application/json' })
  if (!res.ok) throw new Error(String(res.status))
  const parsed = parseRates(await res.json())
  if (!parsed) throw new Error('format')
  return parsed
}

/** Währungen, die in Einträgen und erhaltenen Listen vorkommen, dazu Euro und die Hauptwährung. */
export function usedCurrencies(main: string, items: Pick<Item, 'currency'>[], received: Pick<ReceivedList, 'lists'>[]): Set<string> {
  const used = new Set<string>(['EUR', main])
  for (const i of items) if (i.currency) used.add(i.currency)
  for (const r of received) for (const l of r.lists) for (const x of l.items) if (x.cur) used.add(x.cur)
  return used
}

/** Kurse werden nur gebraucht, wenn mindestens eine Währung von der Hauptwährung abweicht. */
export const needsRates = (main: string, items: Pick<Item, 'currency'>[], received: Pick<ReceivedList, 'lists'>[]): boolean => [...usedCurrencies(main, items, received)].some((c) => c !== main)
