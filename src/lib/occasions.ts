import { daysUntil } from './format'
import type { Person } from './types'

export function nextOccasion(p: Person) {
  const list = p.occasions.map((o) => ({ o, days: daysUntil(o) })).sort((a, b) => a.days - b.days)
  return list[0] ?? null
}

/** 0..1: wie nah der Anlass ist (voll = heute, leer = 60+ Tage). */
export const closeness = (days: number) => Math.max(0.06, 1 - Math.min(days, 60) / 60)

type MD = { month: number; day: number }

/** Ostersonntag nach der Gauß'schen Formel (gregorianisch). */
function easter(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

/** Zweiter Sonntag im Mai. */
function mothersDay(year: number): Date {
  const first = new Date(year, 4, 1)
  return new Date(year, 4, 1 + ((7 - first.getDay()) % 7) + 7)
}

/** Nächstes Vorkommen ab heute, bei beweglichen Terminen mit dem Datum des jeweiligen Jahres. */
function upcoming(make: (year: number) => Date): MD {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let d = make(today.getFullYear())
  if (d < today) d = make(today.getFullYear() + 1)
  return { month: d.getMonth() + 1, day: d.getDate() }
}

export interface OccasionPreset {
  label: string
  emoji: string
  /** Vorgeschlagenes Datum. Fehlt es, bleibt das Feld leer. */
  date?: () => MD
}

/** Anlässe zum schnellen Hinzufügen. Das Datum ist nur ein Vorschlag und bleibt änderbar. */
export const OCCASION_PRESETS: OccasionPreset[] = [
  { label: 'Geburtstag', emoji: '🎂' },
  { label: 'Weihnachten', emoji: '🎄', date: () => ({ month: 12, day: 24 }) },
  { label: 'Nikolaus', emoji: '🎅', date: () => ({ month: 12, day: 6 }) },
  { label: 'Valentinstag', emoji: '💝', date: () => ({ month: 2, day: 14 }) },
  { label: 'Ostern', emoji: '🐣', date: () => upcoming(easter) },
  { label: 'Muttertag', emoji: '💐', date: () => upcoming(mothersDay) },
  { label: 'Hochzeitstag', emoji: '💍' },
  { label: 'Jahrestag', emoji: '🥂' },
]

export const presetOf = (label: string) => OCCASION_PRESETS.find((p) => p.label === label)
export const occasionEmoji = (label: string) => presetOf(label)?.emoji ?? '🗓️'
