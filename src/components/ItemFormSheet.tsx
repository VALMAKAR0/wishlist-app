import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, ExternalLink, Loader2, Trash2, Wand2, X } from 'lucide-react'
import { isNative } from '../lib/backupFiles'
import { CURRENCIES, hasRate, money, toHref, uid } from '../lib/format'
import { processImage, saveImage } from '../lib/images'
import { cleanUrl, describeResult, extractUrl, fetchImageBytes, fetchProduct, knownCurrency, linkFailExtra, linkFailText, LinkError, missingWhy, type FieldReport } from '../lib/linkImport'
import { listTitle } from '../lib/lists'
import { candidatesFor, findSimilar, kindOptions, suggestKind } from '../lib/match'
import type { Item, Owner } from '../lib/types'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'
import { LinkReport, type Report } from './LinkReport'
import { MatchWarning } from './MatchCard'
import { Cover } from './Primitives'
import { Sheet } from './Sheet'

const EMOJIS = ['🎁', '🎧', '📷', '👟', '📚', '🎮', '🧣', '☕', '🪴', '⌚', '🧳', '🕯️', '🍷', '🎨', '🧸', '💄', '🎸', '🧴', '🍫', '🛋️']
const HUES = [14, 45, 100, 150, 190, 230, 275, 320]

interface Props {
  owner: Owner
  item?: Item | null
  /** Vorausgewählte Liste beim Anlegen. */
  listId?: string
  /** Link aus dem Teilen-Menü: wird beim Öffnen sofort gelesen. */
  initialLink?: string
  onClose: () => void
}

export function ItemFormSheet({ owner, item, listId: initialList, initialLink, onClose }: Props) {
  const t = useT()
  const { dispatch, lists, items, received, persons } = useStore()
  const ui = useUI()
  const editing = !!item
  const forMe = owner === 'me'
  const ownerLists = lists.filter((l) => l.owner === owner)

  const [name, setName] = useState(item?.name ?? '')
  const [kind, setKind] = useState(item?.kind ?? '')
  const [kindTouched, setKindTouched] = useState(!!item?.kind)
  const [listId, setListId] = useState(item?.listId ?? (ownerLists.some((l) => l.id === initialList) ? (initialList as string) : (ownerLists[0]?.id ?? '')))
  const [link, setLink] = useState(item?.link ?? '')
  const [price, setPrice] = useState(item?.price !== undefined ? String(item.price).replace('.', ',') : '')
  const [cur, setCur] = useState(item ? (item.currency ?? 'EUR') : ui.settings.currency)
  const [note, setNote] = useState(item?.note ?? '')
  const [emoji, setEmoji] = useState(item?.emoji ?? EMOJIS[0])
  const [hue, setHue] = useState(item?.hue ?? HUES[Math.floor(Math.random() * HUES.length)])
  const [shake, setShake] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ type: string; data: ArrayBuffer; preview: string } | null>(null)
  const [removed, setRemoved] = useState(false)
  const [busy, setBusy] = useState(false)
  const hasImage = !!pending || (!removed && !!item?.imageId)
  const [importing, setImporting] = useState(false)
  const [report, setReport] = useState<Report | null>(null)
  const [flash, setFlash] = useState<string[]>([])
  const flashTimer = useRef(0)
  const doFlash = (...keys: string[]) => {
    setFlash(keys)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash([]), 1500)
  }
  const canImport = isNative() && ui.settings.linkImport
  const live = useRef({ name, kind, kindTouched, price, cur, pending, removed })
  live.current = { name, kind, kindTouched, price, cur, pending, removed }
  const started = useRef(false)
  const lastTried = useRef(item?.link?.trim() ?? '')
  const [category, setCategory] = useState<string | undefined>()
  const known = useMemo(() => items.filter((i) => !i.deletedAt && i.id !== item?.id).map((i) => ({ name: i.name, kind: i.kind })), [items, item?.id])

  useEffect(
    () => () => {
      if (pending) URL.revokeObjectURL(pending.preview)
    },
    [pending],
  )

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const img = await processImage(file)
      setPending({ ...img, preview: URL.createObjectURL(new Blob([img.data], { type: img.type })) })
      setRemoved(false)
    } catch {
      ui.toast({ message: t('Bild konnte nicht gelesen werden.'), emoji: '⚠️' })
    } finally {
      setBusy(false)
    }
  }

  const importLink = async (raw: string) => {
    const url = extractUrl(raw) ?? raw.trim()
    if (!url) return
    setLink(url)
    lastTried.current = url
    if (!canImport || importing) return
    const cfg = ui.settings
    setImporting(true)
    setReport({ url, status: 'loading', step: 'Seite wird geladen …', fields: [] })
    try {
      const { product, diag } = await fetchProduct(url)
      setReport((r) => (r ? { ...r, step: 'Daten werden gelesen …' } : r))
      const before = live.current
      const over = cfg.linkOverwrite
      const hadContent = !!(before.name.trim() || before.price.trim() || before.pending || (!before.removed && item?.imageId))
      const fields: FieldReport[] = []
      const flashKeys: string[] = []
      let applied = false

      if (product.name) {
        const n = product.name.slice(0, 140)
        if (over || !before.name.trim()) {
          setName(n)
          setCategory(product.category)
          flashKeys.push('name')
          applied = true
          fields.push({ key: 'name', state: 'ok', text: n })
        } else fields.push({ key: 'name', state: 'kept', text: n })
      } else fields.push({ key: 'name', state: 'none', why: missingWhy('name', product, diag, url) })

      if (!cfg.linkPrice) fields.push({ key: 'price', state: 'off' })
      else if (product.price === undefined) fields.push({ key: 'price', state: 'none', why: missingWhy('price', product, diag, url) })
      else if (!knownCurrency(product.currency ?? before.cur)) fields.push({ key: 'price', state: 'none', why: `Die Währung ${product.currency} wird nicht unterstützt.` })
      else {
        const c = product.currency ?? before.cur
        const text = money(product.price, c)
        if (over || !before.price.trim()) {
          setPrice(product.price.toFixed(2).replace('.', ','))
          setCur(c)
          flashKeys.push('price')
          applied = true
          fields.push({ key: 'price', state: product.priceGuess ? 'guess' : 'ok', text })
        } else fields.push({ key: 'price', state: 'kept', text })
      }

      let imageFailed = false
      if (!cfg.linkImages) fields.push({ key: 'image', state: 'off' })
      else if (!product.image) fields.push({ key: 'image', state: 'none', why: missingWhy('image', product, diag, url) })
      else if (!over && (before.pending || (!before.removed && item?.imageId))) fields.push({ key: 'image', state: 'kept' })
      else {
        setReport((r) => (r ? { ...r, step: 'Bild wird geladen …' } : r))
        const got = await fetchImageBytes(product.image)
        try {
          if (!got) throw new Error('kein Bild')
          const img = await processImage(new Blob([got.data], { type: got.type }))
          setPending({ ...img, preview: URL.createObjectURL(new Blob([img.data], { type: img.type })) })
          setRemoved(false)
          applied = true
          fields.push({ key: 'image', state: 'ok', text: t('übernommen') })
        } catch {
          imageFailed = true
          fields.push({ key: 'image', state: 'none', why: 'Das Bild ließ sich nicht laden.' })
        }
      }

      setReport({ url, status: 'done', fields, source: product.sources.join(', '), tech: describeResult(url, diag, product, imageFailed ? 'Bild nicht ladbar' : '') })
      if (flashKeys.length) doFlash(...flashKeys)
      ui.haptic(applied ? 18 : 30)
      if (applied && hadContent) {
        const undo = () => {
          setName(before.name)
          setKind(before.kind)
          setKindTouched(before.kindTouched)
          setPrice(before.price)
          setCur(before.cur)
          setRemoved(before.removed)
          setPending(before.pending ? { ...before.pending, preview: URL.createObjectURL(new Blob([before.pending.data], { type: before.pending.type })) } : null)
        }
        ui.toast({ message: t('Daten aus dem Link übernommen'), emoji: '🪄', actionLabel: t('Rückgängig'), onAction: undo })
      }
    } catch (e) {
      ui.haptic(50)
      const x = linkFailExtra(e)
      const error = t(linkFailText(e)) + (x.status ? ` (HTTP ${x.status})` : x.why ? ` ${t(x.why)}` : '')
      setReport({ url, status: 'error', fields: [], error, tech: describeResult(url, e instanceof LinkError ? e.diag : undefined, null, error) })
    } finally {
      setImporting(false)
    }
  }

  useEffect(() => {
    if (!initialLink || started.current) return
    started.current = true
    void importLink(initialLink)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fillFromClipboard = async () => {
    if (!canImport) {
      ui.toast({ message: isNative() ? t('Link-Import ist in den Einstellungen aus.') : t('Link-Import geht nur in der Android-App.'), emoji: '🪄' })
      return
    }
    try {
      await importLink(await navigator.clipboard.readText())
    } catch {
      ui.toast({ message: t('Einfügen nicht erlaubt. Halte das Feld gedrückt und wähle „Einfügen“.'), emoji: '📋' })
    }
  }

  const onName = (v: string) => setName(v)

  // Die Art wird erst vorgeschlagen, wenn das Tippen kurz ruht, und nur solange sie nicht von Hand geändert wurde.
  useEffect(() => {
    if (kindTouched || !ui.settings.kindAuto) return
    const id = window.setTimeout(() => {
      const next = name.trim().length >= 3 ? (suggestKind(name, known, category) ?? '') : ''
      if (next && next !== live.current.kind) doFlash('kind')
      setKind(next)
    }, 600)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, known, category, kindTouched, ui.settings.kindAuto])

  // Ein Link, der getippt oder per Tastatur-Zwischenablage eingefügt wird, wird nach kurzer Ruhe automatisch gelesen.
  useEffect(() => {
    if (!canImport || !ui.settings.linkAuto || importing) return
    const url = extractUrl(link)
    if (!url || url === lastTried.current) return
    const clean = cleanUrl(url)
    if (!clean) return
    const u = new URL(clean)
    if (!/\.[a-z]{2,}$/i.test(u.hostname) || (u.pathname.length <= 1 && !u.search)) return
    const id = window.setTimeout(() => void importLink(url), 900)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link, canImport, importing, ui.settings.linkAuto])

  const matches = useMemo(() => {
    if (name.trim().length < 3 && !kind.trim()) return []
    const listName = (id: string) => {
      const l = lists.find((x) => x.id === id)
      return l ? listTitle(l, t) : ''
    }
    return findSimilar(name, kind.trim() || undefined, candidatesFor(owner, items, received, listName, item?.id))
  }, [name, kind, owner, items, received, lists, item?.id, t])

  const kindChips = useMemo(() => kindOptions(known, kind), [known, kind])

  const ownerName = forMe ? '' : (persons.find((p) => p.id === owner)?.name ?? '')

  const save = async () => {
    if (busy) return
    if (!name.trim()) {
      setShake((s) => s + 1)
      ui.haptic(30)
      return
    }
    let imageId = removed ? undefined : item?.imageId
    if (pending) {
      setBusy(true)
      try {
        imageId = await saveImage(pending)
      } catch {
        setBusy(false)
        ui.toast({ message: t('Bild konnte nicht gespeichert werden.'), emoji: '⚠️' })
        return
      }
    }
    const parsed = price.trim() ? Number(price.replace(',', '.')) : undefined
    const data = {
      name: name.trim(),
      kind: kind.trim() || undefined,
      listId,
      link: link.trim() || undefined,
      price: parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined,
      currency: parsed !== undefined && Number.isFinite(parsed) && cur !== 'EUR' ? cur : undefined,
      note: note.trim() || undefined,
      imageId,
      emoji,
      hue,
    }
    if (item) {
      dispatch({ type: 'updateItem', id: item.id, patch: data })
      ui.toast({ message: t('Änderungen übernommen'), emoji: '✨' })
    } else {
      dispatch({ type: 'addItem', item: { id: uid(), owner, bought: false, createdAt: Date.now(), ...data } })
      ui.toast({ message: forMe ? t('Zu deinen Wünschen hinzugefügt') : t('Geschenkidee gespeichert'), emoji })
    }
    ui.haptic(18)
    onClose()
  }

  const remove = () => {
    if (!item) return
    dispatch({ type: 'trashItem', id: item.id })
    ui.toast({ message: t('In den Papierkorb verschoben'), actionLabel: t('Rückgängig'), onAction: () => dispatch({ type: 'restoreItem', id: item.id }) })
    onClose()
  }

  const saveLabel = editing ? t('Speichern') : matches.length ? t('Trotzdem hinzufügen') : t('Hinzufügen')

  return (
    <Sheet
      title={editing ? t('Eintrag bearbeiten') : forMe ? t('Neuer Wunsch') : t('Neue Geschenkidee')}
      subtitle={forMe ? t('Landet auf deiner teilbaren Liste') : t('Bleibt privat und wird nie geteilt')}
      onClose={onClose}
      footer={
        <div className="row row--gap">
          {editing && (
            <button className="btn btn--ghost btn--icon" onClick={remove} aria-label={t('In den Papierkorb')}>
              <Trash2 size={17} />
            </button>
          )}
          <button className="btn btn--primary btn--grow" onClick={save}>
            {saveLabel}
          </button>
        </div>
      }
    >
      <div className="form-cover">
        <motion.div key={emoji + hue} initial={{ scale: 0.8, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 16 }}>
          <Cover emoji={emoji} hue={hue} size={72} radius={22} imageId={removed ? undefined : item?.imageId} src={pending?.preview} />
        </motion.div>
        <div className="form-cover__actions">
          <button type="button" className="chip chip--button" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Camera size={14} /> {busy ? t('Bild wird verkleinert …') : hasImage ? t('Bild ändern') : t('Bild wählen')}
          </button>
          {hasImage && !busy && (
            <button
              type="button"
              className="chip chip--button"
              onClick={() => {
                setPending(null)
                setRemoved(true)
              }}
            >
              <X size={14} /> {t('Bild entfernen')}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      </div>

      {!hasImage && (
        <>
          <div className="swatches swatches--scroll" role="radiogroup" aria-label="Emoji">
            {EMOJIS.map((e) => (
              <button key={e} role="radio" aria-checked={e === emoji} data-active={e === emoji} className="swatch swatch--emoji" onClick={() => setEmoji(e)}>
                {e}
              </button>
            ))}
          </div>
          <div className="swatches" role="radiogroup" aria-label={t('Farbe')}>
            {HUES.map((h) => (
              <button key={h} role="radio" aria-checked={h === hue} aria-label={`${h}`} data-active={h === hue} className="swatch swatch--color" style={{ ['--h' as string]: h }} onClick={() => setHue(h)} />
            ))}
          </div>
        </>
      )}

      <motion.label key={shake} className="field" data-flash={flash.includes('name') || undefined} animate={shake ? { x: [0, -9, 9, -6, 6, 0] } : undefined} transition={{ duration: 0.4 }}>
        <span>{t('Name')}</span>
        <input value={name} onChange={(e) => onName(e.target.value)} placeholder={t('Was soll es sein?')} autoFocus={!editing} data-invalid={shake > 0 && !name.trim()} enterKeyHint="next" />
      </motion.label>

      <AnimatePresence initial={false}>{matches.length > 0 && <MatchWarning key="warn" matches={matches} ownerName={ownerName} />}</AnimatePresence>

      <label className="field" data-flash={flash.includes('kind') || undefined}>
        <span>
          {t('Art')} <em>· {t('erkannt, änderbar')}</em>
        </span>
        <input
          value={kind}
          onChange={(e) => {
            setKind(e.target.value)
            setKindTouched(e.target.value.trim() !== '')
          }}
          placeholder={t('z. B. Grafikkarte')}
        />
        {kindChips.length > 0 && (
          <div className="kindchips" role="listbox" aria-label={t('Arten')}>
            {kindChips.map((k) => (
              <button
                key={k}
                type="button"
                role="option"
                aria-selected={false}
                className="chip chip--button"
                onClick={() => {
                  setKind(k)
                  setKindTouched(true)
                }}
              >
                {k}
              </button>
            ))}
          </div>
        )}
      </label>

      {ownerLists.length > 1 && (
        <div className="field">
          <span>{t('Liste')}</span>
          <div className="listbar listbar--form" role="radiogroup" aria-label={t('Liste')}>
            {ownerLists.map((l) => (
              <button key={l.id} type="button" role="radio" aria-checked={l.id === listId} className="listchip" data-active={l.id === listId} onClick={() => setListId(l.id)}>
                <span aria-hidden>{l.emoji}</span> {listTitle(l, t)}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="field">
        <span>{t('Link')}</span>
        <div className="field__row field__row--link">
          <input
            value={link}
            data-busy={importing || undefined}
            onChange={(e) => {
              setLink(e.target.value)
              if (report && extractUrl(e.target.value) !== report.url) setReport(null)
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text')
              if (canImport && ui.settings.linkAuto && extractUrl(text)) {
                e.preventDefault()
                void importLink(text)
              }
            }}
            placeholder="https://…"
            inputMode="url"
            autoCapitalize="off"
          />
          {importing ? (
            <span className="chip" aria-live="polite">
              <Loader2 size={14} className="spin" /> {t('Lese Seite …')}
            </span>
          ) : link.trim() ? (
            <>
              {canImport && (
                <button type="button" className="chip chip--button" onClick={() => void importLink(link)}>
                  <Wand2 size={14} /> {t('Daten holen')}
                </button>
              )}
              <button type="button" className="chip chip--button" onClick={() => window.open(toHref(link), '_blank', 'noopener,noreferrer')}>
                <ExternalLink size={14} /> {t('Öffnen')}
              </button>
            </>
          ) : (
            <button type="button" className="chip chip--button" onClick={() => void fillFromClipboard()}>
              <Wand2 size={14} /> {t('Ausfüllen')}
            </button>
          )}
        </div>
      </label>

      <AnimatePresence initial={false}>{report && <LinkReport key="rep" report={report} onClose={() => setReport(null)} />}</AnimatePresence>

      <label className="field" data-flash={flash.includes('price') || undefined}>
        <span>{t('Preis')}</span>
        <div className="field__row">
          <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0,00" inputMode="decimal" />
          <select className="cursel" value={cur} onChange={(e) => setCur(e.target.value)} aria-label={t('Währung')}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {price.trim() && cur !== ui.settings.currency && (!hasRate(cur) || !hasRate(ui.settings.currency)) && (
          <small className="hint hint--warn">{t('Für {cur} fehlt ein Kurs. Trag ihn unter „Mehr“ → „Währung und Format“ ein, bis dahin zählt der Betrag ohne Umrechnung.', { cur })}</small>
        )}
      </label>

      <label className="field">
        <span>
          {t('Notiz')}
          {forMe && <em> · {t('optional beim Teilen')}</em>}
        </span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={t('Größe, Farbe, Details …')} />
      </label>

      <AnimatePresence>
        {forMe && (
          <motion.p className="hint" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            {t('Notizen bleiben privat, du entscheidest beim Teilen, ob sie mitgehen.')}
          </motion.p>
        )}
      </AnimatePresence>
    </Sheet>
  )
}
