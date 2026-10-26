import type { TFn } from './i18n'
import type { Wishlist } from './types'

/** Anzeigename einer Liste: Die Standardliste heißt je nach Sprache "Allgemein" bzw. "General". */
export const listTitle = (l: Pick<Wishlist, 'name' | 'isDefault'>, t: TFn) => (l.isDefault || !l.name ? t('Allgemein') : t(l.name))
