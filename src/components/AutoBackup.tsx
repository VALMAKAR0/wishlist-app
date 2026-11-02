import { useEffect, useRef } from 'react'
import { APP_VERSION } from '../lib/brand'
import { backupName, buildBackup } from '../lib/backup'
import { syncPart } from '../lib/settings'
import { isNative, writeAutoBackup } from '../lib/backupFiles'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'

const MIN_GAP_MS = 20 * 3600_000
const START_DELAY_MS = 3000

/** Automatische Sicherung in Dokumente: nur Android-App, höchstens einmal täglich, nur wenn sich etwas geändert hat, nur beim Start. */
export function AutoBackup() {
  const t = useT()
  const ui = useUI()
  const store = useStore()
  const done = useRef(false)
  const latest = useRef(store)
  latest.current = store
  const settings = useRef(ui.settings)
  settings.current = ui.settings

  useEffect(() => {
    if (!isNative()) return
    const id = window.setTimeout(() => {
      if (done.current) return
      done.current = true
      const s = latest.current
      const now = Date.now()
      const hasData = s.items.length > 0 || s.persons.length > 0 || s.received.length > 0
      if (!settings.current.autoBackup || s.storage !== 'ok' || !hasData || !s.changedSinceBackup) return
      if (s.lastBackupAt && now - s.lastBackupAt < MIN_GAP_MS) return
      void (async () => {
        try {
          const { bytes, meta } = await buildBackup(s, APP_VERSION, now, syncPart(settings.current))
          await writeAutoBackup(bytes, backupName('auto', new Date(now)), settings.current.autoKeep)
          latest.current.dispatch({ type: 'backedUp', at: meta.createdAt })
          ui.toast({ message: t('Automatisch gesichert'), emoji: '🗄️' })
        } catch {
          ui.toast({ message: t('Automatisches Backup hat nicht geklappt.'), emoji: '⚠️' })
        }
      })()
    }, START_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [])

  return null
}
