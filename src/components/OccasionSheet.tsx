import { useState } from 'react'
import { motion } from 'motion/react'
import { Trash2 } from 'lucide-react'
import { parseMonthDay, toInputDate, uid } from '../lib/format'
import { listTitle } from '../lib/lists'
import { OCCASION_PRESETS, occasionEmoji, presetOf } from '../lib/occasions'
import type { Occasion, Person } from '../lib/types'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'
import { DateField } from './DateField'
import { Sheet } from './Sheet'

interface Props {
  person: Person
  /** Fehlt der Anlass, wird ein neuer angelegt. */
  occasion?: Occasion | null
  onClose: () => void
}

/** Anlass einer Person anlegen, ändern oder löschen. Vorgaben schlagen ein Datum vor, das änderbar bleibt. */
export function OccasionSheet({ person, occasion, onClose }: Props) {
  const t = useT()
  const ui = useUI()
  const { dispatch, lists: allLists } = useStore()
  const editing = !!occasion
  const [id] = useState(() => occasion?.id ?? uid())
  const lists = allLists.filter((l) => l.owner === person.id)
  const [linked, setLinked] = useState<string[]>(() => lists.filter((l) => l.occasionId === occasion?.id).map((l) => l.id))
  const [name, setName] = useState(occasion ? (presetOf(occasion.label) ? t(occasion.label) : occasion.label) : '')
  const [date, setDate] = useState(occasion ? toInputDate(occasion) : '')
  const [shake, setShake] = useState(0)
  const preset = presetOf(name) ?? OCCASION_PRESETS.find((p) => t(p.label) === name.trim())

  const use = (label: string) => {
    const p = presetOf(label)
    setName(t(label))
    const md = p?.date?.()
    if (md) setDate(toInputDate(md))
  }

  const save = () => {
    const md = parseMonthDay(date)
    const typed = name.trim()
    if (!typed || !md) {
      setShake((s) => s + 1)
      ui.haptic(30)
      return
    }
    const label = OCCASION_PRESETS.find((p) => t(p.label) === typed)?.label ?? typed
    const next: Occasion = { id, label, ...md }
    const occasions = occasion ? person.occasions.map((o) => (o.id === occasion.id ? next : o)) : [...person.occasions, next]
    dispatch({ type: 'updatePerson', id: person.id, patch: { occasions } })
    for (const l of lists) {
      const want = linked.includes(l.id)
      if (want && l.occasionId !== id) dispatch({ type: 'updateList', id: l.id, patch: { occasionId: id } })
      if (!want && l.occasionId === id) dispatch({ type: 'updateList', id: l.id, patch: { occasionId: undefined } })
    }
    ui.toast({ message: editing ? t('Anlass aktualisiert') : t('Anlass hinzugefügt'), emoji: occasionEmoji(label) })
    ui.haptic(18)
    onClose()
  }

  const remove = () => {
    if (!occasion) return
    const before = person.occasions
    dispatch({ type: 'updatePerson', id: person.id, patch: { occasions: before.filter((o) => o.id !== occasion.id) } })
    ui.toast({
      message: t('„{name}“ entfernt', { name: presetOf(occasion.label) ? t(occasion.label) : occasion.label }),
      actionLabel: t('Rückgängig'),
      onAction: () => dispatch({ type: 'updatePerson', id: person.id, patch: { occasions: before } }),
    })
    onClose()
  }

  return (
    <Sheet
      title={editing ? t('Anlass bearbeiten') : t('Neuer Anlass')}
      subtitle={person.name}
      onClose={onClose}
      footer={
        <div className="row row--gap">
          {editing && (
            <button className="btn btn--ghost btn--icon" onClick={remove} aria-label={t('Anlass entfernen')}>
              <Trash2 size={17} />
            </button>
          )}
          <button className="btn btn--primary btn--grow" onClick={save}>
            {editing ? t('Speichern') : t('Hinzufügen')}
          </button>
        </div>
      }
    >
      <div className="field">
        <span>{t('Vorlage')}</span>
        <div className="occ-presets occ-presets--top">
          {OCCASION_PRESETS.map((p) => (
            <button key={p.label} className="listchip" data-active={preset?.label === p.label} onClick={() => use(p.label)}>
              <span aria-hidden>{p.emoji}</span> {t(p.label)}
            </button>
          ))}
        </div>
      </div>
      <motion.label key={`n${shake}`} className="field" animate={shake ? { x: [0, -9, 9, -6, 6, 0] } : undefined} transition={{ duration: 0.4 }}>
        <span>{t('Name')}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Name des Anlasses')} autoFocus={!editing} data-invalid={shake > 0 && !name.trim()} />
      </motion.label>
      <div className="field">
        <span>{t('Datum')}</span>
        <DateField value={date} onChange={setDate} label={t('Datum')} recurring />
        {shake > 0 && !date && <small className="hint hint--bad">{t('Ein Anlass braucht ein Datum.')}</small>}
      </div>
      <div className="field">
        <span>{t('Verknüpfte Listen')}</span>
        <div className="listbar listbar--form" role="group" aria-label={t('Verknüpfte Listen')}>
          {lists.map((l) => {
            const on = linked.includes(l.id)
            const other = !on && !!l.occasionId && l.occasionId !== id && person.occasions.some((o) => o.id === l.occasionId)
            return (
              <button
                key={l.id}
                className="listchip"
                aria-pressed={on}
                data-active={on}
                data-dim={other}
                onClick={() => setLinked((cur) => (on ? cur.filter((x) => x !== l.id) : [...cur, l.id]))}
              >
                <span aria-hidden>{l.emoji}</span> {listTitle(l, t)}
              </button>
            )
          })}
        </div>
        <small className="hint">{t('Das Datum der Liste folgt dann diesem Anlass.')}</small>
      </div>
    </Sheet>
  )
}
