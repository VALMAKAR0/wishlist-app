import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarPlus, Trash2, X } from 'lucide-react'
import { parseMonthDay, toInputDate, uid } from '../lib/format'
import type { Occasion, Person } from '../lib/types'
import { useStore } from '../state/store'
import { useUI } from '../state/ui'
import { Avatar } from './Primitives'
import { Sheet } from './Sheet'

const HUES = [345, 14, 55, 100, 160, 200, 225, 275]
const LABELS = ['Geburtstag', 'Weihnachten', 'Hochzeitstag', 'Jahrestag', 'Sonstiges']

interface Row {
  id: string
  label: string
  date: string
}

interface Props {
  person?: Person | null
  onClose: () => void
  onDeleted?: () => void
}

export function PersonFormSheet({ person, onClose, onDeleted }: Props) {
  const { dispatch } = useStore()
  const ui = useUI()
  const editing = !!person

  const [name, setName] = useState(person?.name ?? '')
  const [hue, setHue] = useState(person?.hue ?? HUES[Math.floor(Math.random() * HUES.length)])
  const [budget, setBudget] = useState(person ? String(person.budget) : '')
  const [rows, setRows] = useState<Row[]>(
    person?.occasions.map((o) => ({ id: o.id, label: o.label, date: toInputDate(o) })) ?? [{ id: uid(), label: 'Geburtstag', date: '' }],
  )
  const [shake, setShake] = useState(0)

  const patchRow = (id: string, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const save = () => {
    if (!name.trim()) {
      setShake((s) => s + 1)
      ui.haptic(30)
      return
    }
    const occasions: Occasion[] = rows.flatMap((r) => {
      const md = parseMonthDay(r.date)
      return md ? [{ id: r.id, label: r.label, ...md }] : []
    })
    const data = { name: name.trim(), hue, budget: Number(budget.replace(',', '.')) || 0, occasions }
    if (person) {
      dispatch({ type: 'updatePerson', id: person.id, patch: data })
      ui.toast({ message: 'Person aktualisiert', emoji: '✨' })
    } else {
      dispatch({ type: 'addPerson', person: { id: uid(), ...data } })
      ui.toast({ message: `${data.name} wurde hinzugefügt`, emoji: '🎉' })
    }
    ui.haptic(18)
    onClose()
  }

  const remove = () => {
    if (!person) return
    ui.confirm({
      title: `${person.name} löschen?`,
      text: 'Alle Geschenkideen dieser Person werden mitgelöscht. Das lässt sich nicht rückgängig machen.',
      confirmLabel: 'Endgültig löschen',
      tone: 'danger',
      onConfirm: () => {
        dispatch({ type: 'deletePerson', id: person.id })
        ui.toast({ message: `${person.name} gelöscht` })
        onClose()
        onDeleted?.()
      },
    })
  }

  return (
    <Sheet
      title={editing ? 'Person bearbeiten' : 'Neue Person'}
      subtitle="Geschenkideen für diese Person bleiben immer privat"
      onClose={onClose}
      footer={
        <div className="row row--gap">
          {editing && (
            <button className="btn btn--ghost btn--icon" onClick={remove} aria-label="Person löschen">
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
        <motion.div key={hue + name.slice(0, 1)} initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 16 }}>
          <Avatar name={name || '?'} hue={hue} size={88} />
        </motion.div>
      </div>

      <div className="swatches" role="radiogroup" aria-label="Farbe">
        {HUES.map((h) => (
          <button key={h} role="radio" aria-checked={h === hue} aria-label={`Farbton ${h}`} data-active={h === hue} className="swatch swatch--color" style={{ ['--h' as string]: h }} onClick={() => setHue(h)} />
        ))}
      </div>

      <motion.label key={shake} className="field" animate={shake ? { x: [0, -9, 9, -6, 6, 0] } : undefined} transition={{ duration: 0.4 }}>
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Für wen?" autoFocus={!editing} data-invalid={shake > 0 && !name.trim()} />
      </motion.label>

      <label className="field">
        <span>Budget pro Anlass</span>
        <div className="field__row field__row--suffix">
          <input value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0" inputMode="decimal" />
          <b>€</b>
        </div>
      </label>

      <div className="field">
        <span>Anlässe</span>
        <ul className="occ-list">
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <motion.li
                key={r.id}
                className="occ-row"
                initial={{ opacity: 0, height: 0, scale: 0.96 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              >
                <select value={r.label} onChange={(e) => patchRow(r.id, { label: e.target.value })} aria-label="Art des Anlasses">
                  {LABELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
                <input type="date" value={r.date} onChange={(e) => patchRow(r.id, { date: e.target.value })} aria-label="Datum" />
                <button className="icon-btn icon-btn--sm" onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))} aria-label="Anlass entfernen">
                  <X size={16} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <button className="chip chip--button chip--wide" onClick={() => setRows((r) => [...r, { id: uid(), label: 'Geburtstag', date: '' }])}>
          <CalendarPlus size={15} /> Anlass hinzufügen
        </button>
      </div>
    </Sheet>
  )
}
