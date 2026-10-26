import { daysUntil } from './format'
import type { Person } from './types'

export function nextOccasion(p: Person) {
  const list = p.occasions.map((o) => ({ o, days: daysUntil(o) })).sort((a, b) => a.days - b.days)
  return list[0] ?? null
}

/** 0..1: wie nah der Anlass ist (voll = heute, leer = 60+ Tage). */
export const closeness = (days: number) => Math.max(0.06, 1 - Math.min(days, 60) / 60)
