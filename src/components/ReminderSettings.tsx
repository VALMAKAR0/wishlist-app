import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BellRing, CalendarClock } from 'lucide-react'
import { isNative } from '../lib/backupFiles'
import { LEAD_CHOICES, TIME_CHOICES, notifyState, pendingCount, sendTest, type NotifyState } from '../lib/reminders'
import { useT, useUI } from '../state/ui'
import { Switch } from './Primitives'

export const leadLabel = (n: number, t: ReturnType<typeof useT>) => (n === 0 ? t('Am Tag selbst') : t.n(n, 'Tag davor', 'Tage davor'))

export function LeadChips({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const t = useT()
  return (
    <div className="listbar listbar--form" role="group" aria-label={t('Vorlauf')}>
      {LEAD_CHOICES.map((n) => {
        const on = value.includes(n)
        return (
          <button key={n} className="listchip" aria-pressed={on} data-active={on} onClick={() => onChange(on ? value.filter((x) => x !== n) : [...value, n].sort((a, b) => b - a))}>
            {leadLabel(n, t)}
          </button>
        )
      })}
    </div>
  )
}

/** Erinnerungen vor Anlässen: Schalter, Standard-Vorlauf, Uhrzeit, Test. Wirkt nur in der Android-App. */
export function ReminderSettings() {
  const t = useT()
  const ui = useUI()
  const { settings, setSettings } = ui
  const native = isNative()
  const [perm, setPerm] = useState<NotifyState>('prompt')
  const [count, setCount] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    if (!native) return
    setPerm(await notifyState())
    setCount(await pendingCount())
  }, [native])

  useEffect(() => {
    void refresh()
    const id = window.setTimeout(() => void refresh(), 2500)
    return () => window.clearTimeout(id)
  }, [refresh, settings.remindOn, settings.remindDays, settings.remindTime])

  const toggle = async (on: boolean) => {
    if (!on) return setSettings({ remindOn: false })
    const s = await notifyState(true)
    setPerm(s)
    if (s !== 'granted') return ui.toast({ message: t('Benachrichtigungen sind für die App blockiert. Erlaube sie in den Android-Einstellungen.'), emoji: '🔕' })
    setSettings({ remindOn: true })
  }

  const test = async () => {
    try {
      const s = await notifyState(true)
      setPerm(s)
      if (s !== 'granted') return ui.toast({ message: t('Benachrichtigungen sind für die App blockiert. Erlaube sie in den Android-Einstellungen.'), emoji: '🔕' })
      await sendTest(t('🎁 Test-Erinnerung'), t('So sehen deine Erinnerungen aus.'))
      ui.toast({ message: t('Testbenachrichtigung kommt in 10 Sekunden. Sperre den Bildschirm, um sie dort zu sehen.'), emoji: '⏱️' })
    } catch {
      ui.toast({ message: t('Test hat nicht geklappt.'), emoji: '⚠️' })
    }
  }

  return (
    <>
      <div className="setting">
        <div>
          <strong>{t('Vor Anlässen erinnern')}</strong>
          <p>{native ? t('Benachrichtigung vor jedem Anlass. Vorlauf pro Anlass änderbar. In den Benachrichtigungen steht nie, was auf deinen Listen steht.') : t('Nur in der Android-App. Auf dem iPhone kommt die Kalenderdatei mit V0.8.')}</p>
        </div>
        <Switch checked={native && settings.remindOn} onChange={(v) => void toggle(v)} label={t('Erinnerungen')} />
      </div>
      <AnimatePresence initial={false}>
        {native && settings.remindOn && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div className="field field--pad">
              <span>{t('Standard-Vorlauf')}</span>
              <LeadChips value={settings.remindDays} onChange={(remindDays) => setSettings({ remindDays })} />
              {settings.remindDays.length === 0 && <small className="hint hint--bad">{t('Ohne Vorlauf gibt es keine Erinnerung, außer ein Anlass hat einen eigenen.')}</small>}
            </div>
            <div className="field field--pad">
              <span>{t('Uhrzeit')}</span>
              <div className="listbar listbar--form" role="radiogroup" aria-label={t('Uhrzeit')}>
                {TIME_CHOICES.map((x) => (
                  <button key={x} className="listchip" role="radio" aria-checked={settings.remindTime === x} data-active={settings.remindTime === x} onClick={() => setSettings({ remindTime: x })}>
                    {x}
                  </button>
                ))}
              </div>
            </div>
            <div className="setting">
              <div>
                <strong>{count === null ? t('Geplant …') : t.n(count, 'Erinnerung geplant', 'Erinnerungen geplant')}</strong>
                <p>{perm === 'granted' ? t('Je Anlass die nächsten zwei Termine, die App plant bei jeder Änderung neu.') : t('Benachrichtigungen sind blockiert. Erlaube sie in den Android-Einstellungen.')}</p>
              </div>
              <button className="btn btn--ghost btn--small" onClick={() => void test()}>
                <BellRing size={15} /> {t('Test')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="hint hint--row">
        <CalendarClock size={14} /> {t('Anlässe mit eigenem Vorlauf stehen im Anlass selbst.')}
      </div>
    </>
  )
}
