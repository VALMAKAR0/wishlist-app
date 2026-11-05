import { App as CapApp } from '@capacitor/app'
import { useEffect, useRef, useState } from 'react'
import { applyResults, bgCollect, bgSync, snapsOf } from '../lib/bgRunner'
import { isNative } from '../lib/backupFiles'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'

/** Hält den Hintergrund-Läufer auf dem Stand der Einträge und übernimmt seine Ergebnisse beim Öffnen. */
export function BackgroundPrices() {
  const t = useT()
  const ui = useUI()
  const { items, storage, dispatch } = useStore()
  const on = isNative() && ui.settings.priceWatch && ui.settings.priceBg
  const itemsRef = useRef(items)
  itemsRef.current = items
  const tr = useRef(t)
  tr.current = t
  const toast = useRef(ui.toast)
  toast.current = ui.toast
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isNative() || storage !== 'ok') return
    let alive = true
    const pull = async () => {
      const r = await bgCollect()
      if (!alive || !r?.results?.length) return
      const s = applyResults(itemsRef.current, r.results, (id, patch) => dispatch({ type: 'updateItem', id, patch }))
      if (s.down) toast.current({ message: tr.current('{n} Preise im Hintergrund gesunken', { n: s.down }), emoji: '📉' })
    }
    void pull().finally(() => alive && setReady(true))
    const sub = CapApp.addListener('appStateChange', (e) => {
      if (e.isActive) void pull()
    })
    return () => {
      alive = false
      void sub.then((s) => s.remove())
    }
  }, [storage, dispatch])

  const key = JSON.stringify([on, on ? snapsOf(items) : 0])
  useEffect(() => {
    if (!ready || !isNative()) return
    const id = window.setTimeout(() => void bgSync(on, itemsRef.current), 1500)
    return () => window.clearTimeout(id)
  }, [key, ready, on])

  return null
}
