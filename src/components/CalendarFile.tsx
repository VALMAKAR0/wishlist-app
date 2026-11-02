import { useCallback } from 'react'
import { exportFile } from '../lib/backupFiles'
import { buildIcs, icsName } from '../lib/ics'
import type { Person } from '../lib/types'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'

/** Erzeugt die Kalenderdatei (.ics) für alle Personen oder eine einzelne und gibt sie über Teilen oder Download aus. */
export function useCalendarFile() {
  const t = useT()
  const ui = useUI()
  const { persons, items } = useStore()
  const { remindDays, remindTime } = ui.settings

  return useCallback(
    async (person?: Person) => {
      const { text, count } = buildIcs(person ? [person] : persons, items, remindDays, remindTime, t)
      if (!count) return ui.toast({ message: t('Kein Anlass mit Erinnerung vorhanden. Lege einen Anlass an oder wähle einen Vorlauf.'), emoji: '📅' })
      try {
        const r = await exportFile(new TextEncoder().encode(text), icsName(person), 'text/calendar')
        if (r.where === 'download') ui.toast({ message: t('Kalenderdatei gespeichert. Öffne sie, um die Anlässe einzutragen.'), emoji: '📅' })
        else if (r.where === 'shared') ui.toast({ message: t('Wähle „Kalender“, um {n} einzutragen.', { n: t.n(count, 'Anlass', 'Anlässe') }), emoji: '📅' })
      } catch {
        ui.toast({ message: t('Die Kalenderdatei konnte nicht erstellt werden.'), emoji: '⚠️' })
      }
    },
    [persons, items, remindDays, remindTime, t, ui],
  )
}
