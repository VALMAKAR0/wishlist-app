import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, Trash2, Wand2 } from 'lucide-react'
import { uid } from '../lib/format'
import type { Item, Owner } from '../lib/types'
import { useStore } from '../state/store'
import { useUI } from '../state/ui'
import { Cover } from './Primitives'
import { Sheet } from './Sheet'

const EMOJIS = ['🎁', '🎧', '📷', '👟', '📚', '🎮', '🧣', '☕', '🪴', '⌚', '🧳', '🕯️', '🍷', '🎨', '🧸', '💄', '🎸', '🧴', '🍫', '🛋️']
const HUES = [14, 45, 100, 150, 190, 230, 275, 320]

interface Props {
  owner: Owner
  item?: Item | null
  onClose: () => void
}

export function ItemFormSheet({ owner, item, onClose }: Props) {
  const { dispatch } = useStore()
  const ui = useUI()
  const editing = !!item
  const forMe = owner === 'me'

  const [name, setName] = useState(item?.name ?? '')
  const [link, setLink] = useState(item?.link ?? '')
  const [price, setPrice] = useState(item?.price !== undefined ? String(item.price).replace('.', ',') : '')
  const [note, setNote] = useState(item?.note ?? '')
  const [emoji, setEmoji] = useState(item?.emoji ?? EMOJIS[0])
  const [hue, setHue] = useState(item?.hue ?? HUES[Math.floor(Math.random() * HUES.length)])
  const [shake, setShake] = useState(0)

  const save = () => {
    if (!name.trim()) {
      setShake((s) => s + 1)
      ui.haptic(30)
      return
    }
    const parsed = price.trim() ? Number(price.replace(',', '.')) : undefined
    const data = {
      name: name.trim(),
      link: link.trim() || undefined,
      price: parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined,
      note: note.trim() || undefined,
      emoji,
      hue,
    }
    if (item) {
      dispatch({ type: 'updateItem', id: item.id, patch: data })
      ui.toast({ message: 'Änderungen übernommen', emoji: '✨' })
    } else {
      dispatch({ type: 'addItem', item: { id: uid(), owner, bought: false, createdAt: Date.now(), ...data } })
      ui.toast({ message: forMe ? 'Zu deinen Wünschen hinzugefügt' : 'Geschenkidee gespeichert', emoji })
    }
    ui.haptic(18)
    onClose()
  }

  const remove = () => {
    if (!item) return
    dispatch({ type: 'trashItem', id: item.id })
    ui.toast({ message: 'In den Papierkorb verschoben', actionLabel: 'Rückgängig', onAction: () => dispatch({ type: 'restoreItem', id: item.id }) })
    onClose()
  }

  return (
    <Sheet
      title={editing ? 'Eintrag bearbeiten' : forMe ? 'Neuer Wunsch' : 'Neue Geschenkidee'}
      subtitle={forMe ? 'Landet auf deiner teilbaren Liste' : 'Bleibt privat und wird nie geteilt'}
      onClose={onClose}
      footer={
        <div className="row row--gap">
          {editing && (
            <button className="btn btn--ghost btn--icon" onClick={remove} aria-label="In den Papierkorb">
              <Trash2 size={18} />
            </button>
          )}
          <button className="btn btn--primary btn--grow" onClick={save}>
            {editing ? 'Speichern' : 'Hinzufügen'}
          </button>
        </div>
      }
    >
      <div className="form-cover">
        <motion.div key={emoji + hue} initial={{ scale: 0.8, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 16 }}>
          <Cover emoji={emoji} hue={hue} size={72} radius={22} />
        </motion.div>
        <button className="chip chip--button" onClick={() => ui.planned('image-pick')}>
          <Camera size={14} /> Bild wählen
        </button>
      </div>

      <div className="swatches swatches--scroll" role="radiogroup" aria-label="Emoji">
        {EMOJIS.map((e) => (
          <button key={e} role="radio" aria-checked={e === emoji} data-active={e === emoji} className="swatch swatch--emoji" onClick={() => setEmoji(e)}>
            {e}
          </button>
        ))}
      </div>
      <div className="swatches" role="radiogroup" aria-label="Farbe">
        {HUES.map((h) => (
          <button
            key={h}
            role="radio"
            aria-checked={h === hue}
            aria-label={`Farbton ${h}`}
            data-active={h === hue}
            className="swatch swatch--color"
            style={{ ['--h' as string]: h }}
            onClick={() => setHue(h)}
          />
        ))}
      </div>

      <motion.label key={shake} className="field" animate={shake ? { x: [0, -9, 9, -6, 6, 0] } : undefined} transition={{ duration: 0.4 }}>
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Was soll es sein?" autoFocus={!editing} data-invalid={shake > 0 && !name.trim()} enterKeyHint="next" />
      </motion.label>

      <label className="field">
        <span>Link</span>
        <div className="field__row">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" inputMode="url" autoCapitalize="off" />
          <button type="button" className="chip chip--button" onClick={() => ui.planned('link-import')}>
            <Wand2 size={14} /> Ausfüllen
          </button>
        </div>
      </label>

      <label className="field">
        <span>Preis</span>
        <div className="field__row field__row--suffix">
          <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0,00" inputMode="decimal" />
          <b>€</b>
        </div>
      </label>

      <label className="field">
        <span>Notiz{forMe && <em> · optional beim Teilen</em>}</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Größe, Farbe, Details …" />
      </label>

      <AnimatePresence>
        {forMe && (
          <motion.p className="hint" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            Notizen bleiben privat, du entscheidest beim Teilen, ob sie mitgehen.
          </motion.p>
        )}
      </AnimatePresence>
    </Sheet>
  )
}
