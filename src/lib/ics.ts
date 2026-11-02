import type { TFn } from './i18n'
import { occasionEmoji, presetOf } from './occasions'
import { leadsOf, occurrences } from './reminders'
import type { Item, Person } from './types'

const enc = new TextEncoder()
const pad = (n: number) => String(n).padStart(2, '0')
const day = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
const stamp = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Zeilen länger als 75 Byte werden umbrochen (Fortsetzung beginnt mit Leerzeichen). */
export function fold(line: string): string {
  if (enc.encode(line).length <= 75) return line
  const parts: string[] = []
  let cur = ''
  let size = 0
  let limit = 75
  for (const ch of line) {
    const n = enc.encode(ch).length
    if (size + n > limit) {
      parts.push(cur)
      cur = ''
      size = 1
      limit = 75
    }
    cur += ch
    size += n
  }
  parts.push(cur)
  return parts.join('\r\n ')
}

/** Alarm relativ zum Beginn des Ganztagstermins: Vorlauf in Tagen, Uhrzeit "HH:MM". */
export function trigger(lead: number, time: string): string {
  const [hh, mm] = time.split(':').map(Number)
  const minutes = lead * 1440 - (hh * 60 + mm)
  return minutes > 0 ? `-PT${minutes}M` : `PT${Math.abs(minutes)}M`
}

export interface IcsResult {
  text: string
  count: number
}

/** Kalenderdatei mit allen Anlässen: jährlich wiederkehrend, je Vorlauf ein Alarm. Anlässe ohne Vorlauf fehlen. */
export function buildIcs(persons: Person[], items: Item[], fallback: number[], time: string, t: TFn, now = new Date()): IcsResult {
  const out: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wunschliste//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(t('Wunschliste'))}`]
  let count = 0
  for (const p of persons) {
    const open = items.filter((i) => i.owner === p.id && !i.deletedAt && !i.bought).length
    for (const o of p.occasions) {
      const leads = leadsOf(o, fallback)
      if (!leads.length) continue
      const next = occurrences(o, now, 1)[0]
      if (!next) continue
      const first = o.month === 2 && o.day === 29 ? new Date(next.getFullYear(), 2, 1) : next
      const label = presetOf(o.label) ? t(o.label) : o.label
      const summary = `${occasionEmoji(o.label)} ${t('{occasion} von {name}', { occasion: label, name: p.name })}`
      const body = open > 0 ? t('Offen: {ideas}', { ideas: t.n(open, 'Idee', 'Ideen') }) : t('Noch keine Idee gemerkt.')
      const end = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 1)
      out.push('BEGIN:VEVENT', `UID:${o.id}@wunschliste.app`, `DTSTAMP:${stamp(now)}`, `DTSTART;VALUE=DATE:${day(first)}`, `DTEND;VALUE=DATE:${day(end)}`, 'RRULE:FREQ=YEARLY', `SUMMARY:${esc(summary)}`, `DESCRIPTION:${esc(body)}`, 'TRANSP:TRANSPARENT')
      for (const lead of leads) out.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(summary)}`, `TRIGGER:${trigger(lead, time)}`, 'END:VALARM')
      out.push('END:VEVENT')
      count++
    }
  }
  out.push('END:VCALENDAR')
  return { text: out.map(fold).join('\r\n') + '\r\n', count }
}

export const icsName = (person?: Person) => `wunschliste-${person ? person.name.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-').replace(/^-|-$/g, '') || 'person' : 'kalender'}.ics`
