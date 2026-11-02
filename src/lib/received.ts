import { normalize } from './format'
import type { TFn } from './i18n'
import { listTitle } from './lists'
import type { Item, Occasion, Person, ReceivedItem, ReceivedList, Wishlist } from './types'

const linkKey = (s?: string) => (s ?? '').trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '')

/** Findet die Idee, die zu einem erhaltenen Wunsch gehört: gleicher Link oder gleicher Name. */
export function findTaken(it: ReceivedItem, ideas: Item[]): Item | undefined {
  const l = linkKey(it.link)
  const n = normalize(it.name)
  return ideas.find((i) => (l && linkKey(i.link) === l) || (n && normalize(i.name) === n))
}

export function receivedCounts(r: ReceivedList) {
  let wishes = 0
  let owned = 0
  for (const l of r.lists) for (const i of l.items) i.owned ? owned++ : wishes++
  return { wishes, owned }
}

/** Passende Liste bei der Person: gleicher Name oder eine Liste, die mit dem gleichnamigen Anlass verknüpft ist. */
export function targetList(col: { name: string }, person: Person, lists: Wishlist[], t: TFn): { list?: Wishlist; occasion?: Occasion } {
  const names = new Set([normalize(col.name), normalize(t(col.name))])
  const mine = lists.filter((l) => l.owner === person.id)
  const byName = mine.find((l) => names.has(normalize(listTitle(l, t))))
  if (byName) return { list: byName }
  const occasion = person.occasions.find((o) => names.has(normalize(o.label)) || names.has(normalize(t(o.label))))
  if (!occasion) return {}
  return { list: mine.find((l) => l.occasionId === occasion.id), occasion }
}
