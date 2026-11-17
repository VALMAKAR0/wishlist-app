import { useState } from 'react'
import { motion } from 'motion/react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { dateLabel, daysAgo, mainCurrency, money, priceOf } from '../lib/format'
import type { TFn } from '../lib/i18n'
import { parsePriceInput, priceText } from '../lib/priceInput'
import { PriceInput } from './PriceInput'
import { listTitle } from '../lib/lists'
import { LIST_ICONS, iconOf, listIcon } from '../lib/icons'
import { occasionIcon } from '../lib/occasions'
import type { ListStats } from '../lib/stats'
import type { Owner, Person, Wishlist } from '../lib/types'
import { uid } from '../lib/format'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'
import { DateField } from './DateField'
import { Cover, CountUp, ListMark } from './Primitives'
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
          <ListMark icon={l.emoji} hue={l.hue} size={20} /> {listTitle(l, t)} <em>{counts[l.id] ?? 0}</em>
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
  hue?: number
  stats: ListStats
  onEdit?: () => void
  /** Budget (nur Geschenkideen): gekauft und geplant gegen das Budget. */
  budget?: number
}

interface Cell {
  label: string
  value: string
  sub?: string
}

/** Vier Kennzahlen: offen, gekauft, teuerster Wunsch und eine, die gerade etwas zu sagen hat. */
function statCells(s: ListStats, t: TFn): Cell[] {
  const top = s.priciest
  let tip: Cell
  if (s.saved > 0.005) tip = { label: t('Gespart'), value: money(s.saved), sub: t.n(s.down, 'Preis gesunken', 'Preise gesunken') }
  else if (s.hits > 0) tip = { label: t('Wunschpreis erreicht'), value: String(s.hits), sub: t('Zeit zum Zuschlagen') }
  else if (s.top > 0) tip = { label: t('Am liebsten'), value: String(s.top), sub: t('mit drei Herzen') }
  else if (s.oldest && s.open > 1) tip = { label: t('Wartet am längsten'), value: t.n(Math.max(1, daysAgo(s.oldest.createdAt)), 'Tag', 'Tage'), sub: s.oldest.name }
  else tip = { label: t('Mit Link'), value: `${s.withLink}`, sub: t('von {n}', { n: s.count }) }
  return [
    { label: t('Offen'), value: String(s.open), sub: t('von {n}', { n: s.count }) },
    { label: t('Gekauft'), value: String(s.bought), sub: s.bought ? money(s.boughtValue) : undefined },
    { label: t('Teuerster Wunsch'), value: top ? money(priceOf(top)) : '–', sub: top?.name },
    tip,
  ]
}

/** Kleine Kennzahlen zu einer Liste. */
export function ListStatsCard({ title, emoji, hue, stats, onEdit, budget }: StatsCardProps) {
  const t = useT()
  const done = stats.count ? stats.bought / stats.count : 0
  const cells = statCells(stats, t)
  return (
    <section className="lstats spot">
      <div className="lstats__head">
        <strong>
          {emoji && <ListMark icon={emoji} hue={hue} size={24} />} {title}
        </strong>
        {onEdit && (
          <button className="icon-btn icon-btn--sm" onClick={onEdit} aria-label={t('Liste bearbeiten')}>
            <Pencil size={14} />
          </button>
        )}
      </div>
      <div className="lstats__total">
        <CountUp value={stats.total} format={ money } />
        <span>{t('Gesamtwert')}</span>
      </div>
      <div className="lstats__bar" aria-hidden>
        <motion.span initial={{ width: 0 }} animate={{ width: `${done * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      {budget !== undefined && budget > 0 && <BudgetBar budget={budget} spent={stats.boughtValue} planned={stats.openValue} />}
      <dl className="lstats__grid">
        {cells.map((c) => (
          <div key={c.label}>
            <dt>{c.label}</dt>
            <dd>{c.value}</dd>
            <small>{c.sub ?? '\u00a0'}</small>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** Budget-Balken: gekauft (voll), geplant (gestreift), Rest. Über dem Budget wird es rot. */
function BudgetBar({ budget, spent, planned }: { budget: number; spent: number; planned: number }) {
  const t = useT()
  const total = spent + planned
  const scale = Math.max(budget, total)
  const left = budget - spent
  const over = total > budget + 0.005
  return (
    <div className="budget" data-over={over || undefined} data-testid="budget">
      <div className="budget__head">
        <span>{t('Budget {b}', { b: money(budget) })}</span>
        <strong>{left >= 0 ? t('{p} übrig', { p: money(left) }) : t('{p} drüber', { p: money(-left) })}</strong>
      </div>
      <div className="budget__bar" aria-hidden>
        <motion.span className="budget__spent" initial={{ width: 0 }} animate={{ width: `${(spent / scale) * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
        <motion.span className="budget__plan" initial={{ width: 0 }} animate={{ width: `${(planned / scale) * 100}%` }} transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} />
        {total > budget && <i className="budget__line" style={{ left: `${(budget / scale) * 100}%` }} />}
      </div>
      <p className="budget__sub">
        {t('{a} gekauft · {b} geplant', { a: money(spent), b: money(planned) })}
        {over && ' · ' + t('Mit allen offenen Ideen über dem Budget')}
      </p>
    </div>
  )
}

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
  const [emoji, setEmoji] = useState(listIcon(list?.emoji ?? 'ic:star'))
  const [hue, setHue] = useState(list?.hue ?? HUES[Math.floor(Math.random() * HUES.length)])
  const [shake, setShake] = useState(0)
  const [budget, setBudget] = useState(list?.budget !== undefined ? priceText(list.budget) : '')
  const budgetVal = (() => {
    const v = parsePriceInput(budget)
    return v !== undefined && Number.isFinite(v) && v > 0 ? v : undefined
  })()
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
      dispatch({ type: 'updateList', id: list.id, patch: { name: finalName, emoji, hue, occasionId: linked?.id, date: linked ? list.date : date || undefined, isDefault: finalName ? undefined : list.isDefault, budget: owner === 'me' ? undefined : budgetVal } })
    } else {
      const id = uid()
      dispatch({ type: 'addList', list: { id, owner, name: finalName, emoji, hue, occasionId: linked?.id, date: linked ? undefined : date || undefined, budget: owner === 'me' ? undefined : budgetVal, createdAt: Date.now() } })
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
      <div className="lhero">
        <motion.div key={emoji} className="lhero__mark" initial={{ scale: 0.82, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }}>
          <ListMark icon={emoji} hue={hue} size={64} />
        </motion.div>
        <motion.label key={shake} className="field" animate={shake ? { x: [0, -9, 9, -6, 6, 0] } : undefined} transition={{ duration: 0.4 }}>
          <span>{t('Name')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={list?.isDefault ? t('Allgemein') : t('z. B. Weihnachten')} autoFocus={!editing} data-invalid={shake > 0 && !name.trim() && !list?.isDefault} />
        </motion.label>
      </div>
      <div className="field">
        <span>{t('Symbol')}</span>
        <div className="lgrid" role="radiogroup" aria-label={t('Symbol')}>
          {LIST_ICONS.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={emoji === 'ic:' + id} aria-label={iconOf('ic:' + id)?.label} data-active={emoji === 'ic:' + id} className="ipick" onClick={() => setEmoji('ic:' + id)}>
              <Cover emoji={'ic:' + id} hue={hue} size={46} />
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>{t('Farbe')}</span>
        <div className="swatches swatches--left" role="radiogroup" aria-label={t('Farbe')}>
          {HUES.map((h) => (
            <button key={h} type="button" role="radio" aria-checked={h === hue} aria-label={`${h}`} data-active={h === hue} className="swatch swatch--color" style={{ ['--h' as string]: h }} onClick={() => setHue(h)} />
          ))}
        </div>
      </div>
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
                    if (emoji === 'ic:star') setEmoji(occasionIcon(o.label))
                  }
                }}
              >
                <ListMark icon={occasionIcon(o.label)} hue={hue} size={20} /> {t(o.label)}
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
      {owner !== 'me' && (
        <label className="field">
          <span>
            {t('Budget')} · {t('optional')}
          </span>
          <div className="field__row" data-testid="list-budget">
            <PriceInput value={budget} onChange={setBudget} placeholder={t('z. B. 50')} />
            <span className="field__unit">{mainCurrency()}</span>
          </div>
          <small className="hint">{t('Zeigt, wie viel gekauft und geplant ist und was übrig bleibt.')}</small>
        </label>
      )}
    </Sheet>
  )
}

/** Hilfsbaustein: Sheet zum Anlegen/Bearbeiten einer Liste mit eigener Presence. */
export function ListSheetHost({ open, ...props }: ListSheetProps & { open: boolean }) {
  return <Presence show={open}>{open && <ListSheet {...props} />}</Presence>
}
