import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownUp, Check, ChevronDown, Search, Shapes, X } from 'lucide-react'
import { FILTS, countFor, isActive, kindsOf, type Filt, type ListQuery } from '../lib/listQuery'
import type { Item, SortMode } from '../lib/types'
import { useT } from '../state/ui'
import { Presence } from './Presence'
import { Sheet } from './Sheet'

export const SORT_LABELS: Record<SortMode, string> = {
  new: 'Neueste zuerst',
  old: 'Älteste zuerst',
  name: 'Name A–Z',
  priceUp: 'Günstigste zuerst',
  priceDown: 'Teuerste zuerst',
  prio: 'Wichtigste zuerst',
  drop: 'Größte Preissenkung',
}

const SORTS: SortMode[] = ['new', 'old', 'name', 'priceUp', 'priceDown', 'prio', 'drop']

const FILT_LABELS: Record<Filt, string> = {
  prio: 'Wichtig',
  drop: 'Preis gesunken',
  target: 'Wunschpreis erreicht',
  link: 'Mit Link',
  noprice: 'Ohne Preis',
  note: 'Mit Notiz',
}

interface Props {
  /** Einträge des aktuellen Reiters, ungefiltert (für die Zahlen). */
  items: Item[]
  shown: number
  query: ListQuery
  onQuery: (q: ListQuery) => void
  sort: SortMode
  onSort: (s: SortMode) => void
  /** Sortierung gilt im Archiv nicht. */
  sortable: boolean
}

/** Suche, Sortierung, Filter-Chips und Art-Auswahl über einer Liste. */
export function ListTools({ items, shown, query, onQuery, sort, onSort, sortable }: Props) {
  const t = useT()
  const [search, setSearch] = useState(!!query.q)
  const [sortOpen, setSortOpen] = useState(false)
  const [kindOpen, setKindOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const kinds = kindsOf(items)
  const active = isActive(query)
  useEffect(() => {
    if (search) input.current?.focus()
  }, [search])

  const toggle = (f: Filt) => onQuery({ ...query, f: query.f.includes(f) ? query.f.filter((x) => x !== f) : [...query.f, f] })
  const chips = FILTS.map((f) => ({ f, n: countFor(items, f) })).filter((c) => c.n > 0 || query.f.includes(c.f))

  return (
    <div className="ltools" data-testid="ltools">
      <div className="ltools__row" role="toolbar" aria-label={t('Sortieren und filtern')}>
        <button type="button" className="lchip lchip--icon" data-on={search || !!query.q} aria-label={t('Suchen')} aria-pressed={search} data-testid="lt-search" onClick={() => (search && !query.q ? setSearch(false) : setSearch(true))}>
          <Search size={15} />
        </button>
        {sortable && (
          <button type="button" className="lchip" data-on={sort !== 'new'} data-testid="lt-sort" onClick={() => setSortOpen(true)}>
            <ArrowDownUp size={14} /> {t(SORT_LABELS[sort])}
          </button>
        )}
        {kinds.length > 1 && (
          <button type="button" className="lchip" data-on={query.kind !== null} data-testid="lt-kind" onClick={() => setKindOpen(true)}>
            <Shapes size={14} /> {query.kind ?? t('Art')} <ChevronDown size={13} />
          </button>
        )}
        {chips.map(({ f, n }) => (
          <button key={f} type="button" className="lchip" data-on={query.f.includes(f)} aria-pressed={query.f.includes(f)} data-testid={`lt-f-${f}`} onClick={() => toggle(f)}>
            {query.f.includes(f) && <Check size={13} strokeWidth={3} />}
            {t(FILT_LABELS[f])} <span className="lchip__n">{n}</span>
          </button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {(search || !!query.q) && (
          <motion.div className="ltools__search" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
            <Search size={15} aria-hidden />
            <input
              ref={input}
              value={query.q}
              placeholder={t('In dieser Liste suchen …')}
              data-testid="lt-q"
              enterKeyHint="search"
              onChange={(e) => onQuery({ ...query, q: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onQuery({ ...query, q: '' })
                  setSearch(false)
                }
              }}
            />
            {(query.q || search) && (
              <button type="button" className="ltools__clear" aria-label={t('Suche schließen')} onClick={() => { onQuery({ ...query, q: '' }); setSearch(false) }}>
                <X size={15} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {active && (
        <p className="ltools__res" data-testid="lt-res">
          {t('{n} von {m}', { n: shown, m: items.length })}
          <button type="button" className="linkbtn" data-testid="lt-reset" onClick={() => { onQuery({ q: '', f: [], kind: null }); setSearch(false) }}>
            {t('Filter zurücksetzen')}
          </button>
        </p>
      )}

      <Presence show={sortOpen}>
        {sortOpen && (
          <Sheet title={t('Sortieren')} onClose={() => setSortOpen(false)}>
            <div className="movelist" role="radiogroup" aria-label={t('Sortieren')}>
              {SORTS.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={sort === s} className="moverow" data-active={sort === s} data-testid={`lt-sort-${s}`} onClick={() => { onSort(s); setSortOpen(false) }}>
                  <span className="moverow__main"><strong>{t(SORT_LABELS[s])}</strong></span>
                  <span className="moverow__tick" aria-hidden><Check size={16} strokeWidth={3.2} /></span>
                </button>
              ))}
            </div>
          </Sheet>
        )}
      </Presence>
      <Presence show={kindOpen}>
        {kindOpen && (
          <Sheet title={t('Nach Art filtern')} onClose={() => setKindOpen(false)}>
            <div className="movelist" role="radiogroup" aria-label={t('Art')}>
              <button type="button" role="radio" aria-checked={query.kind === null} className="moverow" data-active={query.kind === null} onClick={() => { onQuery({ ...query, kind: null }); setKindOpen(false) }}>
                <span className="moverow__main"><strong>{t('Alle Arten')}</strong></span>
                <span className="moverow__tick" aria-hidden><Check size={16} strokeWidth={3.2} /></span>
              </button>
              {kinds.map((k) => (
                <button key={k.kind} type="button" role="radio" aria-checked={query.kind === k.kind} className="moverow" data-active={query.kind === k.kind} data-testid={`lt-kind-${k.kind}`} onClick={() => { onQuery({ ...query, kind: k.kind }); setKindOpen(false) }}>
                  <span className="moverow__main">
                    <strong>{k.kind}</strong>
                    <small>{t.n(k.n, 'Eintrag', 'Einträge')}</small>
                  </span>
                  <span className="moverow__tick" aria-hidden><Check size={16} strokeWidth={3.2} /></span>
                </button>
              ))}
            </div>
          </Sheet>
        )}
      </Presence>
    </div>
  )
}
