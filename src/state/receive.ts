import { useCallback } from 'react'
import { restoreImages } from '../lib/backup'
import { mergeReceived, readShare, type ShareRead } from '../lib/share'
import { useNav } from './nav'
import { useStore } from './store'
import { useT, useUI } from './ui'

/** Import einer erhaltenen Liste aus einer Datei. */
export function useReceive() {
  const t = useT()
  const ui = useUI()
  const { received, persons, dispatch } = useStore()
  const { open } = useNav()

  const failText = (r: Extract<ShareRead, { ok: false }>) =>
    r.reason === 'isBackup'
      ? t('Das ist eine Sicherung, keine geteilte Liste. Wiederherstellen findest du unter „Mehr“.')
      : r.reason === 'newerFormat'
        ? t('Diese Datei stammt aus einer neueren Version der App. Aktualisiere die App zuerst.')
        : r.reason === 'broken'
          ? t('Die Datei ist beschädigt und lässt sich nicht lesen.')
          : t('Das ist keine geteilte Wunschliste.')

  const importFile = useCallback(
    async (file: File) => {
      let r: ShareRead
      try {
        r = readShare(new Uint8Array(await file.arrayBuffer()))
      } catch {
        ui.toast({ message: t('Die Datei lässt sich nicht lesen.'), emoji: '⚠️' })
        return
      }
      if (!r.ok) {
        ui.toast({ message: failText(r), emoji: '⚠️' })
        return
      }
      const byName = (name: string) => persons.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase())?.id
      const m = mergeReceived(received, r, byName)
      const lines = [t('{a}, {b}.', { a: t.n(r.counts.lists, 'Liste', 'Listen'), b: t.n(r.counts.visible, 'Wunsch', 'Wünsche') })]
      if (m.replaced.length) lines.push(t('Ersetzt: {names}.', { names: m.replaced.map((n) => t(n)).join(', ') }))
      if (!m.isNew && m.added.length) lines.push(t('Neu: {names}.', { names: m.added.map((n) => t(n)).join(', ') }))
      const linked = persons.find((p) => p.id === m.pkg.personId)
      if (m.isNew && linked) lines.push(t('Wird mit den Ideen für {name} verknüpft.', { name: linked.name }))
      ui.confirm({
        title: t('Liste von {name} importieren?', { name: r.from }),
        text: lines.join(' '),
        confirmLabel: t('Importieren'),
        onConfirm: () => {
          void (async () => {
            try {
              await restoreImages(r.images)
              dispatch({ type: 'receive', pkg: m.pkg })
              ui.haptic(20)
              ui.toast({ message: t('Liste von {name} gespeichert', { name: r.from }), emoji: '📬' })
              open({ type: 'received', id: m.pkg.id })
            } catch {
              ui.toast({ message: t('Importieren hat nicht geklappt. Es wurde nichts geändert.'), emoji: '⚠️' })
            }
          })()
        },
      })
    },
    [received, persons, dispatch, open, ui, t],
  )

  return { importFile }
}
