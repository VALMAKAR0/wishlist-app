import { daysUntil, normalize, priceOf } from './format'
import type { Item, Person, ReceivedList, Wishlist } from './types'

export interface ListStats {
  count: number
  open: number
  bought: number
  /** Summe aller Preise (offen + gekauft). */
  total: number
  openValue: number
  boughtValue: number
  /** Durchschnittspreis über alle Einträge mit Preis. */
  avg: number
  priciest?: Item
}

const sum = (items: Item[]) => items.reduce((s, i) => s + priceOf(i), 0)

export function listStats(items: Item[]): ListStats {
  const open = items.filter((i) => !i.bought)
  const bought = items.filter((i) => i.bought)
  const priced = items.filter((i) => i.price !== undefined)
  const priciest = priced.reduce<Item | undefined>((m, i) => (!m || priceOf(i) > priceOf(m) ? i : m), undefined)
  return {
    count: items.length,
    open: open.length,
    bought: bought.length,
    total: sum(items),
    openValue: sum(open),
    boughtValue: sum(bought),
    avg: priced.length ? sum(priced) / priced.length : 0,
    priciest,
  }
}

export interface MonthBucket {
  /** Zeitstempel des Monatsanfangs. */
  ts: number
  self: number
  gifts: number
}

export interface PersonStat {
  person: Person
  spent: number
  planned: number
  gifts: number
  ideas: number
}

export interface ListRow {
  list: Wishlist
  ownerName: string
  stats: ListStats
}

export interface Overview {
  wishes: ListStats
  gifts: ListStats
  spentSelf: number
  spentGifts: number
  spentTotal: number
  boughtCount: number
  months: MonthBucket[]
  persons: PersonStat[]
  lists: ListRow[]
  kinds: { kind: string; count: number }[]
  priciest?: Item
  cheapest?: Item
  avgPrice: number
  doneRate: number
  budgetTotal: number
  upcoming: number
  trash: number
  receivedPackages: number
  receivedItems: number
  duplicates: number
  listCount: number
}

export function overview(
  items: Item[],
  lists: Wishlist[],
  persons: Person[],
  received: ReceivedList[],
  alreadyOwned: (i: Item) => boolean,
  listName: (l: Wishlist) => string,
): Overview {
  const live = items.filter((i) => !i.deletedAt)
  const mine = live.filter((i) => i.owner === 'me')
  const others = live.filter((i) => i.owner !== 'me')
  const boughtMine = mine.filter((i) => i.bought)
  const boughtOthers = others.filter((i) => i.bought)

  // Letzte sechs Monate inklusive dem laufenden.
  const now = new Date()
  const months: MonthBucket[] = Array.from({ length: 6 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1)
    return { ts: d.getTime(), self: 0, gifts: 0 }
  })
  for (const i of [...boughtMine, ...boughtOthers]) {
    if (!i.boughtAt) continue
    const d = new Date(i.boughtAt)
    const idx = months.findIndex((m) => {
      const md = new Date(m.ts)
      return md.getFullYear() === d.getFullYear() && md.getMonth() === d.getMonth()
    })
    if (idx >= 0) months[idx][i.owner === 'me' ? 'self' : 'gifts'] += priceOf(i)
  }

  const priced = live.filter((i) => i.price !== undefined)
  const priciest = priced.reduce<Item | undefined>((m, i) => (!m || priceOf(i) > priceOf(m) ? i : m), undefined)
  const cheapest = priced.reduce<Item | undefined>((m, i) => (!m || priceOf(i) < priceOf(m) ? i : m), undefined)

  const kindCount = new Map<string, { kind: string; count: number }>()
  for (const i of live) {
    if (!i.kind) continue
    const key = normalize(i.kind)
    const cur = kindCount.get(key) ?? { kind: i.kind, count: 0 }
    cur.count += 1
    kindCount.set(key, cur)
  }

  const spentSelf = sum(boughtMine)
  const spentGifts = sum(boughtOthers)

  return {
    wishes: listStats(mine),
    gifts: listStats(others),
    spentSelf,
    spentGifts,
    spentTotal: spentSelf + spentGifts,
    boughtCount: boughtMine.length + boughtOthers.length,
    months,
    persons: persons
      .map((p) => {
        const its = others.filter((i) => i.owner === p.id)
        return { person: p, spent: sum(its.filter((i) => i.bought)), planned: sum(its.filter((i) => !i.bought)), gifts: its.filter((i) => i.bought).length, ideas: its.filter((i) => !i.bought).length }
      })
      .sort((a, b) => b.spent - a.spent),
    lists: lists.map((l) => ({
      list: l,
      ownerName: l.owner === 'me' ? '' : persons.find((p) => p.id === l.owner)?.name ?? '',
      stats: listStats(live.filter((i) => i.listId === l.id)),
    })).map((r) => ({ ...r, list: { ...r.list, name: listName(r.list) } })),
    kinds: [...kindCount.values()].sort((a, b) => b.count - a.count).slice(0, 5),
    priciest,
    cheapest,
    avgPrice: priced.length ? sum(priced) / priced.length : 0,
    doneRate: live.length ? (boughtMine.length + boughtOthers.length) / live.length : 0,
    budgetTotal: persons.reduce((s, p) => s + p.budget, 0),
    upcoming: persons.reduce((n, p) => n + p.occasions.filter((o) => daysUntil(o) <= 30).length, 0),
    trash: items.filter((i) => i.deletedAt).length,
    receivedPackages: received.length,
    receivedItems: received.reduce((n, r) => n + r.lists.reduce((m, l) => m + l.items.filter((x) => !x.owned).length, 0), 0),
    duplicates: others.filter(alreadyOwned).length,
    listCount: lists.length,
  }
}
