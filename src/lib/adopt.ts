import { normalize } from './format'
import type { TFn } from './i18n'
import { listTitle } from './lists'
import type { Item, ReceivedCollection, ReceivedItem, Wishlist } from './types'

export type Why = 'name' | 'date'
export type Choice = 'merge' | 'new' | 'skip'
export interface Conflict {
  list: Wishlist
  why: Why
}
export interface Part {
  col: ReceivedCollection
  items: ReceivedItem[]
  choice: Choice
  /** Eigene Liste, mit der die erhaltene kollidiert (bei "merge" das Ziel). */
  target?: Wishlist
  why?: Why
}

const linkKey = (s?: string) => (s ?? '').trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '')
const monthDay = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(5, 10) : '')

/** Eigene Liste mit gleichem Namen (stärker) oder gleichem Datum, das heißt gleichem Anlass (schwächer). */
export function conflictOf(col: { name: string; date?: string }, mine: Wishlist[], t: TFn): Conflict | undefined {
  const names = new Set([normalize(col.name), normalize(t(col.name))])
  const own = mine.filter((l) => l.owner === 'me')
  const byName = own.find((l) => names.has(normalize(listTitle(l, t))))
  if (byName) return { list: byName, why: 'name' }
  const md = monthDay(col.date)
  if (!md) return undefined
  const byDate = own.find((l) => monthDay(l.date) === md)
  return byDate ? { list: byDate, why: 'date' } : undefined
}

/** Wünsche, die es in der Zielliste schon gibt (gleicher Link oder gleicher Name), werden nicht doppelt angelegt. */
export function splitDuplicates(items: ReceivedItem[], existing: Item[]): { fresh: ReceivedItem[]; dup: ReceivedItem[] } {
  const links = new Set(existing.map((i) => linkKey(i.link)).filter(Boolean))
  const names = new Set(existing.map((i) => normalize(i.name)).filter(Boolean))
  const fresh: ReceivedItem[] = []
  const dup: ReceivedItem[] = []
  for (const it of items) {
    const l = linkKey(it.link)
    ;((l && links.has(l)) || names.has(normalize(it.name)) ? dup : fresh).push(it)
  }
  return { fresh, dup }
}

export interface Built {
  newLists: Wishlist[]
  made: Item[]
  duplicates: number
  /** Namen der Listen, in denen etwas gelandet ist. */
  where: string[]
}

/** Baut aus den Entscheidungen die neuen Listen und Wünsche. Es wird nichts gespeichert. */
export function buildAdopt(parts: Part[], from: string, mine: Wishlist[], items: Item[], t: TFn, now: number, id: () => string): Built {
  const newLists: Wishlist[] = []
  const made: Item[] = []
  const where: string[] = []
  let duplicates = 0
  for (const p of parts) {
    if (p.choice === 'skip') continue
    let dest: Wishlist | undefined
    if (p.choice === 'merge' && p.target) dest = p.target
    if (!dest) {
      const clash = p.why === 'name' || (!p.why && !!conflictOf(p.col, [...mine, ...newLists], t))
      const name = clash && p.choice === 'new' ? t('{name} (von {from})', { name: t(p.col.name), from }) : t(p.col.name)
      dest = { id: id(), owner: 'me', name, emoji: p.col.emoji, hue: p.col.hue, date: p.col.date, createdAt: now }
      newLists.push(dest)
    }
    const inList = items.filter((i) => i.owner === 'me' && i.listId === dest!.id && !i.deletedAt)
    const { fresh, dup } = p.choice === 'merge' ? splitDuplicates(p.items, inList) : { fresh: p.items, dup: [] }
    duplicates += dup.length
    if (fresh.length || p.choice === 'new') where.push(listTitle(dest, t))
    for (const it of fresh) {
      made.push({ id: id(), owner: 'me', listId: dest.id, name: it.name, kind: it.kind, link: it.link, price: it.price, currency: it.cur, note: it.note, imageId: it.imageId, emoji: it.emoji, hue: it.hue, bought: false, createdAt: now })
    }
  }
  return { newLists, made, duplicates, where }
}
