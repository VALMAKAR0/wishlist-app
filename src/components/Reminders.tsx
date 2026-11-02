import { useEffect, useRef } from 'react'
import { isNative } from '../lib/backupFiles'
import { applyReminders, notifyState, planReminders } from '../lib/reminders'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'

/** Hält die geplanten Erinnerungen aktuell: beim Start und nach jeder Änderung an Anlässen, Ideen oder Einstellungen. */
export function Reminders() {
  const t = useT()
  const { settings } = useUI()
  const { persons, items, storage } = useStore()
  const tr = useRef(t)
  tr.current = t
  const wasOn = useRef(false)

  const key = JSON.stringify([
    settings.remindOn,
    settings.remindDays,
    settings.remindTime,
    settings.lang,
    persons.map((p) => [p.id, p.name, p.occasions.map((o) => [o.id, o.label, o.month, o.day, o.remind])]),
    persons.map((p) => items.filter((i) => i.owner === p.id && !i.deletedAt && !i.bought).length),
  ])

  useEffect(() => {
    if (!isNative() || storage !== 'ok') return
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          if (!settings.remindOn) {
            if (wasOn.current) await applyReminders([])
            wasOn.current = false
            return
          }
          if ((await notifyState()) !== 'granted') return
          await applyReminders(planReminders(persons, items, settings.remindDays, settings.remindTime, tr.current))
          wasOn.current = true
        } catch {
          /* beim nächsten Start wird erneut geplant */
        }
      })()
    }, 1500)
    return () => window.clearTimeout(id)
  }, [key, storage])

  return null
}
