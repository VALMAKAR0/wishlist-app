import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, ChevronDown, ClipboardPaste, ExternalLink, Loader2, Shapes, Trash2, Wand2, X } from 'lucide-react'
import { isNative } from '../lib/backupFiles'
import { lastUrl, readClipboard } from '../lib/clipboard'
import { ICONS, iconFor, iconValue, pickGift } from '../lib/icons'
import { hasRate, money, toHref, uid } from '../lib/format'
import { fetchRates } from '../lib/rates'
import { processImage, saveImage } from '../lib/images'
import { cleanName, cleanUrl, describeResult, extractUrl, fetchImageBytes, fetchProduct, knownCurrency, linkFailExtra, linkFailText, LinkError, missingWhy, spotOf, tidyName, type FieldReport, type PriceCandidate } from '../lib/linkImport'
import { listTitle } from '../lib/lists'
import { candidatesFor, findSimilar, kindOptions, suggestKind } from '../lib/match'
import { priceFieldsOnSave } from '../lib/priceCheck'
import type { Item, Owner, PriceSpot, PriceState, Prio } from '../lib/types'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'
import { LinkReport, type Report } from './LinkReport'
import { MatchWarning } from './MatchCard'
import { PriceChooser } from './PriceChooser'
import { Presence } from './Presence'
import { PriceInput } from './PriceInput'
import { PriceSearch } from './PriceSearch'
import { parsePriceInput, priceText } from '../lib/priceInput'
import { PriceWatch } from './PriceWatch'
import { ShopList } from './ShopList'
import { Combo, Cover, Dropdown, ListMark, PrioPicker } from './Primitives'
import { CurrencyButton, CurrencyPanel } from './CurrencyPicker'
import { Sheet } from './Sheet'

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
  const [price, setPrice] = useState(item?.price !== undefined ? priceText(item.price) : '')
  const [cur, setCur] = useState(item ? (item.currency ?? 'EUR') : ui.settings.currency)
  const [curOpen, setCurOpen] = useState(false)
  const [note, setNote] = useState(item?.note ?? '')
  const [prio, setPrio] = useState<Prio | undefined>(item?.prio)
  const [emoji, setEmoji] = useState(item?.emoji ?? pickGift())
  const giftRef = useRef(emoji.startsWith('ic:gift') ? emoji : pickGift())
  const [iconTouched, setIconTouched] = useState(!!item?.emoji && item.emoji !== '🎁' && !item.emoji.startsWith('ic:gift'))
  const [panel, setPanel] = useState(false)
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
  const importedName = useRef('')
  const priceFrom = useRef<PriceState | null>(null)
  const spotRef = useRef<PriceSpot | undefined>(undefined)
  const [chooser, setChooser] = useState(false)
  const stored = item ? (items.find((i) => i.id === item.id) ?? item) : undefined
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
        const n = tidyName(product.name, cfg.linkShortName).slice(0, 140)
        const full = cleanName(product.name)
        const typed = before.name.trim() !== '' && before.name !== importedName.current
        if (typed && (cfg.linkKeepName || !over)) fields.push({ key: 'name', state: 'kept', text: before.name, alt: n })
        else {
          importedName.current = n
          setName(n)
          setCategory(product.category)
          flashKeys.push('name')
          applied = true
          fields.push({ key: 'name', state: 'ok', text: n, alt: n !== full ? full : undefined })
        }
      } else fields.push({ key: 'name', state: 'none', why: missingWhy('name', product, diag, url) })

      if (!cfg.linkPrice) fields.push({ key: 'price', state: 'off' })
      else if (product.price === undefined) fields.push({ key: 'price', state: 'none', why: missingWhy('price', product, diag, url), pick: (product.candidates?.length ?? 0) > 0 })
      else if (!knownCurrency(product.currency ?? before.cur)) fields.push({ key: 'price', state: 'none', why: `Die Währung ${product.currency} wird nicht unterstützt.` })
      else {
        const c = product.currency ?? before.cur
        const text = money(product.price, c)
        if (over || !before.price.trim()) {
          setPrice(priceText(product.price, true))
          priceFrom.current = product.priceGuess ? 'guess' : 'sure'
          spotRef.current = undefined
          setCur(c)
          flashKeys.push('price')
          applied = true
          fields.push({ key: 'price', state: product.priceGuess ? 'guess' : 'ok', text, pick: !!product.priceGuess && (product.candidates?.length ?? 0) >= 2 })
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
          fields.push({ key: 'image', state: product.imageGuess ? 'guess' : 'ok', text: t('übernommen') })
        } catch {
          imageFailed = true
          fields.push({ key: 'image', state: 'none', why: 'Das Bild ließ sich nicht laden.' })
        }
      }

      setReport({ url, status: 'done', fields, candidates: product.candidates, source: product.sources.join(', '), tech: describeResult(url, diag, product, imageFailed ? 'Bild nicht ladbar' : '') })
      if (flashKeys.length) doFlash(...flashKeys)
      ui.haptic(applied ? 18 : 30)
      if (applied && hadContent) {
        const undo = () => {
          setName(before.name)
          setKind(before.kind)
          setKindTouched(before.kindTouched)
          setPrice(before.price)
          priceFrom.current = null
          spotRef.current = undefined
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
    let text = ''
    try {
      text = await readClipboard()
    } catch {
      ui.toast({ message: t('Einfügen nicht erlaubt. Halte das Feld gedrückt und wähle „Einfügen“.'), emoji: '📋' })
      return
    }
    const url = lastUrl(text)
    if (!url) {
      ui.toast({ message: t('In der Zwischenablage steckt kein Link.'), emoji: '📋' })
      return
    }
    await importLink(url)
  }

  const useImportedName = (n: string) => {
    importedName.current = n
    setName(n)
    doFlash('name')
    setReport((r) => (r ? { ...r, fields: r.fields.map((f) => (f.key === 'name' ? { key: 'name', state: 'ok', text: n } : f)) } : r))
  }

  const pickPrice = (c: PriceCandidate) => {
    setPrice(priceText(c.price))
    setCur(c.currency)
    priceFrom.current = 'sure'
    spotRef.current = spotOf(c)
    setChooser(false)
    doFlash('price')
    setReport((r) => (r ? { ...r, fields: r.fields.map((x) => (x.key === 'price' ? { key: 'price', state: 'ok', text: money(c.price, c.currency) } : x)) } : r))
    ui.haptic(18)
  }

  const onName = (v: string) => setName(v)

  // Währung wechseln: der Preis im Feld wird umgerechnet. Fehlen Kurse oder sind sie über einen Tag alt, werden sie kurz geladen.
  const changeCur = async (next: string) => {
    setCurOpen(false)
    if (next === cur) return
    const prevCur = cur
    const prevPrice = price
    const n = parsePriceInput(price)
    setCur(next)
    if (n === undefined) return
    let rates = ui.settings.rates
    const missing = (c: string) => c !== 'EUR' && !((rates[c] ?? 0) > 0)
    let waited = false
    if (missing(prevCur) || missing(next) || Date.now() - ui.settings.ratesAt > 86_400_000) {
      waited = true
      try {
        rates = await fetchRates()
        ui.setSettings({ rates, ratesAt: Date.now() })
      } catch {
        /* weiter mit den vorhandenen Kursen */
      }
    }
    if (missing(prevCur) || missing(next)) return
    if (waited && (live.current.cur !== next || live.current.price !== prevPrice)) return
    const rate = (c: string) => (c === 'EUR' ? 1 : (rates[c] as number))
    const raw = (n / rate(prevCur)) * rate(next)
    const v = next === 'JPY' ? Math.round(raw) : Math.round(raw * 100) / 100
    priceFrom.current = null
    setPrice(priceText(v, next !== 'JPY'))
    doFlash('price')
    ui.haptic(12)
    ui.toast({
      message: t('Umgerechnet: {a} → {b}', { a: money(n, prevCur), b: money(v, next) }),
      emoji: '💱',
      actionLabel: t('Rückgängig'),
      onAction: () => {
        setCur(prevCur)
        setPrice(prevPrice)
      },
    })
  }

  // Die Art wird erst vorgeschlagen, wenn das Tippen kurz ruht, und nur solange sie nicht von Hand geändert wurde.
  useEffect(() => {
    if (kindTouched || !ui.settings.kindAuto) return
    const id = window.setTimeout(() => {
      const next = name.trim().length >= 3 ? (suggestKind(name, known, category, link) ?? '') : ''
      if (next && next !== live.current.kind) doFlash('kind')
      setKind(next)
    }, 600)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, known, category, link, kindTouched, ui.settings.kindAuto])

  // Das Symbol passt sich Name und Art an, bis es von Hand gewählt wird.
  useEffect(() => {
    if (iconTouched) return
    const id = window.setTimeout(() => setEmoji(iconFor(name, kind) ?? giftRef.current), 250)
    return () => window.clearTimeout(id)
  }, [name, kind, iconTouched])

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
    if (name.trim().length < 3) return []
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
    const parsed = parsePriceInput(price)
    const data = {
      name: name.trim(),
      kind: kind.trim() || undefined,
      listId,
      link: link.trim() || undefined,
      price: parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined,
      currency: parsed !== undefined && Number.isFinite(parsed) && cur !== 'EUR' ? cur : undefined,
      note: note.trim() || undefined,
      prio,
      imageId,
      emoji,
      hue,
    }
    const priceFields = priceFieldsOnSave(stored, data.price, cur, priceFrom.current, Date.now(), spotRef.current)
    if (item) {
      dispatch({ type: 'updateItem', id: item.id, patch: { ...data, ...priceFields } })
    } else {
      dispatch({ type: 'addItem', item: { id: uid(), owner, bought: false, createdAt: Date.now(), ...data, ...priceFields } })
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
      expandable
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
      <div className="fhero">
        <motion.div key={emoji + hue} initial={{ scale: 0.85, rotate: -5 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }}>
          <Cover emoji={emoji} hue={hue} size={84} radius={26} imageId={removed ? undefined : item?.imageId} src={pending?.preview} />
        </motion.div>
        <div className="fhero__side">
          <button type="button" className="fbtn" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Camera size={16} /> {busy ? t('Bild wird verkleinert …') : hasImage ? t('Bild ändern') : t('Bild wählen')}
          </button>
          {hasImage ? (
            !busy && (
              <button
                type="button"
                className="fbtn"
                onClick={() => {
                  setPending(null)
                  setRemoved(true)
                }}
              >
                <X size={16} /> {t('Bild entfernen')}
              </button>
            )
          ) : (
            <button type="button" className="fbtn" aria-expanded={panel} data-testid="icon-toggle" onClick={() => setPanel((o) => !o)}>
              <Shapes size={16} /> {t('Symbol und Farbe')}
              <ChevronDown size={15} className="fbtn__chev" data-open={panel || undefined} />
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      </div>

      <AnimatePresence initial={false}>
        {panel && !hasImage && (
          <motion.div key="ipanel" className="ipanel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}>
            <div className="ipanel__in">
              <div className="ipanel__grid" role="radiogroup" aria-label={t('Symbol')}>
                {ICONS.map((ic) => {
                  const v = iconValue(ic.id)
                  return (
                    <button
                      key={ic.id}
                      type="button"
                      role="radio"
                      aria-checked={v === emoji}
                      aria-label={t(ic.label)}
                      title={t(ic.label)}
                      data-active={v === emoji}
                      className="ipick"
                      onClick={() => {
                        setEmoji(v)
                        setIconTouched(true)
                        ui.haptic(8)
                      }}
                    >
                      <Cover emoji={v} hue={hue} size={40} radius={13} />
                    </button>
                  )
                })}
              </div>
              <div className="ipanel__foot">
                <div className="swatches swatches--left" role="radiogroup" aria-label={t('Farbe')}>
                  {HUES.map((h) => (
                    <button key={h} type="button" role="radio" aria-checked={h === hue} aria-label={`${h}`} data-active={h === hue} className="swatch swatch--color" style={{ ['--h' as string]: h }} onClick={() => setHue(h)} />
                  ))}
                </div>
                {iconTouched && (
                  <button type="button" className="linkbtn" onClick={() => setIconTouched(false)}>
                    {t('Automatisch wählen')}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="fsec">
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
              <button type="button" className="chip chip--button chip--strong" data-testid="link-paste" onClick={() => void fillFromClipboard()}>
                <ClipboardPaste size={14} /> {t('Einfügen')}
              </button>
            )}
          </div>
        </label>

        <AnimatePresence initial={false}>{report && <LinkReport key="rep" report={report} onClose={() => setReport(null)} onUseName={useImportedName} onPickPrice={() => setChooser(true)} />}</AnimatePresence>

        <motion.label key={shake} className="field" data-loading={importing || undefined} data-flash={flash.includes('name') || undefined} animate={shake ? { x: [0, -9, 9, -6, 6, 0] } : undefined} transition={{ duration: 0.4 }}>
          <span>{t('Name')}</span>
          <input value={name} onChange={(e) => onName(e.target.value)} placeholder={t('Was soll es sein?')} data-invalid={shake > 0 && !name.trim()} enterKeyHint="next" />
        </motion.label>

        <AnimatePresence initial={false}>{matches.length > 0 && <MatchWarning key="warn" matches={matches} ownerName={ownerName} />}</AnimatePresence>

        <label className="field" data-loading={importing || undefined} data-flash={flash.includes('price') || undefined}>
          <span>{t('Preis')}</span>
          <div className="field__row">
            <PriceInput value={price} onChange={(v) => { priceFrom.current = null; setPrice(v) }} placeholder="0,00" />
            <CurrencyButton value={cur} open={curOpen} onToggle={() => setCurOpen((o) => !o)} />
          </div>
          <CurrencyPanel open={curOpen} value={cur} onPick={changeCur} onClose={() => setCurOpen(false)} />
          {price.trim() && cur !== ui.settings.currency && (!hasRate(cur) || !hasRate(ui.settings.currency)) && (
            <small className="hint hint--warn">{t('Für {cur} fehlt ein Kurs. Trag ihn unter „Mehr“ → „Währung und Format“ ein, bis dahin zählt der Betrag ohne Umrechnung.', { cur })}</small>
          )}
        </label>

        {ui.settings.priceSearch && <PriceSearch name={name} />}
        <Presence show={chooser}>{chooser && <PriceChooser candidates={report?.candidates ?? []} current={parsePriceInput(price) || undefined} spot={spotRef.current ?? stored?.priceSpot} cur={cur} onPick={pickPrice} onClose={() => setChooser(false)} />}</Presence>

        {stored && ui.settings.priceWatch && (
          <PriceWatch
            item={stored}
            link={link}
            onPrice={(p, c) => {
              priceFrom.current = null
              setPrice(priceText(p))
              setCur(c)
            }}
          />
        )}

        {stored && !!link.trim() && (
          <ShopList
            item={stored}
            link={link}
            onPromoted={(l, p, c) => {
              priceFrom.current = null
              setLink(l)
              setPrice(priceText(p))
              setCur(c)
            }}
          />
        )}
      </section>

      <section className="fsec">
        <label className="field" data-flash={flash.includes('kind') || undefined}>
          <span>
            {t('Art')} {!kindTouched && kind.trim() !== '' && <em>· {t('erkannt, änderbar')}</em>}
            {kindTouched && ui.settings.kindAuto && (
              <button type="button" className="linkbtn" onClick={() => setKindTouched(false)}>
                {t('Neu erkennen')}
              </button>
            )}
          </span>
          <Combo
            value={kind}
            options={kindChips}
            label={t('Arten')}
            testId="kind-drop"
            placeholder={t('z. B. Grafikkarte')}
            onChange={(v) => {
              setKind(v)
              setKindTouched(true)
            }}
          />
        </label>

        <div className="field">
          <span>
            {forMe ? t('Wie wichtig?') : t('Wie gut passt es?')} <em>· {t('optional')}</em>
          </span>
          <PrioPicker
            value={prio}
            onChange={(v) => {
              setPrio(v)
              ui.haptic(10)
            }}
            labels={forMe ? [t('Wie wichtig?'), t('Wäre schön'), t('Wünsche ich mir sehr'), t('Am allerliebsten')] : [t('Wie gut passt es?'), t('Gute Idee'), t('Sehr gute Idee'), t('Volltreffer')]}
          />
        </div>

        {ownerLists.length > 1 && (
          <div className="field">
            <span>{t('Liste')}</span>
            <Dropdown
              value={listId}
              label={t('Liste')}
              testId="list-drop"
              onChange={setListId}
              options={ownerLists.map((l) => ({ value: l.id, label: listTitle(l, t), icon: <ListMark icon={l.emoji} hue={l.hue} size={26} /> }))}
            />
          </div>
        )}

        <label className="field">
          <span>
            {t('Notiz')}
            {forMe && <em> · {t('optional beim Teilen')}</em>}
          </span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={t('Größe, Farbe, Details …')} />
        </label>

        {forMe && <p className="hint">{t('Notizen bleiben privat, du entscheidest beim Teilen, ob sie mitgehen.')}</p>}
      </section>
    </Sheet>
  )
}
