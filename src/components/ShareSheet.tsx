import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlignLeft, Check, ChevronDown, Copy, EyeOff, FileText, FolderDown, ImageIcon, Lock, Package, Send, type LucideIcon } from 'lucide-react'
import { APP_VERSION } from '../lib/brand'
import { exportFiles, isNative, saveFile, saveFiles, shareFile, type OutFile } from '../lib/backupFiles'
import { makePdf, makePngs } from '../lib/exportList'
import { canShareText, copyText, makeText, shareText } from '../lib/exportText'
import { listTitle } from '../lib/lists'
import { buildShare, estimateBytes, exportFileName, pickShared, type ShareOptions } from '../lib/share'
import { loadImages } from '../lib/backup'
import type { ShareBought } from '../lib/types'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'
import { Cover, ListMark, Segmented } from './Primitives'
import { Sheet } from './Sheet'

type Fmt = 'file' | 'pdf' | 'png' | 'text'

const FMTS: Array<{ value: Fmt; label: string; icon: LucideIcon }> = [
  { value: 'file', label: 'App-Datei', icon: Package },
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'png', label: 'Bild', icon: ImageIcon },
  { value: 'text', label: 'Text', icon: AlignLeft },
]

export function ShareSheet({ onClose, initialList }: { onClose: () => void; initialList?: string }) {
  const t = useT()
  const ui = useUI()
  const { items, lists } = useStore()
  const { settings, setSettings } = ui
  const myLists = lists.filter((l) => l.owner === 'me')
  const [picked, setPicked] = useState<Set<string>>(() => new Set(initialList && myLists.some((l) => l.id === initialList) ? [initialList] : myLists.map((l) => l.id)))
  const [notes, setNotes] = useState(settings.shareDefaults.notes)
  const [price, setPrice] = useState(settings.shareDefaults.price)
  const [images, setImages] = useState(settings.shareDefaults.images)
  const [listDate, setListDate] = useState(settings.shareDefaults.listDate)
  const [pick, setMode] = useState<ShareBought>(settings.shareDefaults.bought)
  const [fmt, setFmt] = useState<Fmt>('file')
  const [name, setName] = useState(settings.shareName)
  const [adv, setAdv] = useState(false)
  const [shake, setShake] = useState(0)
  const [busy, setBusy] = useState(false)
  const [bytes, setBytes] = useState<number | null>(null)

  const mode: ShareBought = fmt === 'file' ? pick : 'exclude'

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
    if (fmt !== 'file') return
    void estimateBytes({ items, lists }, opts, t).then((n) => {
      if (!off) setBytes(n)
    })
    return () => {
      off = true
    }
  }, [optsKey, items, lists, fmt])

  const textOut = useMemo(() => (fmt === 'text' ? makeText({ from: name.trim() || t('Dein Name'), lists: pickShared({ items, lists }, opts, t).collections, t }) : ''), [fmt, name, optsKey, items, lists])

  const sendText = async (copy: boolean) => {
    if (!name.trim()) {
      setShake((n) => n + 1)
      ui.haptic(30)
      return
    }
    setSettings({ shareName: name.trim(), shareDefaults: { notes, price, images, listDate, bought: pick } })
    try {
      if (copy) {
        const ok = await copyText(textOut)
        ui.haptic(18)
        ui.toast({ emoji: ok ? '📋' : '⚠️', message: ok ? t('Als Text kopiert') : t('Kopieren hat nicht geklappt.') })
        if (ok) onClose()
        return
      }
      if ((await shareText(textOut, t('Meine Wunschliste'))) === 'cancelled') return
      ui.haptic(18)
      onClose()
    } catch {
      ui.toast({ message: t('Teilen hat nicht geklappt.'), emoji: '⚠️' })
    }
  }

  const send = async (save = false) => {
    if (!name.trim()) {
      setShake((n) => n + 1)
      ui.haptic(30)
      return
    }
    setBusy(true)
    try {
      setSettings({ shareName: name.trim(), shareDefaults: { notes, price, images, listDate, bought: pick } })
      const now = Date.now()
      const at = new Date(now)
      let r
      if (fmt === 'file') {
        const out = await buildShare({ items, lists }, opts, t, APP_VERSION)
        const text = t('{name} schickt dir die Wunschliste. Öffne die Datei in der App „Wishlist“ unter „Erhalten“ → „Import“.', { name: name.trim() })
        r = save ? await saveFile(out.bytes, out.name) : await shareFile(out.bytes, out.name, text)
      } else {
        const { collections } = pickShared({ items, lists }, opts, t)
        const ids = [...new Set(collections.flatMap((c) => c.items.flatMap((i) => (i.imageId ? [i.imageId] : []))))]
        const input = { from: name.trim(), hue: settings.hue, lists: collections, images: await loadImages(ids), t, now }
        let files: OutFile[]
        if (fmt === 'pdf') files = [{ bytes: await makePdf(input), name: exportFileName(name, 'pdf', at), type: 'application/pdf' }]
        else {
          const parts = await makePngs(input)
          files = parts.map((bytes, n) => ({ bytes, name: exportFileName(name, 'png', at, parts.length > 1 ? n + 1 : undefined), type: 'image/png' }))
        }
        const text = t('Meine Wunschliste')
        r = save ? await saveFiles(files) : await exportFiles(files, text)
      }
      if (r.where === 'cancelled') return
      ui.haptic(18)
      if (r.where !== 'shared') ui.toast({ emoji: '📤', message: r.where === 'download' ? t('Datei heruntergeladen. Schick sie z. B. per WhatsApp.') : t('Gespeichert unter Dokumente/Wunschliste. Hänge sie in WhatsApp als Dokument an.') })
      onClose()
    } catch {
      ui.toast({ message: t('Teilen hat nicht geklappt.'), emoji: '⚠️' })
    } finally {
      setBusy(false)
    }
  }

  const mb = bytes === null ? '' : bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
  const big = bytes !== null && bytes > 8 * 1024 * 1024

  const sent = [price && t('Preise'), images && t('Bilder'), notes && t('Notizen'), listDate && t('Datum')].filter(Boolean).join(' · ')
  const facts = [hidden.length ? `${hidden.length} ${t('unauffällig')}` : '', noteCount ? `${noteCount} ${t('Notizen')}` : '', fmt === 'file' && mb ? t('ca. {size}', { size: mb }) : ''].filter(Boolean)

  return (
    <Sheet
      title={t('Wunschlisten teilen')}
      subtitle={t('Du schickst einen Schnappschuss der gewählten Listen')}
      onClose={onClose}
      footer={
        <>
          {fmt === 'text' ? (
            <>
              <button className="btn btn--primary btn--block" disabled={nothing} onClick={() => void sendText(true)}>
                <Copy size={17} /> {t('Text kopieren')}
              </button>
              {canShareText() && (
                <button className="btn btn--ghost btn--block" style={{ marginTop: 8 }} disabled={nothing} onClick={() => void sendText(false)}>
                  <Send size={17} /> {t('Text teilen')}
                </button>
              )}
            </>
          ) : (
            <>
              <button className="btn btn--primary btn--block" disabled={nothing || busy} onClick={() => void send()}>
                {busy ? <Package size={17} /> : <Send size={17} />} {busy ? t('Wird erstellt …') : fmt === 'pdf' ? t('PDF teilen') : fmt === 'png' ? t('Bild teilen') : t('Datei teilen')}
              </button>
              {isNative() && (
                <button className="btn btn--ghost btn--block" style={{ marginTop: 8 }} disabled={nothing || busy} onClick={() => void send(true)}>
                  <FolderDown size={17} /> {fmt === 'pdf' ? t('Als PDF speichern') : fmt === 'png' ? t('Als Bild speichern') : t('Als Datei speichern')}
                </button>
              )}
            </>
          )}
        </>
      }
    >
      <div className="fmtgrid" role="tablist" aria-label={t('Format')}>
        {FMTS.map(({ value, label, icon: Icon }) => (
          <button key={value} type="button" role="tab" aria-selected={fmt === value} aria-label={t(label)} className="fmt" data-on={fmt === value} onClick={() => setFmt(value)}>
            <Icon size={20} aria-hidden />
            <span>{t(label)}</span>
          </button>
        ))}
      </div>
      <p className="fmthint">
        {fmt === 'file'
          ? t('Für Leute mit der App. Sie können die Liste importieren und Dinge abhaken.')
          : fmt === 'pdf'
            ? t('Zum Lesen und Drucken, auch ohne App. Wünsche mit Link lassen sich antippen und öffnen den Shop.')
            : fmt === 'text'
              ? t('Die Liste als Text, z. B. für WhatsApp oder Notizen. Links stehen direkt beim Wunsch.')
              : t('Ein Bild zum Speichern oder Verschicken, auch ohne App. Bilder haben keine antippbaren Links.')}
      </p>

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
                <ListMark icon={l.emoji} hue={l.hue} size={22} />
                <b>{listTitle(l, t)}</b>
                <em>{n}</em>
              </button>
            )
          })}
        </div>
      </div>

      <div className="sumcard" data-testid="share-sum">
        <div className="sumcard__strip">
          <AnimatePresence initial={false}>
            {strip.map((w, i) => (
              <motion.div key={w.id} initial={{ opacity: 0, y: 12, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.7, width: 0, marginLeft: 0, pointerEvents: 'none' }} transition={{ type: 'spring', stiffness: 380, damping: 26, delay: i * 0.03 }} style={{ marginLeft: i ? -12 : 0, zIndex: 9 - i }}>
                <Cover emoji={w.emoji} hue={w.hue} size={38} imageId={w.imageId} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="sumcard__txt">
          <strong>{nothing ? t('Noch nichts zum Teilen') : mode === 'only' ? t.n(hidden.length, 'gekaufter Artikel', 'gekaufte Artikel') : t.n(visible.length, 'Wunsch sichtbar', 'Wünsche sichtbar')}</strong>
          {facts.length > 0 && <small>{facts.join(' · ')}</small>}
        </div>
      </div>
      {big && <p className="hint" data-warn>{t('Discord erlaubt ohne Abo nur 10 MB. Schalte unter „Erweiterte Einstellungen“ die Bilder aus.')}</p>}

      {fmt === 'text' && !nothing && (
        <div className="field">
          <span>{t('Vorschau')}</span>
          <pre className="textprev" data-testid="text-preview">{textOut}</pre>
        </div>
      )}

      <button className="reveal reveal--block optsbtn" onClick={() => setAdv((a) => !a)} aria-expanded={adv}>
        <span className="optsbtn__t">{t('Erweiterte Einstellungen')}</span>
        <small>{sent || t('Nichts extra')}</small>
        <ChevronDown size={15} style={{ transform: adv ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
      </button>

      <AnimatePresence initial={false}>
        {adv && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 32 }} style={{ overflow: 'hidden' }}>
            <div className="field optsbox">
              <span>{t('Mitsenden')}</span>
              <div className="optchips">
                {([
                  [t('Preise'), t('Preise mitsenden'), price, setPrice],
                  [t('Bilder'), t('Bilder mitsenden'), images, setImages],
                  [t('Notizen'), t('Notizen mitsenden'), notes, setNotes],
                  [t('Datum'), t('Datum der Liste mitsenden'), listDate, setListDate],
                ] as Array<[string, string, boolean, (v: boolean) => void]>).map(([label, aria, on, set]) => (
                  <button key={aria} type="button" role="switch" aria-checked={on} aria-label={aria} className="optchip" data-on={on} onClick={() => set(!on)}>
                    {on && <Check size={13} strokeWidth={3.2} />} {label}
                  </button>
                ))}
              </div>
              <small className="hint">{t('Bilder machen die Datei größer, ohne sie zeigt die Liste Symbol und Farbe. Notizen bleiben standardmäßig bei dir.')}</small>
            </div>

            {fmt === 'file' && (
              <div className="field optsbox">
                <span>{t('Gekaufte Artikel')}</span>
                <Segmented
                  id="share-bought"
                  value={pick}
                  onChange={setMode}
                  options={[
                    { value: 'hidden', label: t('Unauffällig') },
                    { value: 'only', label: t('Nur gekauft') },
                    { value: 'exclude', label: t('Ohne') },
                  ]}
                />
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={pick} className="explain" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                    <EyeOff size={18} />
                    <div>
                      <strong>{MODE_TEXT[pick].title}</strong>
                      <p>{MODE_TEXT[pick].text}</p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="hint hint--lock">
        <Lock size={14} /> {t('Geschenkideen für andere werden nie geteilt.')}
      </p>
    </Sheet>
  )
}
