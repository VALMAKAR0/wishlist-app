import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Delete, Lock } from 'lucide-react'
import { checkPin, lockoutSeconds } from '../lib/lock'
import { clearSafetyCopies } from '../lib/backup'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'

export const LOCK_EVENT = 'wl-lock'

/** PIN-Sperre: sperrt beim Start und nach einer Zeit im Hintergrund. Schützt vor neugierigen Blicken, verschlüsselt aber nichts. */
export function AppLock() {
  const t = useT()
  const ui = useUI()
  const { dispatch } = useStore()
  const { lockHash, lockSalt, lockAfter } = ui.settings
  const on = !!lockHash
  const [locked, setLocked] = useState(on)
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(0)
  const [fails, setFails] = useState(0)
  const [wait, setWait] = useState(0)
  const [busy, setBusy] = useState(false)
  const hiddenAt = useRef<number | null>(null)
  const cfg = useRef({ on, lockAfter })
  cfg.current = { on, lockAfter }

  useEffect(() => {
    if (!on) setLocked(false)
  }, [on])

  const lockNow = useCallback(() => {
    if (!cfg.current.on) return
    setPin('')
    setLocked(true)
  }, [])

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        hiddenAt.current = Date.now()
        return
      }
      const at = hiddenAt.current
      hiddenAt.current = null
      if (at !== null && cfg.current.on && Date.now() - at >= cfg.current.lockAfter * 1000) lockNow()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener(LOCK_EVENT, lockNow)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener(LOCK_EVENT, lockNow)
    }
  }, [lockNow])

  useEffect(() => {
    const app = document.querySelector<HTMLElement>('.app')
    if (app) app.inert = locked
    return () => {
      if (app) app.inert = false
    }
  }, [locked])

  useEffect(() => {
    if (wait <= 0) return
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(id)
  }, [wait])

  const submit = useCallback(
    async (value: string) => {
      if (busy || wait > 0 || value.length < 4) return
      setBusy(true)
      const ok = await checkPin(value, lockSalt, lockHash).catch(() => false)
      setBusy(false)
      if (ok) {
        setLocked(false)
        setPin('')
        setFails(0)
        return
      }
      const n = fails + 1
      setFails(n)
      setPin('')
      setShake((s) => s + 1)
      ui.haptic(40)
      setWait(lockoutSeconds(n))
    },
    [busy, wait, fails, lockSalt, lockHash, ui],
  )

  const press = (d: string) => {
    if (busy || wait > 0) return
    setPin((p) => (p.length >= 8 ? p : p + d))
  }

  useEffect(() => {
    if (!locked) return
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') setPin((p) => p.slice(0, -1))
      else if (e.key === 'Enter') void submit(pin)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const forgot = () =>
    ui.confirm({
      title: t('PIN vergessen?'),
      text: t('Die PIN lässt sich nicht zurücksetzen. Du kannst nur alle Daten auf diesem Gerät löschen und danach aus einem Backup wiederherstellen.'),
      confirmLabel: t('Alles löschen'),
      tone: 'danger',
      hold: true,
      onConfirm: () => {
        void clearSafetyCopies().catch(() => undefined)
        dispatch({ type: 'wipe' })
        ui.setSettings({ lockHash: '', lockSalt: '' })
        setLocked(false)
      },
    })

  if (!locked) return null
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
  return (
    <div className="lock" role="dialog" aria-modal="true" aria-label={t('App gesperrt')}>
      <div className="lock__box">
        <span className="lock__icon">
          <Lock size={26} />
        </span>
        <h2>{t('App gesperrt')}</h2>
        <p>{wait > 0 ? t('Zu viele Versuche. Warte {n} Sekunden.', { n: wait }) : t('Gib deine PIN ein.')}</p>
        <motion.div key={shake} className="lock__dots" animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : undefined} transition={{ duration: 0.4 }} aria-label={t('{n} Ziffern eingegeben', { n: pin.length })}>
          {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
            <i key={i} data-on={i < pin.length} />
          ))}
        </motion.div>
        <div className="lock__pad">
          {keys.map((k) => (
            <button key={k} onClick={() => press(k)} disabled={wait > 0}>
              {k}
            </button>
          ))}
          <button onClick={() => setPin((p) => p.slice(0, -1))} aria-label={t('Löschen')} disabled={wait > 0}>
            <Delete size={20} />
          </button>
          <button onClick={() => press('0')} disabled={wait > 0}>
            0
          </button>
          <button className="lock__ok" onClick={() => void submit(pin)} disabled={pin.length < 4 || wait > 0 || busy} aria-label={t('Entsperren')}>
            OK
          </button>
        </div>
        <button className="lock__forgot" onClick={forgot}>
          {t('PIN vergessen?')}
        </button>
      </div>
    </div>
  )
}
