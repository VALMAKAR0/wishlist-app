import { en } from './en'
import type { Lang } from './types'

// Deutsch ist die Ausgangssprache: Der deutsche Text selbst ist der Schlüssel.
// Fehlt eine englische Übersetzung, bleibt der deutsche Text stehen (nie ein leerer Fleck).

export type Params = Record<string, string | number>

export interface TFn {
  (key: string, params?: Params): string
  /** Zahl mit Einzahl/Mehrzahl: t.n(3, 'Idee', 'Ideen') -> "3 Ideen" */
  n: (count: number, one: string, many: string) => string
  lang: Lang
  locale: string
}

export const LOCALES: Record<Lang, string> = { de: 'de-DE', en: 'en-GB' }

/** Erster Buchstabe groß (Einzahl/Mehrzahl-Wörter stehen in der Übersetzung klein). */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function detectLang(): Lang {
  try {
    return navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'en'
  } catch {
    return 'de'
  }
}

function fill(text: string, params?: Params) {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`))
}

export function makeT(lang: Lang): TFn {
  const lookup = (key: string) => (lang === 'en' ? en[key] ?? key : key)
  const t = ((key: string, params?: Params) => fill(lookup(key), params)) as TFn
  t.n = (count, one, many) => `${count} ${lookup(count === 1 ? one : many)}`
  t.lang = lang
  t.locale = LOCALES[lang]
  return t
}
