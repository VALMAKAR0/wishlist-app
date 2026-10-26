import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, ExternalLink, Trash2, Wand2 } from 'lucide-react'
import { toHref, uid } from '../lib/format'
import { listTitle } from '../lib/lists'
import { candidatesFor, findSimilar, suggestKind } from '../lib/match'
import type { Item, Owner } from '../lib/types'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'
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
  onClose: () => void
}

export function ItemFormSheet({ owner, item, listId: initialList, onClose }: Props) {
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
  const [note, setNote] = useState(item?.note ?? '')
  const [emoji, setEmoji] = useState(item?.emoji ?? EMOJIS[0])
  const [hue, setHue] = useState(item?.hue ?? HUES[Math.floor(Math.random() * HUES.length)])
  const [shake, setShake] = useState(0)

  const onName = (v: string) => {
    setName(v)
    // Die Art wird automatisch erkannt, solange sie nicht von Hand geändert wurde.
    if (!kindTouched) setKind(suggestKind(v) ?? '')
  }

  const matches = useMemo(() => {
    if (name.trim().length < 3 && !kind.trim()) return []
    const listName = (id: string) => {
      const l = lists.find((x) => x.id === id)
      return l ? listTitle(l, t) : ''
    }
    return findSimilar(name, kind.trim() || undefined, candidatesFor(owner, items, received, listName, item?.id))
  }, [name, kind, owner, items, received, lists, item?.id, t])

  const ownerName = forMe ? '' : (persons.find((p) => p.id === owner)?.name ?? '')

  const save = () => {
    if (!name.trim()) {
      setShake((s) => s + 1)
      ui.haptic(30)
      return
    }
    const parsed = price.trim() ? Number(price.replace(',', '.')) : undefined
    const data = {
      name: name.trim(),
      kind: kind.trim() || undefined,
      listId,
      link: link.trim() || undefined,
      price: parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined,
      note: note.trim() || undefined,
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
          <Cover emoji={emoji} hue={hue} size={72} radius={22} />
        </motion.div>
        <button className="chip chip--button" onClick={() => ui.planned('image-pick')}>
          <Camera size={14} /> {t('Bild wählen')}
        </button>
      </div>

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

      <motion.label key={shake} className="field" animate={shake ? { x: [0, -9, 9, -6, 6, 0] } : undefined} transition={{ duration: 0.4 }}>
        <span>{t('Name')}</span>
        <input value={name} onChange={(e) => onName(e.target.value)} placeholder={t('Was soll es sein?')} autoFocus={!editing} data-invalid={shake > 0 && !name.trim()} enterKeyHint="next" />
      </motion.label>

      <AnimatePresence initial={false}>{matches.length > 0 && <MatchWarning key="warn" matches={matches} ownerName={ownerName} />}</AnimatePresence>

      <label className="field">
        <span>
          {t('Art')} <em>· {t('erkannt, änderbar')}</em>
        </span>
        <input
          value={kind}
          onChange={(e) => {
            setKind(e.target.value)
            setKindTouched(true)
          }}
          placeholder={t('z. B. Grafikkarte')}
        />
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
        <div className="field__row">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" inputMode="url" autoCapitalize="off" />
          {link.trim() ? (
            <button type="button" className="chip chip--button" onClick={() => window.open(toHref(link), '_blank', 'noopener,noreferrer')}>
              <ExternalLink size={14} /> {t('Öffnen')}
            </button>
          ) : (
            <button type="button" className="chip chip--button" onClick={() => ui.planned('link-import')}>
              <Wand2 size={14} /> {t('Ausfüllen')}
            </button>
          )}
        </div>
      </label>

      <label className="field">
        <span>{t('Preis')}</span>
        <div className="field__row field__row--suffix">
          <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0,00" inputMode="decimal" />
          <b>€</b>
        </div>
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
