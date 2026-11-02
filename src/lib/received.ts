import { normalize } from './format'
import type { Item, ReceivedItem, ReceivedList } from './types'

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
