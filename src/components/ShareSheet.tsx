import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlignLeft, Check, ChevronDown, Copy, EyeOff, FileText, FolderDown, ImageIcon, Lock, Package, Send, type LucideIcon } from 'lucide-react'
import { APP_VERSION } from '../lib/brand'
import { exportFiles, isNative, saveFile, saveFiles, shareFile, type OutFile } from '../lib/backupFiles'
import { makePdf, makePngs, makePreview, type ExportLook } from '../lib/exportList'
import { canShareText, copyText, makeText, shareText } from '../lib/exportText'
import { cap, makeT } from '../lib/i18n'
import { listTitle } from '../lib/lists'
import { priceText } from '../lib/format'
import { RADIUS_K } from '../lib/settings'
import { buildShare, estimateBytes, exportFileName, isSelected, pickShared, type ShareOptions } from '../lib/share'
import { loadImages } from '../lib/backup'
import type { Item, Lang, ShareBought } from '../lib/types'
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
  const [skip, setSkip] = useState<Set<string>>(() => new Set())
  const [add, setAdd] = useState<Set<string>>(() => new Set())
  const [itemsOpen, setItemsOpen] = useState(false)
  const [lang, setLang] = useState<Lang>(settings.lang)
  const [look, setLook] = useState<'app' | 'light'>('app')
  const [prev, setPrev] = useState<{ url: string; pages: number } | null>(null)
  const [prevBusy, setPrevBusy] = useState(false)
  const prevUrl = useRef<string | null>(null)

  const mode: ShareBought = fmt === 'file' ? pick : 'exclude'
  const tx = useMemo(() => (fmt === 'file' ? t : makeT(lang)), [fmt, lang, t])

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    const ids = new Set(items.filter((i) => i.listId === id).map((i) => i.id))
    setSkip((prev) => new Set([...prev].filter((x) => !ids.has(x))))
    setAdd((prev) => new Set([...prev].filter((x) => !ids.has(x))))
  }

  const toggleItem = (i: Item) => {
    const flip = (prev: Set<string>) => {
      const next = new Set(prev)
      if (next.has(i.id)) next.delete(i.id)
      else next.add(i.id)
      return next
    }
    if (picked.has(i.listId)) setSkip(flip)
    else setAdd(flip)
  }

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

  const pickIds = useMemo(() => ({ listIds: [...picked], skip: [...skip], add: [...add] }), [picked, skip, add])

  const { open, done } = useMemo(() => {
    const sel = items.filter((i) => i.owner === 'me' && !i.deletedAt && isSelected(pickIds, i))
    return { open: sel.filter((i) => !i.bought), done: sel.filter((i) => i.bought) }
  }, [items, pickIds])

  const visible = mode === 'only' ? [] : open
  const hidden = mode === 'exclude' ? [] : done
  const noteCount = notes ? visible.filter((w) => w.note).length : 0
  const strip = (mode === 'only' ? done : open).slice(0, 5)
  const shown = useMemo(() => items.filter((i) => i.owner === 'me' && !i.deletedAt && (mode === 'only' ? i.bought : !i.bought)), [items, mode])
  const nothing = visible.length + hidden.length === 0

  const opts: ShareOptions = { ...pickIds, name: name.trim(), shareId: settings.shareId, hue: settings.hue, notes, price, images, listDate, bought: mode }
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

  const textOut = useMemo(() => (fmt === 'text' ? makeText({ from: name.trim() || tx('Dein Name'), lists: pickShared({ items, lists }, opts, tx).collections, t: tx }) : ''), [fmt, name, optsKey, items, lists, tx])

  const lookNow = (): ExportLook => {
    const root = document.documentElement
    if (look === 'light') return { scheme: 'light', style: 'tag', hue: settings.hue, rk: 1 }
    return { scheme: root.dataset.black === 'true' ? 'black' : root.dataset.theme === 'light' ? 'light' : 'dark', style: settings.style, hue: settings.hue, rk: RADIUS_K[settings.radius] }
  }

  useEffect(() => {
    if ((fmt !== 'pdf' && fmt !== 'png') || nothing) {
      setPrev(null)
      return
    }
    let off = false
    const timer = setTimeout(async () => {
      setPrevBusy(true)
      try {
        const { collections } = pickShared({ items, lists }, opts, tx)
        const ids = [...new Set(collections.flatMap((c) => c.items.flatMap((i) => (i.imageId ? [i.imageId] : []))))]
        const r = await makePreview({ from: name.trim() || tx('Dein Name'), hue: settings.hue, lists: collections, images: await loadImages(ids), t: tx, look: lookNow() }, fmt)
        if (off) return
        const url = URL.createObjectURL(r.blob)
        if (prevUrl.current) URL.revokeObjectURL(prevUrl.current)
        prevUrl.current = url
        setPrev({ url, pages: r.pages })
      } catch {
        if (!off) setPrev(null)
      } finally {
        if (!off) setPrevBusy(false)
      }
    }, 350)
    return () => {
      off = true
      clearTimeout(timer)
    }
  }, [fmt, optsKey, name, lang, look, items, lists, nothing])

  useEffect(
    () => () => {
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current)
    },
    [],
  )

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
      if ((await shareText(textOut, tx('Meine Wunschliste'))) === 'cancelled') return
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
        const { collections } = pickShared({ items, lists }, opts, tx)
        const ids = [...new Set(collections.flatMap((c) => c.items.flatMap((i) => (i.imageId ? [i.imageId] : []))))]
        const input = { from: name.trim(), hue: settings.hue, lists: collections, images: await loadImages(ids), t: tx, now, look: lookNow() }
        let files: OutFile[]
        if (fmt === 'pdf') files = [{ bytes: await makePdf(input), name: exportFileName(name, 'pdf', at), type: 'application/pdf' }]
        else {
          const parts = await makePngs(input)
          files = parts.map((bytes, n) => ({ bytes, name: exportFileName(name, 'png', at, parts.length > 1 ? n + 1 : undefined), type: 'image/png' }))
        }
        const text = tx('Meine Wunschliste')
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

  const sent = [price && t('Preise'), images && cap(t('Bilder')), notes && t('Notizen'), listDate && t('Datum')].filter(Boolean).join(' · ')
  const facts = [hidden.length ? `${hidden.length} ${t('unauffällig')}` : '', noteCount ? t.n(noteCount, 'Notiz', 'Notizen') : '', fmt === 'file' && mb ? t('ca. {size}', { size: mb }) : ''].filter(Boolean)

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
          <button key={value} type="button" role="tab" aria-selected={fmt === value} aria-label={cap(t(label))} className="fmt" data-on={fmt === value} onClick={() => setFmt(value)}>
            <Icon size={20} aria-hidden />
            <span>{cap(t(label))}</span>
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

      {fmt !== 'file' && (
        <div className="field">
          <span>{t('Sprache')}</span>
          <Segmented
            id="share-lang"
            value={lang}
            onChange={setLang}
            options={[
              { value: 'de', label: 'Deutsch' },
              { value: 'en', label: 'English' },
            ]}
          />
        </div>
      )}

      {(fmt === 'pdf' || fmt === 'png') && (
        <div className="field">
          <span>{t('Aussehen')}</span>
          <Segmented
            id="share-look"
            value={look}
            onChange={setLook}
            options={[
              { value: 'app', label: t('Wie in der App') },
              { value: 'light', label: t('Hell, zum Drucken') },
            ]}
          />
        </div>
      )}

      <div className="field">
        <span>{t('Welche Listen?')}</span>
        <div className="sharelists">
          {myLists.map((l) => {
            const on = picked.has(l.id)
            const mine = items.filter((i) => i.listId === l.id && !i.deletedAt)
            const n = mine.length
            const part = on ? mine.filter((i) => !skip.has(i.id)).length : mine.filter((i) => add.has(i.id)).length
            return (
              <button key={l.id} className="sharelist" data-on={on} role="checkbox" aria-checked={on} onClick={() => toggle(l.id)}>
                <span className="sharelist__box">{on && <Check size={13} strokeWidth={3.4} />}</span>
                <ListMark icon={l.emoji} hue={l.hue} size={22} />
                <b>{listTitle(l, t)}</b>
                <em>{part > 0 && part < n ? `${part}/${n}` : n}</em>
              </button>
            )
          })}
        </div>
      </div>

      <button className="reveal reveal--block optsbtn" data-testid="share-items-toggle" onClick={() => setItemsOpen((a) => !a)} aria-expanded={itemsOpen}>
        <span className="optsbtn__t">{t('Einzelne Wünsche')}</span>
        <small>{t('{n} von {m}', { n: visible.length + (mode === 'only' ? hidden.length : 0), m: shown.length })}</small>
        <ChevronDown size={15} style={{ transform: itemsOpen ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
      </button>
      <AnimatePresence initial={false}>
        {itemsOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 32 }} style={{ overflow: 'hidden' }}>
            <div className="shareitems" data-testid="share-items">
              {myLists.map((l) => {
                const rows = shown.filter((i) => i.listId === l.id)
                if (!rows.length) return null
                return (
                  <div key={l.id} className="shareitems__grp" data-picked={picked.has(l.id)}>
                    <div className="shareitems__head">
                      <ListMark icon={l.emoji} hue={l.hue} size={20} />
                      <b>{listTitle(l, t)}</b>
                    </div>
                    {rows.map((i) => {
                      const on = isSelected(pickIds, i)
                      return (
                        <button key={i.id} className="shareitem" data-on={on} role="checkbox" aria-checked={on} onClick={() => toggleItem(i)}>
                          <span className="sharelist__box">{on && <Check size={13} strokeWidth={3.4} />}</span>
                          <Cover emoji={i.emoji} hue={i.hue} size={30} imageId={i.imageId} />
                          <span className="shareitem__t">
                            <b>{i.name}</b>
                            {i.price !== undefined && <small>{priceText(i.price, i.currency).main}</small>}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {(fmt === 'pdf' || fmt === 'png') && !nothing && (
        <div className="field">
          <span>{t('Vorschau')}</span>
          <div className="shareprev" data-kind={fmt} data-busy={prevBusy} data-testid="share-preview">
            {prev ? <img src={prev.url} alt={t('Vorschau')} draggable={false} /> : <div className="shareprev__wait" />}
            {prev && prev.pages > 1 && <small>{fmt === 'pdf' ? t('Seite {n} von {m}', { n: 1, m: prev.pages }) : t('Teil {n} von {m}', { n: 1, m: prev.pages })}</small>}
          </div>
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
                  [cap(t('Bilder')), t('Bilder mitsenden'), images, setImages],
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
