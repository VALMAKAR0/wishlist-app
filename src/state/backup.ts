import { useCallback, useState } from 'react'
import { APP_VERSION } from '../lib/brand'
import { BACKUP_DIR, deliverBackup, isNative } from '../lib/backupFiles'
import {
  backupName, buildBackup, listSafetyCopies, loadSafetyCopy, readBackup, restoreImages, saveSafetyCopy, type ReadResult,
} from '../lib/backup'
import { longDate, timeLabel } from '../lib/format'
import { applyBackupSettings, syncPart } from '../lib/settings'
import { useStore } from './store'
import { useT, useUI } from './ui'

/** Sichern und Wiederherstellen für die Oberfläche. Zeigt selbst die Rückmeldungen (Hinweise, Rückfragen). */
export function useBackup() {
  const t = useT()
  const ui = useUI()
  const { items, lists, persons, received, dispatch } = useStore()
  const [busy, setBusy] = useState(false)
  const data = { items, lists, persons, received }
  const hasData = items.length > 0 || persons.length > 0 || received.length > 0

  const backupNow = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      const { bytes, meta } = await buildBackup(data, APP_VERSION, Date.now(), syncPart(ui.settings))
      const out = await deliverBackup(bytes, backupName('manual', new Date(meta.createdAt)))
      if (out.where === 'cancelled') return
      dispatch({ type: 'backedUp', at: meta.createdAt })
      ui.haptic(18)
      ui.toast({
        emoji: '🗄️',
        message:
          out.where === 'documents'
            ? t('Gesichert in Dokumente/{dir}', { dir: BACKUP_DIR })
            : out.where === 'shared'
              ? t('Backup bereit. Speichere es z. B. in „Dateien“.')
              : t('Backup heruntergeladen'),
      })
    } catch {
      ui.toast({ message: t('Backup hat nicht geklappt.'), emoji: '⚠️' })
    } finally {
      setBusy(false)
    }
  }, [busy, items, lists, persons, received, dispatch, ui, t])

  const failText = (r: Extract<ReadResult, { ok: false }>) =>
    r.reason === 'newerFormat' || r.reason === 'newerData'
      ? t('Diese Sicherung stammt aus einer neueren Version der App. Aktualisiere die App zuerst.')
      : r.reason === 'broken'
        ? t('Die Sicherung ist beschädigt und lässt sich nicht lesen.')
        : t('Das ist keine Sicherung dieser App.')

  /** Prüft die Datei, fragt nach, legt eine interne Kopie des aktuellen Stands an und ersetzt dann alles. */
  const confirmRestore = useCallback(
    (bytes: Uint8Array, source: string) => {
      const r = readBackup(bytes)
      if (!r.ok) {
        ui.toast({ message: failText(r), emoji: '⚠️' })
        return
      }
      const c = r.meta.counts
      const lines = [
        t('{source} vom {date}: {a}, {b}, {c}.', {
          source,
          date: timeLabel(r.meta.createdAt),
          a: t.n(c.items, 'Eintrag', 'Einträge'),
          b: t.n(c.lists, 'Liste', 'Listen'),
          c: t.n(c.persons, 'Person', 'Personen'),
        }),
        t('Alle aktuellen Daten werden ersetzt. Vorher legt die App eine interne Kopie des jetzigen Stands an.'),
      ]
      if (r.missingImages) lines.push(t('{n} fehlen in der Datei.', { n: t.n(r.missingImages, 'Bild', 'Bilder') }))
      if (r.settings) lines.push(t('Deine Einstellungen aus der Sicherung werden mit übernommen.'))
      ui.confirm({
        title: t('Backup wiederherstellen?'),
        text: lines.join(' '),
        confirmLabel: t('Wiederherstellen'),
        tone: 'danger',
        onConfirm: () => {
          void (async () => {
            setBusy(true)
            try {
              if (hasData) {
                const cur = await buildBackup(data, APP_VERSION, Date.now(), syncPart(ui.settings))
                await saveSafetyCopy(cur.bytes, cur.meta, 'restore')
              }
              await restoreImages(r.images)
              dispatch({ type: 'restore', data: r.data, at: r.meta.createdAt })
              if (r.settings) ui.setSettings(applyBackupSettings(ui.settings, r.settings))
              ui.haptic(25)
              ui.toast({ message: t('Wiederhergestellt'), emoji: '♻️' })
            } catch {
              ui.toast({ message: t('Wiederherstellen hat nicht geklappt. Es wurde nichts geändert.'), emoji: '⚠️' })
            } finally {
              setBusy(false)
            }
          })()
        },
      })
    },
    [items, lists, persons, received, hasData, dispatch, ui, t],
  )

  const restoreFile = useCallback(
    async (file: File) => {
      try {
        confirmRestore(new Uint8Array(await file.arrayBuffer()), t('Sicherung'))
      } catch {
        ui.toast({ message: t('Die Datei lässt sich nicht lesen.'), emoji: '⚠️' })
      }
    },
    [confirmRestore, ui, t],
  )

  const restoreSafety = useCallback(
    async (id: string) => {
      const bytes = await loadSafetyCopy(id)
      if (!bytes) {
        ui.toast({ message: t('Die interne Kopie ist nicht mehr da.'), emoji: '⚠️' })
        return
      }
      confirmRestore(bytes, t('Interne Kopie'))
    },
    [confirmRestore, ui, t],
  )

  /** Interne Kopie des jetzigen Stands, z. B. vor dem Laden der Demo-Daten. Leere Daten brauchen keine. */
  const safetyBefore = useCallback(
    async (reason: string) => {
      if (!hasData) return
      try {
        const cur = await buildBackup(data, APP_VERSION, Date.now(), syncPart(ui.settings))
        await saveSafetyCopy(cur.bytes, cur.meta, reason)
      } catch {
        /* Kopie ist Zugabe */
      }
    },
    [items, lists, persons, received, hasData],
  )

  return { busy, backupNow, restoreFile, restoreSafety, safetyBefore, listSafetyCopies, native: isNative(), longDate }
}
