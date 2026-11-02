import { useState } from 'react'
import { motion } from 'motion/react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { dateLabel, eur } from '../lib/format'
import { listTitle } from '../lib/lists'
import { occasionEmoji } from '../lib/occasions'
import type { ListStats } from '../lib/stats'
import type { Owner, Person, Wishlist } from '../lib/types'
import { uid } from '../lib/format'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'
import { DateField } from './DateField'
import { CountUp } from './Primitives'
import { Presence } from './Presence'
import { Sheet } from './Sheet'

export type ListSelection = 'all' | string

interface ListBarProps {
  lists: Wishlist[]
  counts: Record<string, number>
  total: number
  value: ListSelection
  onChange: (v: ListSelection) => void
  onAdd: () => void
}

/** Waagerechte Auswahl der Listen: "Alle", jede Liste mit Anzahl und "Neue Liste". */
export function ListBar({ lists, counts, total, value, onChange, onAdd }: ListBarProps) {
  const t = useT()
  return (
    <div className="listbar" role="tablist" aria-label={t('Listen')}>
      <button className="listchip" role="tab" aria-selected={value === 'all'} data-active={value === 'all'} onClick={() => onChange('all')}>
        {t('Alle')} <em>{total}</em>
      </button>
      {lists.map((l) => (
        <button key={l.id} className="listchip" role="tab" aria-selected={value === l.id} data-active={value === l.id} onClick={() => onChange(l.id)}>
          <span aria-hidden>{l.emoji}</span> {listTitle(l, t)} <em>{counts[l.id] ?? 0}</em>
        </button>
      ))}
      <button className="listchip listchip--add" onClick={onAdd} aria-label={t('Neue Liste')}>
        <Plus size={15} strokeWidth={2.6} /> {t('Neue Liste')}
      </button>
    </div>
  )
}

interface StatsCardProps {
  title: string
  emoji?: string
  stats: ListStats
  onEdit?: () => void
}

/** Kleine Kennzahlen zu einer Liste: Anzahl, Gesamtwert, offen, gekauft und Durchschnitt. */
export function ListStatsCard({ title, emoji, stats, onEdit }: StatsCardProps) {
  const t = useT()
  const done = stats.count ? stats.bought / stats.count : 0
  return (
    <section className="lstats spot">
      <div className="lstats__head">
        <strong>
          {emoji && <span aria-hidden>{emoji}</span>} {title}
        </strong>
        {onEdit && (
          <button className="icon-btn icon-btn--sm" onClick={onEdit} aria-label={t('Liste bearbeiten')}>
            <Pencil size={14} />
          </button>
        )}
      </div>
      <div className="lstats__total">
        <CountUp value={stats.total} format={eur} />
        <span>{t('Gesamtwert')}</span>
      </div>
      <div className="lstats__bar" aria-hidden>
        <motion.span initial={{ width: 0 }} animate={{ width: `${done * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <dl className="lstats__grid">
        <div>
          <dt>{t('Einträge')}</dt>
          <dd>{stats.count}</dd>
        </div>
        <div>
          <dt>{t('Offen')}</dt>
          <dd>{eur(stats.openValue)}</dd>
        </div>
        <div>
          <dt>{t('Gekauft')}</dt>
          <dd>{eur(stats.boughtValue)}</dd>
        </div>
        <div>
          <dt>{t('Ø Preis')}</dt>
          <dd>{stats.avg ? eur(stats.avg) : '–'}</dd>
        </div>
      </dl>
    </section>
  )
}

const EMOJIS = ['📌', '🎄', '🎂', '💝', '🏠', '✈️', '🎓', '🍼', '💍', '🎁', '🛒', '⭐']
const HUES = [14, 45, 100, 150, 190, 230, 275, 320]

interface ListSheetProps {
  owner: Owner
  /** Beim Anlegen für eine Person: zur Auswahl stehende Personen (ersetzt `owner`). */
  ownerChoices?: Person[]
  list?: Wishlist | null
  onClose: () => void
  onCreated?: (id: string) => void
  onDeleted?: () => void
}

export function ListSheet({ owner: baseOwner, ownerChoices, list, onClose, onCreated, onDeleted }: ListSheetProps) {
  const t = useT()
  const ui = useUI()
  const { dispatch, lists, items, persons } = useStore()
  const editing = !!list
  const [pick, setPick] = useState(ownerChoices?.[0]?.id ?? baseOwner)
  const owner: Owner = ownerChoices && !editing ? pick : baseOwner
  const occasions = persons.find((p) => p.id === owner)?.occasions ?? []
  const [occId, setOccId] = useState(list?.occasionId ?? '')
  const linked = occasions.find((o) => o.id === occId)
  const [date, setDate] = useState(list?.date ?? '')
  const [name, setName] = useState(list && !list.isDefault ? list.name : '')
  const [emoji, setEmoji] = useState(list?.emoji ?? '⭐')
  const [hue, setHue] = useState(list?.hue ?? HUES[Math.floor(Math.random() * HUES.length)])
  const [shake, setShake] = useState(0)
  const canDelete = editing && lists.filter((l) => l.owner === owner).length > 1

  const save = () => {
    const finalName = name.trim()
    if (!finalName && !(list?.isDefault)) {
      setShake((s) => s + 1)
      ui.haptic(30)
      return
    }
    if (list) {
      // Ein Standardname bleibt "Allgemein", sonst wird die Liste zu einer eigenen.
      dispatch({ type: 'updateList', id: list.id, patch: { name: finalName, emoji, hue, occasionId: linked?.id, date: linked ? list.date : date || undefined, isDefault: finalName ? undefined : list.isDefault } })
      ui.toast({ message: t('Liste aktualisiert'), emoji: '✨' })
    } else {
      const id = uid()
      dispatch({ type: 'addList', list: { id, owner, name: finalName, emoji, hue, occasionId: linked?.id, date: linked ? undefined : date || undefined, createdAt: Date.now() } })
      ui.toast({ message: t('Liste „{name}“ angelegt', { name: finalName }), emoji })
      onCreated?.(id)
    }
    ui.haptic(18)
    onClose()
  }

  const remove = () => {
    if (!list) return
    const n = items.filter((i) => i.listId === list.id && !i.deletedAt).length
    ui.confirm({
      title: t('Liste löschen?'),
      text: n ? t('Die Liste wird gelöscht, ihre {count} landen im Papierkorb.', { count: t.n(n, 'Eintrag', 'Einträge') }) : t('Die leere Liste wird gelöscht.'),
      confirmLabel: t('Löschen'),
      tone: 'danger',
      onConfirm: () => {
        dispatch({ type: 'deleteList', id: list.id })
        ui.toast({ message: t('Liste gelöscht') })
        onClose()
        onDeleted?.()
      },
    })
  }

  return (
    <Sheet
      title={editing ? t('Liste bearbeiten') : t('Neue Liste')}
      subtitle={owner === 'me' ? t('Wünsche lassen sich in Listen sortieren und einzeln teilen') : t('Ideen lassen sich in Listen sortieren, z. B. nach Anlass')}
      onClose={onClose}
      footer={
        <div className="row row--gap">
          {canDelete && (
            <button className="btn btn--ghost btn--icon" onClick={remove} aria-label={t('Liste löschen')}>
              <Trash2 size={17} />
            </button>
          )}
          <button className="btn btn--primary btn--grow" onClick={save}>
            {editing ? t('Speichern') : t('Anlegen')}
          </button>
        </div>
      }
    >
      {ownerChoices && !editing && (
        <div className="field">
          <span>{t('Für wen?')}</span>
          <div className="listbar listbar--form" role="radiogroup" aria-label={t('Für wen?')}>
            {ownerChoices.map((p) => (
              <button key={p.id} role="radio" aria-checked={p.id === pick} data-active={p.id === pick} className="listchip" onClick={() => {
                  setPick(p.id)
                  setOccId('')
                }}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <motion.label key={shake} className="field" animate={shake ? { x: [0, -9, 9, -6, 6, 0] } : undefined} transition={{ duration: 0.4 }}>
        <span>{t('Name')}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={list?.isDefault ? t('Allgemein') : t('z. B. Weihnachten')} autoFocus={!editing} data-invalid={shake > 0 && !name.trim() && !list?.isDefault} />
      </motion.label>
      {occasions.length > 0 && (
        <div className="field">
          <span>{t('Anlass')} · {t('optional')}</span>
          <div className="listbar listbar--form" role="radiogroup" aria-label={t('Anlass')}>
            <button role="radio" aria-checked={!linked} data-active={!linked} className="listchip" onClick={() => setOccId('')}>
              {t('Keiner')}
            </button>
            {occasions.map((o) => (
              <button
                key={o.id}
                role="radio"
                aria-checked={o.id === linked?.id}
                data-active={o.id === linked?.id}
                className="listchip"
                onClick={() => {
                  setOccId(o.id)
                  if (!editing && !name.trim()) {
                    setName(t(o.label))
                    if (emoji === '⭐') setEmoji(occasionEmoji(o.label))
                  }
                }}
              >
                <span aria-hidden>{occasionEmoji(o.label)}</span> {t(o.label)}
              </button>
            ))}
          </div>
        </div>
      )}
      {linked ? (
        <div className="field">
          <span>{t('Datum')}</span>
          <small className="hint">{t('Folgt dem Anlass: {date}', { date: dateLabel(linked) })}</small>
        </div>
      ) : (
        <div className="field">
          <span>{t('Datum')} · {t('optional')}</span>
          <DateField value={date} onChange={setDate} label={t('Datum')} clearable />
        </div>
      )}
      <div className="field">
        <span>{t('Symbol')}</span>
        <div className="swatches swatches--left" role="radiogroup" aria-label={t('Symbol')}>
          {EMOJIS.map((e) => (
            <button key={e} role="radio" aria-checked={e === emoji} data-active={e === emoji} className="swatch swatch--emoji" onClick={() => setEmoji(e)}>
              {e}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>{t('Farbe')}</span>
        <div className="swatches swatches--left" role="radiogroup" aria-label={t('Farbe')}>
          {HUES.map((h) => (
            <button key={h} role="radio" aria-checked={h === hue} aria-label={`${h}`} data-active={h === hue} className="swatch swatch--color" style={{ ['--h' as string]: h }} onClick={() => setHue(h)} />
          ))}
        </div>
      </div>
    </Sheet>
  )
}

/** Hilfsbaustein: Sheet zum Anlegen/Bearbeiten einer Liste mit eigener Presence. */
export function ListSheetHost({ open, ...props }: ListSheetProps & { open: boolean }) {
  return <Presence show={open}>{open && <ListSheet {...props} />}</Presence>
}
