import { LocalNotifications } from '@capacitor/local-notifications'
import type { TFn } from './i18n'
import { occasionEmoji, presetOf } from './occasions'
import type { Item, Occasion, Person } from './types'

export const LEAD_CHOICES = [0, 1, 2, 3, 7, 14, 21, 30]
export const TIME_CHOICES = ['08:00', '09:00', '12:00', '18:00', '20:00']
const OCCURRENCES = 2

export interface PlannedReminder {
  id: number
  at: Date
  title: string
  body: string
}

export const leadsOf = (o: Occasion, fallback: number[]): number[] => [...new Set(o.remind ?? fallback)].sort((a, b) => b - a)

const hash = (s: string): number => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % 2_000_000_000 + 10
}

const iso = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`

/** Die nächsten Vorkommen eines Anlasses ab heute (heute zählt mit). */
export function occurrences(o: Pick<Occasion, 'month' | 'day'>, now: Date, count = OCCURRENCES): Date[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const out: Date[] = []
  for (let y = today.getFullYear(); out.length < count && y < today.getFullYear() + 4; y++) {
    const d = new Date(y, o.month - 1, o.day)
    if (d >= today) out.push(d)
  }
  return out
}

function when(lead: number, t: TFn): string {
  return lead === 0 ? t('heute') : lead === 1 ? t('morgen') : t('in {n} Tagen', { n: lead })
}

/** Alle Erinnerungen, die noch in der Zukunft liegen. Der Text nennt nie, was auf den Listen steht. */
export function planReminders(persons: Person[], items: Item[], fallback: number[], time: string, t: TFn, now = new Date()): PlannedReminder[] {
  const [hh, mm] = time.split(':').map(Number)
  const out: PlannedReminder[] = []
  for (const p of persons) {
    const open = items.filter((i) => i.owner === p.id && !i.deletedAt && !i.bought).length
    for (const o of p.occasions) {
      const label = presetOf(o.label) ? t(o.label) : o.label
      for (const day of occurrences(o, now)) {
        for (const lead of leadsOf(o, fallback)) {
          const at = new Date(day.getFullYear(), day.getMonth(), day.getDate() - lead, hh, mm, 0)
          if (at.getTime() <= now.getTime() + 30_000) continue
          out.push({
            id: hash(`${o.id}|${iso(day)}|${lead}`),
            at,
            title: `${occasionEmoji(o.label)} ${t('{occasion} von {name} ist {when}', { occasion: label, name: p.name, when: when(lead, t) })}`,
            body: open > 0 ? t('Offen: {ideas}', { ideas: t.n(open, 'Idee', 'Ideen') }) : t('Noch keine Idee gemerkt.'),
          })
        }
      }
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime())
}

export type NotifyState = 'granted' | 'denied' | 'prompt'

export async function notifyState(ask = false): Promise<NotifyState> {
  try {
    const r = ask ? await LocalNotifications.requestPermissions() : await LocalNotifications.checkPermissions()
    return r.display === 'granted' ? 'granted' : r.display === 'denied' ? 'denied' : 'prompt'
  } catch {
    return 'denied'
  }
}

export async function pendingCount(): Promise<number> {
  try {
    return (await LocalNotifications.getPending()).notifications.length
  } catch {
    return 0
  }
}

/** Ersetzt alle geplanten Erinnerungen durch die übergebenen. Eine leere Liste löscht alles. */
export async function applyReminders(plan: PlannedReminder[]): Promise<void> {
  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) })
  if (!plan.length) return
  await LocalNotifications.schedule({
    notifications: plan.map((p) => ({ id: p.id, title: p.title, body: p.body, schedule: { at: p.at, allowWhileIdle: true }, smallIcon: 'ic_stat_wunsch' })),
  })
}

/** Sofort-Test: kommt in 10 Sekunden, ohne die geplanten Erinnerungen anzufassen. */
export async function sendTest(title: string, body: string): Promise<void> {
  await LocalNotifications.schedule({
    notifications: [{ id: 7, title, body, schedule: { at: new Date(Date.now() + 10_000), allowWhileIdle: true }, smallIcon: 'ic_stat_wunsch' }],
  })
}
