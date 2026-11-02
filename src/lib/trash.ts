import { TRASH_DAYS } from './brand'
import type { Item } from './types'

const DAY = 86_400_000

/** Entfernt Einträge, die länger als die Frist im Papierkorb liegen. Alles andere bleibt unberührt. */
export function purgeExpired(items: Item[], now = Date.now(), days = TRASH_DAYS): Item[] {
  const limit = now - days * DAY
  return items.filter((i) => !i.deletedAt || i.deletedAt > limit)
}
