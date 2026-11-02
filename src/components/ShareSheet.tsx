import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, EyeOff, FolderDown, Lock, Send } from 'lucide-react'
import { APP_VERSION } from '../lib/brand'
import { isNative, saveFile, shareFile } from '../lib/backupFiles'
import { listTitle } from '../lib/lists'
import { buildShare, DEFAULT_SHARE, estimateBytes, type ShareOptions } from '../lib/share'
import type { ShareBought } from '../lib/types'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'
import { Cover, CountUp, Segmented, Switch } from './Primitives'
import { Sheet } from './Sheet'

export function ShareSheet({ onClose, initialList }: { onClose: () => void; initialList?: string }) {
  const t = useT()
  const ui = useUI()
  const { items, lists } = useStore()
  const { settings, setSettings } = ui
  const myLists = lists.filter((l) => l.owner === 'me')
  const [picked, setPicked] = useState<Set<string>>(() => new Set(initialList && myLists.some((l) => l.id === initialList) ? [initialList] : myLists.map((l) => l.id)))
  const [notes, setNotes] = useState(DEFAULT_SHARE.notes)
  const [price, setPrice] = useState(DEFAULT_SHARE.price)
  const [images, setImages] = useState(DEFAULT_SHARE.images)
  const [listDate, setListDate] = useState(DEFAULT_SHARE.listDate)
  const [mode, setMode] = useState<ShareBought>(DEFAULT_SHARE.bought)
  const [name, setName] = useState(settings.shareName)
  const [adv, setAdv] = useState(false)
  const [shake, setShake] = useState(0)
  const [busy, setBusy] = useState(false)
  const [bytes, setBytes] = useState<number | null>(null)

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const MODE_TEXT: Record<ShareBought, { title: string; text: string }> = {
    hidden: {
      title: t('Unauffällig mitsenden'),
      text: t('Gekaufte Artikel gehen im Hintergrund mit. In deiner Liste tauchen sie für andere nicht auf, aber wer dir etwas schenken will, wird unauffällig gewarnt, wenn du es schon hast.'),
    },
    only: {
      title: t('Nur Gekauftes teilen'),
      text: t('Es geht nur die Liste der Dinge mit, die du schon hast. Andere sehen keine Wünsche, werden aber vor doppelten Geschenken gewarnt.'),
    },
    exclude: {
      title: t('Gekauftes ausschließen'),
      text: t('Gekaufte Artikel bleiben ganz bei dir. Es gibt keinen Hinweis auf Doppelungen.'),
    },
  }

  const { open, done } = useMemo(() => {
    const sel = items.filter((i) => i.owner === 'me' && !i.deletedAt && picked.has(i.listId))
    return { open: sel.filter((i) => !i.bought), done: sel.filter((i) => i.bought) }
  }, [items, picked])

  const visible = mode === 'only' ? [] : open
  const hidden = mode === 'exclude' ? [] : done
  const noteCount = notes ? visible.filter((w) => w.note).length : 0
  const strip = (mode === 'only' ? done : open).slice(0, 5)
  const nothing = picked.size === 0 || visible.length + hidden.length === 0

  const opts: ShareOptions = { listIds: [...picked], name: name.trim(), shareId: settings.shareId, hue: settings.hue, notes, price, images, listDate, bought: mode }
  const optsKey = JSON.stringify({ ...opts, name: '' })

  useEffect(() => {
    let off = false
    void estimateBytes({ items, lists }, opts, t).then((n) => {
      if (!off) setBytes(n)
    })
    return () => {
      off = true
    }
  }, [optsKey, items, lists])

  const send = async (save = false) => {
    if (!name.trim()) {
      setShake((n) => n + 1)
      ui.haptic(30)
      return
    }
    setBusy(true)
    try {
      setSettings({ shareName: name.trim() })
      const out = await buildShare({ items, lists }, opts, t, APP_VERSION)
      const text = t('{name} schickt dir die Wunschliste. Öffne die Datei in der App „Wunschliste“ unter „Erhalten“ → „Import“.', { name: name.trim() })
      const r = save ? await saveFile(out.bytes, out.name) : await shareFile(out.bytes, out.name, text)
      if (r.where === 'cancelled') return
      ui.haptic(18)
      ui.toast({ emoji: '📤', message: r.where === 'download' ? t('Datei heruntergeladen. Schick sie z. B. per WhatsApp.') : r.where === 'documents' ? t('Gespeichert unter Dokumente/Wunschliste. Hänge sie in WhatsApp als Dokument an.') : t('Wunschliste geteilt') })
      onClose()
    } catch {
      ui.toast({ message: t('Teilen hat nicht geklappt.'), emoji: '⚠️' })
    } finally {
      setBusy(false)
    }
  }

  const mb = bytes === null ? '' : bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
  const big = bytes !== null && bytes > 8 * 1024 * 1024

  return (
    <Sheet
      title={t('Wunschlisten teilen')}
      subtitle={t('Du schickst einen Schnappschuss der gewählten Listen')}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--primary btn--block" disabled={nothing || busy} onClick={() => void send()}>
            <Send size={17} /> {t('Datei teilen')}
          </button>
          {isNative() && (
            <button className="btn btn--ghost btn--block" style={{ marginTop: 8 }} disabled={nothing || busy} onClick={() => void send(true)}>
              <FolderDown size={17} /> {t('Als Datei speichern')}
            </button>
          )}
        </>
      }
    >
      <motion.label key={`n${shake}`} className="field" animate={shake ? { x: [0, -9, 9, -6, 6, 0] } : undefined} transition={{ duration: 0.4 }}>
        <span>{t('Dein Name')}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('So steht es beim Empfänger')} maxLength={40} data-invalid={shake > 0 && !name.trim()} />
      </motion.label>

      <div className="field">
        <span>{t('Welche Listen?')}</span>
        <div className="sharelists">
          {myLists.map((l) => {
            const on = picked.has(l.id)
            const n = items.filter((i) => i.listId === l.id && !i.deletedAt).length
            return (
              <button key={l.id} className="sharelist" data-on={on} role="checkbox" aria-checked={on} onClick={() => toggle(l.id)}>
                <span className="sharelist__box">{on && <Check size={13} strokeWidth={3.4} />}</span>
                <span aria-hidden>{l.emoji}</span>
                <b>{listTitle(l, t)}</b>
                <em>{n}</em>
              </button>
            )
          })}
        </div>
      </div>

      <div className="parcel">
        <div className="parcel__strip">
          <AnimatePresence initial={false}>
            {strip.map((w, i) => (
              <motion.div key={w.id} initial={{ opacity: 0, y: 14, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.7, width: 0, marginLeft: 0, pointerEvents: 'none' }} transition={{ type: 'spring', stiffness: 380, damping: 26, delay: i * 0.03 }} style={{ marginLeft: i ? -10 : 0, zIndex: 9 - i }}>
                <Cover emoji={w.emoji} hue={w.hue} size={40} imageId={w.imageId} />
              </motion.div>
            ))}
          </AnimatePresence>
          {strip.length === 0 && <span className="parcel__empty">{t('Noch nichts zum Teilen')}</span>}
        </div>
        <div className="stats">
          <div className="stat">
            <b>
              <CountUp value={visible.length} duration={0.5} />
            </b>
            <span>{t('sichtbar')}</span>
          </div>
          <div className="stat">
            <b>
              <CountUp value={hidden.length} duration={0.5} />
            </b>
            <span>{t('unauffällig')}</span>
          </div>
          <div className="stat">
            <b>
              <CountUp value={noteCount} duration={0.5} />
            </b>
            <span>{t('Notizen')}</span>
          </div>
        </div>
      </div>

      {mb && (
        <p className="hint" data-warn={big}>
          {t('Dateigröße ca. {size}', { size: mb })}
          {big ? ` · ${t('Discord erlaubt ohne Abo nur 10 MB. Schalte unter „Erweiterte Einstellungen“ die Bilder aus.')}` : ''}
        </p>
      )}

      <button className="reveal reveal--block" onClick={() => setAdv((a) => !a)} aria-expanded={adv}>
        <ChevronDown size={15} style={{ transform: adv ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} /> {t('Erweiterte Einstellungen')}
      </button>

      <AnimatePresence initial={false}>
        {adv && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 32 }} style={{ overflow: 'hidden' }}>
            <div className="setting">
              <div>
                <strong>{t('Preise mitsenden')}</strong>
                <p>{t('Der Empfänger sieht, was die Wünsche ungefähr kosten.')}</p>
              </div>
              <Switch checked={price} onChange={setPrice} label={t('Preise mitsenden')} />
            </div>
            <div className="setting">
              <div>
                <strong>{t('Bilder mitsenden')}</strong>
                <p>{t('Macht die Datei größer. Ohne Bilder zeigt die Liste Symbol und Farbe.')}</p>
              </div>
              <Switch checked={images} onChange={setImages} label={t('Bilder mitsenden')} />
            </div>
            <div className="setting">
              <div>
                <strong>{t('Notizen mitsenden')}</strong>
                <p>{t('Standardmäßig bleiben sie bei dir.')}</p>
              </div>
              <Switch checked={notes} onChange={setNotes} label={t('Notizen mitsenden')} />
            </div>
            <div className="setting">
              <div>
                <strong>{t('Datum der Liste mitsenden')}</strong>
                <p>{t('Zum Beispiel der Geburtstag, mit Tagen bis dahin.')}</p>
              </div>
              <Switch checked={listDate} onChange={setListDate} label={t('Datum der Liste mitsenden')} />
            </div>

            <div className="field">
              <span>{t('Gekaufte Artikel')}</span>
              <Segmented
                id="share-bought"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'hidden', label: t('Unauffällig') },
                  { value: 'only', label: t('Nur gekauft') },
                  { value: 'exclude', label: t('Ohne') },
                ]}
              />
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={mode} className="explain" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                  <EyeOff size={18} />
                  <div>
                    <strong>{MODE_TEXT[mode].title}</strong>
                    <p>{MODE_TEXT[mode].text}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="hint hint--lock">
        <Lock size={14} /> {t('Geschenkideen für andere werden nie geteilt.')}
      </p>
    </Sheet>
  )
}
