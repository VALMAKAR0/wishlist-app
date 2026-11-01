import { toInputDate } from './format'
import type { TFn } from './i18n'
import type { Occasion, Person, Wishlist } from './types'

/** Anzeigename einer Liste: Die Standardliste heißt je nach Sprache "Allgemein" bzw. "General". */
export const listTitle = (l: Pick<Wishlist, 'name' | 'isDefault'>, t: TFn) => (l.isDefault || !l.name ? t('Allgemein') : t(l.name))

/** Der Anlass, mit dem eine Liste verknüpft ist (nur wenn es ihn bei der Person noch gibt). */
export function listOccasion(l: Pick<Wishlist, 'owner' | 'occasionId'>, persons: Person[]): Occasion | undefined {
  if (!l.occasionId) return undefined
  return persons.find((p) => p.id === l.owner)?.occasions.find((o) => o.id === l.occasionId)
}

/** Datum einer Liste (JJJJ-MM-TT): bei verknüpftem Anlass dessen nächstes Vorkommen, sonst das eigene Datum. */
export function listDate(l: Pick<Wishlist, 'owner' | 'occasionId' | 'date'>, persons: Person[]): string | undefined {
  const o = listOccasion(l, persons)
  return o ? toInputDate(o) : l.date
}
