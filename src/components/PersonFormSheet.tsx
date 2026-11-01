import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, Trash2, X } from 'lucide-react'
import { defaultList } from '../lib/demoData'
import { parseMonthDay, toInputDate, uid } from '../lib/format'
import { OCCASION_PRESETS, occasionEmoji, presetOf } from '../lib/occasions'
import type { Occasion, Person } from '../lib/types'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'
import { DateField } from './DateField'
import { Avatar } from './Primitives'
import { Sheet } from './Sheet'

const HUES = [345, 14, 55, 100, 160, 200, 225, 275]

interface Row {
  id: string
  label: string
  date: string
  /** Eigener Anlass: Der Name ist frei wählbar. */
  custom: boolean
}

const toRow = (o: Occasion): Row => ({ id: o.id, label: o.label, date: toInputDate(o), custom: !presetOf(o.label) })

interface Props {
  person?: Person | null
  onClose: () => void
  onDeleted?: () => void
}

export function PersonFormSheet({ person, onClose, onDeleted }: Props) {
  const t = useT()
  const { dispatch } = useStore()
  const ui = useUI()
  const editing = !!person

  const [name, setName] = useState(person?.name ?? '')
  const [hue, setHue] = useState(person?.hue ?? HUES[Math.floor(Math.random() * HUES.length)])
  const [budget, setBudget] = useState(person ? String(person.budget) : '')
  const [rows, setRows] = useState<Row[]>(
    person?.occasions.map(toRow) ?? [{ id: uid(), label: 'Geburtstag', date: '', custom: false }],
  )
  const [shake, setShake] = useState(0)

  const addPreset = (label: string) => {
    const md = presetOf(label)?.date?.()
    const date = md ? toInputDate(md) : ''
    setRows((r) => [...r, { id: uid(), label, date, custom: false }])
  }

  const patchRow = (id: string, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const save = () => {
    if (!name.trim()) {
      setShake((s) => s + 1)
      ui.haptic(30)
      return
    }
    const occasions: Occasion[] = rows.flatMap((r) => {
      const md = parseMonthDay(r.date)
      return md ? [{ id: r.id, label: r.label.trim() || 'Sonstiges', ...md }] : []
    })
    const data = { name: name.trim(), hue, budget: Number(budget.replace(',', '.')) || 0, occasions }
    if (person) {
      dispatch({ type: 'updatePerson', id: person.id, patch: data })
      ui.toast({ message: t('Person aktualisiert'), emoji: '✨' })
    } else {
      const id = uid()
      dispatch({ type: 'addPerson', person: { id, ...data }, list: { ...defaultList(id, uid()), hue } })
      ui.toast({ message: t('{name} wurde hinzugefügt', { name: data.name }), emoji: '🎉' })
    }
    ui.haptic(18)
    onClose()
  }

  const remove = () => {
    if (!person) return
    ui.confirm({
      title: t('{name} löschen?', { name: person.name }),
      text: t('Alle Geschenkideen und Listen dieser Person werden mitgelöscht. Das lässt sich nicht rückgängig machen.'),
      confirmLabel: t('Endgültig löschen'),
      tone: 'danger',
      onConfirm: () => {
        dispatch({ type: 'deletePerson', id: person.id })
        ui.toast({ message: t('{name} gelöscht', { name: person.name }) })
        onClose()
        onDeleted?.()
      },
    })
  }

  return (
    <Sheet
      title={editing ? t('Person bearbeiten') : t('Neue Person')}
      subtitle={t('Geschenkideen für diese Person bleiben immer privat')}
      onClose={onClose}
      footer={
        <div className="row row--gap">
          {editing && (
            <button className="btn btn--ghost btn--icon" onClick={remove} aria-label={t('Person löschen')}>
              <Trash2 size={17} />
            </button>
          )}
          <button className="btn btn--primary btn--grow" onClick={save}>
            {editing ? t('Speichern') : t('Hinzufügen')}
          </button>
        </div>
      }
    >
      <div className="form-cover">
        <motion.div key={hue + name.slice(0, 1)} initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 16 }}>
          <Avatar name={name || '?'} hue={hue} size={64} />
        </motion.div>
      </div>

      <div className="swatches" role="radiogroup" aria-label={t('Farbe')}>
        {HUES.map((h) => (
          <button key={h} role="radio" aria-checked={h === hue} aria-label={`${h}`} data-active={h === hue} className="swatch swatch--color" style={{ ['--h' as string]: h }} onClick={() => setHue(h)} />
        ))}
      </div>

      <motion.label key={shake} className="field" animate={shake ? { x: [0, -9, 9, -6, 6, 0] } : undefined} transition={{ duration: 0.4 }}>
        <span>{t('Name')}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Für wen?')} autoFocus={!editing} data-invalid={shake > 0 && !name.trim()} />
      </motion.label>

      <label className="field">
        <span>{t('Budget pro Anlass')}</span>
        <div className="field__row field__row--suffix">
          <input value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0" inputMode="decimal" />
          <b>€</b>
        </div>
      </label>

      <div className="field">
        <span>{t('Anlässe')}</span>
        <ul className="occ-list">
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <motion.li
                key={r.id}
                className="occ-card"
                initial={{ opacity: 0, height: 0, scale: 0.96 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              >
                <div className="occ-card__head">
                  <span className="occ-card__emoji" aria-hidden>
                    {occasionEmoji(r.label)}
                  </span>
                  {r.custom ? (
                    <input className="occ-card__input" value={r.label} onChange={(e) => patchRow(r.id, { label: e.target.value })} placeholder={t('Name des Anlasses')} aria-label={t('Name des Anlasses')} autoFocus={!r.date && !r.label} />
                  ) : (
                    <strong className="occ-card__name">{t(r.label)}</strong>
                  )}
                  <button className="icon-btn icon-btn--sm" onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))} aria-label={t('Anlass entfernen')}>
                    <X size={16} />
                  </button>
                </div>
                <DateField value={r.date} onChange={(v) => patchRow(r.id, { date: v })} label={t('Datum')} recurring />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <div className="occ-presets">
          {OCCASION_PRESETS.filter((p) => !rows.some((r) => r.label === p.label)).map((p) => (
            <button key={p.label} className="chip chip--button" onClick={() => addPreset(p.label)}>
              <span aria-hidden>{p.emoji}</span> {t(p.label)}
            </button>
          ))}
          <button className="chip chip--button" onClick={() => setRows((r) => [...r, { id: uid(), label: '', date: '', custom: true }])}>
            <Plus size={14} /> {t('Eigener Anlass')}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
