import { BackgroundRunner } from '@capacitor/background-runner'
import type { Result, Snap } from '../runner/core'
import { isNative } from './backupFiles'
import { applyCheck, checkable } from './priceCheck'
import type { Item } from './types'

export const BG_LABEL = 'app.wunschliste.preise'
export const BG_HOUR = 8

const call = async <T,>(event: string, details?: Record<string, unknown>): Promise<T | null> => {
  if (!isNative()) return null
  try {
    return (await BackgroundRunner.dispatchEvent({ label: BG_LABEL, event, details: details ?? {} })) as T
  } catch {
    return null
  }
}

export const snapOf = (i: Item): Snap => ({ id: i.id, name: i.name, link: i.link ?? '', price: i.price, currency: i.currency, priceState: i.priceState, priceGuessOk: i.priceGuessOk, priceSpot: i.priceSpot, priceNo: i.priceNo })

export const snapsOf = (items: Item[]): Snap[] => items.filter(checkable).map(snapOf)

/** Gibt dem Hintergrund-Läufer Schalter und Einträge. */
export const bgSync = (on: boolean, items: Item[]) => call<unknown>('sync', { on, hour: BG_HOUR, items: on ? snapsOf(items) : [] })

export const bgCollect = () => call<{ results: Result[] }>('collect')

export const bgCheckNow = () => call<{ ran: boolean; checked: number; failed: number; drops: number }>('check', { force: true })

export const bgStatus = () => call<{ on: boolean; count: number; last: string; pending: number; runs: number }>('status')

export interface Applied {
  total: number
  down: number
  up: number
  suggest: number
}

/** Übernimmt Ergebnisse des Hintergrund-Laufs in die Einträge, in der Reihenfolge ihrer Entstehung. */
export function applyResults(items: Item[], results: Result[], update: (id: string, patch: Partial<Item>) => void): Applied {
  const cur = new Map(items.map((i) => [i.id, i]))
  const sum: Applied = { total: 0, down: 0, up: 0, suggest: 0 }
  for (const r of [...results].sort((a, b) => a.at - b.at)) {
    const it = cur.get(r.id)
    if (!it || it.deletedAt) continue
    const { patch, outcome } = applyCheck(it, r.found, r.at)
    update(r.id, patch)
    cur.set(r.id, { ...it, ...patch })
    sum.total += 1
    if (outcome.kind === 'changed') (outcome.to < outcome.from ? (sum.down += 1) : (sum.up += 1))
    else if (outcome.kind === 'suggest') sum.suggest += 1
  }
  return sum
}
