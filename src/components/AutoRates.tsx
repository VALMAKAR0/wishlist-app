import { App as CapApp } from '@capacitor/app'
import { useEffect, useRef } from 'react'
import { isNative } from '../lib/backupFiles'
import { fetchRates, needsRates } from '../lib/rates'
import { useStore } from '../state/store'
import { useUI } from '../state/ui'

const STALE = 20 * 3_600_000
const RETRY = 3_600_000

/** Holt die Wechselkurse einmal am Tag still im Hintergrund, solange sie gebraucht werden. */
export function AutoRates() {
  const ui = useUI()
  const { items, received, storage } = useStore()
  const live = useRef({ ui, items, received })
  live.current = { ui, items, received }

  useEffect(() => {
    if (storage !== 'ok') return
    let alive = true
    let busy = false
    let tried = 0
    const run = async () => {
      const { ui: u, items: it, received: rc } = live.current
      const s = u.settings
      const now = Date.now()
      if (busy || !s.ratesAuto || now - s.ratesAt < STALE || now - tried < RETRY || !needsRates(s.currency, it, rc)) return
      busy = true
      tried = now
      try {
        const rates = await fetchRates()
        if (alive) live.current.ui.setSettings({ rates, ratesAt: Date.now() })
      } catch {
        // stiller Fehlschlag, nächster Versuch in einer Stunde
      } finally {
        busy = false
      }
    }
    const first = window.setTimeout(() => void run(), 2500)
    const timer = window.setInterval(() => void run(), 30 * 60_000)
    const vis = () => document.visibilityState === 'visible' && void run()
    document.addEventListener('visibilitychange', vis)
    const sub = isNative() ? CapApp.addListener('appStateChange', (e) => e.isActive && void run()) : null
    return () => {
      alive = false
      window.clearTimeout(first)
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', vis)
      void sub?.then((x) => x.remove())
    }
  }, [storage])

  return null
}
