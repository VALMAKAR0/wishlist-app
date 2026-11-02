import { useState } from 'react'
import { FolderDown, Send } from 'lucide-react'
import { exportFile, isNative, saveFile } from '../lib/backupFiles'
import { buildCsv, buildText, exportName, type ExportFormat, type ExportScope } from '../lib/exportData'
import { checkPin, hashPin, newSalt, validPin } from '../lib/lock'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'
import { Segmented } from './Primitives'
import { SwitchRow } from './SettingsUi'
import { Sheet } from './Sheet'

export type PinMode = 'set' | 'change' | 'remove'

const digits = (v: string) => v.replace(/\D/g, '').slice(0, 8)

export function PinSheet({ mode, onClose }: { mode: PinMode; onClose: () => void }) {
  const t = useT()
  const ui = useUI()
  const { lockHash, lockSalt } = ui.settings
  const [cur, setCur] = useState('')
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const needCur = mode !== 'set'
  const needNew = mode !== 'remove'

  const submit = async () => {
    setErr('')
    if (needNew && !validPin(a)) return setErr(t('Die PIN braucht 4 bis 8 Ziffern.'))
    if (needNew && a !== b) return setErr(t('Die beiden PINs stimmen nicht überein.'))
    setBusy(true)
    try {
      if (needCur && !(await checkPin(cur, lockSalt, lockHash))) {
        setErr(t('Die aktuelle PIN stimmt nicht.'))
        return
      }
      if (mode === 'remove') {
        ui.setSettings({ lockHash: '', lockSalt: '' })
        ui.toast({ message: t('App-Sperre ist aus'), emoji: '🔓' })
      } else {
        const salt = newSalt()
        ui.setSettings({ lockSalt: salt, lockHash: await hashPin(a, salt) })
        ui.toast({ message: mode === 'set' ? t('App-Sperre ist an') : t('PIN geändert'), emoji: '🔒' })
      }
      onClose()
    } catch {
      setErr(t('Das hat nicht geklappt.'))
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'set' ? t('PIN festlegen') : mode === 'change' ? t('PIN ändern') : t('Sperre entfernen')
  return (
    <Sheet
      title={title}
      subtitle={t('Die Sperre hält neugierige Blicke fern. Die Daten selbst sind nicht verschlüsselt.')}
      onClose={onClose}
      footer={
        <button className="btn btn--primary btn--block" disabled={busy} onClick={() => void submit()}>
          {mode === 'remove' ? t('Sperre entfernen') : t('Speichern')}
        </button>
      }
    >
      {needCur && (
        <label className="field">
          <span>{t('Aktuelle PIN')}</span>
          <input type="password" inputMode="numeric" autoComplete="off" value={cur} onChange={(e) => setCur(digits(e.target.value))} data-testid="pin-cur" />
        </label>
      )}
      {needNew && (
        <>
          <label className="field">
            <span>{t('Neue PIN')}</span>
            <input type="password" inputMode="numeric" autoComplete="off" placeholder={t('4 bis 8 Ziffern')} value={a} onChange={(e) => setA(digits(e.target.value))} data-testid="pin-new" />
          </label>
          <label className="field">
            <span>{t('Neue PIN wiederholen')}</span>
            <input type="password" inputMode="numeric" autoComplete="off" value={b} onChange={(e) => setB(digits(e.target.value))} data-testid="pin-new2" />
          </label>
        </>
      )}
      {err && (
        <p className="hint hint--warn" role="alert">
          {err}
        </p>
      )}
      {mode !== 'remove' && <p className="hint">{t('Vergisst du die PIN, hilft nur „Alle Daten löschen“ und ein Backup. Halte regelmäßig ein Backup bereit.')}</p>}
    </Sheet>
  )
}

export function ExportSheet({ onClose }: { onClose: () => void }) {
  const t = useT()
  const ui = useUI()
  const { items, lists, persons } = useStore()
  const [scope, setScope] = useState<ExportScope>('all')
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [bought, setBought] = useState(true)
  const [busy, setBusy] = useState(false)

  const send = async (save: boolean) => {
    setBusy(true)
    try {
      const src = { items, lists, persons }
      const body = format === 'csv' ? buildCsv(src, scope, bought, t) : buildText(src, scope, bought, t)
      const bytes = new TextEncoder().encode(body)
      const name = exportName(format, scope)
      const type = format === 'csv' ? 'text/csv' : 'text/plain'
      const r = save ? await saveFile(bytes, name) : await exportFile(bytes, name, type)
      if (r.where === 'cancelled') return
      ui.haptic(18)
      ui.toast({ emoji: '📄', message: r.where === 'documents' ? t('Gespeichert unter Dokumente/Wunschliste.') : r.where === 'download' ? t('Datei heruntergeladen.') : t('Export bereit.') })
      onClose()
    } catch {
      ui.toast({ message: t('Export hat nicht geklappt.'), emoji: '⚠️' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      title={t('Daten exportieren')}
      subtitle={t('Eine lesbare Kopie deiner Einträge, z. B. für Excel oder zum Ausdrucken')}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--primary btn--block" disabled={busy} onClick={() => void send(false)}>
            <Send size={17} /> {isNative() ? t('Teilen') : t('Herunterladen')}
          </button>
          {isNative() && (
            <button className="btn btn--ghost btn--block" style={{ marginTop: 8 }} disabled={busy} onClick={() => void send(true)}>
              <FolderDown size={17} /> {t('Als Datei speichern')}
            </button>
          )}
        </>
      }
    >
      <div className="field">
        <span>{t('Was?')}</span>
        <Segmented<ExportScope>
          id="export-scope"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: t('Alles') },
            { value: 'wishes', label: t('Wünsche') },
            { value: 'ideas', label: t('Ideen') },
          ]}
        />
      </div>
      <div className="field">
        <span>{t('Format')}</span>
        <Segmented<ExportFormat>
          id="export-format"
          value={format}
          onChange={setFormat}
          options={[
            { value: 'csv', label: 'CSV (Excel)' },
            { value: 'txt', label: t('Text') },
          ]}
        />
      </div>
      <SwitchRow title={t('Gekaufte mit exportieren')} text={t('Archiv und gekaufte Geschenke bekommen den Status „gekauft“.')} checked={bought} onChange={setBought} />
      <p className="hint">{t('Der Export enthält auch Notizen und private Geschenkideen. Gib die Datei nicht an die Personen weiter, für die sie gedacht sind.')}</p>
    </Sheet>
  )
}
