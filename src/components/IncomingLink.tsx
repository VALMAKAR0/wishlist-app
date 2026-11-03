import { useEffect, useRef, useState } from 'react'
import { Gift, User } from 'lucide-react'
import { isNative } from '../lib/backupFiles'
import { extractUrl } from '../lib/linkImport'
import { ShareIn } from '../lib/shareIn'
import type { Owner } from '../lib/types'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'
import { ItemFormSheet } from './ItemFormSheet'
import { Presence } from './Presence'
import { Sheet } from './Sheet'

/** Android: Link aus Browser oder Shop über „Teilen → Wunschliste“. Erst wählen, für wen, dann öffnet sich das Formular mit dem Link. */
export function IncomingLink() {
  const t = useT()
  const ui = useUI()
  const { persons } = useStore()
  const [url, setUrl] = useState<string | null>(null)
  const [owner, setOwner] = useState<Owner | null>(null)
  const toast = useRef(ui.toast)
  toast.current = ui.toast
  const tr = useRef(t)
  tr.current = t

  useEffect(() => {
    if (!isNative()) return
    let off = false
    const take = (text?: string) => {
      if (off || !text) return
      const found = extractUrl(text)
      if (!found) {
        toast.current({ message: tr.current('Im geteilten Text steckt kein Link.'), emoji: '🔗' })
        return
      }
      setOwner(null)
      setUrl(found)
    }
    let sub: Promise<{ remove: () => Promise<void> }> | undefined
    try {
      sub = ShareIn.addListener('shareIn', (e) => {
        take(e.text)
        void ShareIn.getPending().catch(() => undefined)
      })
      sub.catch(() => undefined)
      ShareIn.getPending().then((r) => take(r.text)).catch(() => undefined)
    } catch {
      /* Plugin fehlt: kein Teilen-Eingang, der Rest läuft normal */
    }
    return () => {
      off = true
      void sub?.then((s) => s.remove()).catch(() => undefined)
    }
  }, [])

  const close = () => {
    setUrl(null)
    setOwner(null)
  }

  return (
    <>
      <Presence show={!!url && owner === null}>
        {url && owner === null && (
          <Sheet title={t('Link speichern')} subtitle={t('Für wen ist das?')} onClose={close}>
            <div className="choicelist">
              <button className="btn btn--primary btn--block" onClick={() => setOwner('me')}>
                <User size={16} /> {t('Mein Wunsch')}
              </button>
              {persons.map((p) => (
                <button key={p.id} className="btn btn--ghost btn--block" onClick={() => setOwner(p.id)}>
                  <Gift size={16} /> {t('Idee für {name}', { name: p.name })}
                </button>
              ))}
            </div>
            {persons.length === 0 && <p className="hint hint--pad">{t('Für Geschenkideen lege zuerst unter „Ideen“ eine Person an.')}</p>}
          </Sheet>
        )}
      </Presence>
      <Presence show={!!url && owner !== null}>{url && owner !== null && <ItemFormSheet key={url + owner} owner={owner} initialLink={url} onClose={close} />}</Presence>
    </>
  )
}
