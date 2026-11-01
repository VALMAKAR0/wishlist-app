import { TRASH_DAYS } from './brand'
import type { Item } from './types'

const DAY = 86_400_000

/** Entfernt Einträge, die länger als TRASH_DAYS im Papierkorb liegen. Alles andere bleibt unberührt. */
export function purgeExpired(items: Item[], now = Date.now()): Item[] {
  const limit = now - TRASH_DAYS * DAY
  return items.filter((i) => !i.deletedAt || i.deletedAt > limit)
}
