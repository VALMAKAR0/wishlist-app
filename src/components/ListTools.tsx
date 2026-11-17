import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownUp, Check, ChevronDown, ListFilter, Search, Shapes, X } from 'lucide-react'
import { BANDS, EMPTY_QUERY, countFor, filterCount, isActive, kindsOf, matches, type Filt, type ListQuery, type PriceBand } from '../lib/listQuery'
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
  fav: 'Favoriten',
  drop: 'Preis gesunken',
  target: 'Wunschpreis erreicht',
  link: 'Mit Link',
  nolink: 'Ohne Link',
  noprice: 'Ohne Preis',
  note: 'Mit Notiz',
  img: 'Mit Bild',
  noimg: 'Ohne Bild',
  recent: 'Neu in 7 Tagen',
}

const GROUPS: Array<{ title: string; filters: Filt[]; bands?: boolean }> = [
  { title: 'Wichtigkeit', filters: ['prio', 'fav'] },
  { title: 'Preis', filters: ['drop', 'target', 'noprice'], bands: true },
  { title: 'Angaben', filters: ['link', 'nolink', 'note', 'img', 'noimg'] },
  { title: 'Zeit', filters: ['recent'] },
]

const BAND_LABELS: Record<PriceBand, string> = { low: 'bis 25', mid: '25 bis 100', high: 'ab 100' }

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

/** Suche, Sortierung, Art und Filter über einer Liste. Alles bricht um, nichts scrollt zur Seite. */
export function ListTools({ items, shown, query, onQuery, sort, onSort, sortable }: Props) {
  const t = useT()
  const [search, setSearch] = useState(!!query.q)
  const [sortOpen, setSortOpen] = useState(false)
  const [kindOpen, setKindOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const kinds = kindsOf(items)
  const active = isActive(query)
  useEffect(() => {
    if (search) input.current?.focus()
  }, [search])

  const toggle = (f: Filt) => onQuery({ ...query, f: query.f.includes(f) ? query.f.filter((x) => x !== f) : [...query.f, f] })
  const nFilters = filterCount(query)
  const live = filterOpen ? items.filter((i) => matches(i, query)).length : 0

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
        <button type="button" className="lchip" data-on={nFilters > 0} data-testid="lt-filter" onClick={() => setFilterOpen(true)}>
          <ListFilter size={14} /> {t('Filter')}
          {nFilters > 0 && <span className="lchip__n">{nFilters}</span>}
        </button>
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
          <button type="button" className="linkbtn" data-testid="lt-reset" onClick={() => { onQuery(EMPTY_QUERY); setSearch(false) }}>
            {t('Filter zurücksetzen')}
          </button>
        </p>
      )}

      <Presence show={filterOpen}>
        {filterOpen && (
          <Sheet
            title={t('Filter')}
            subtitle={t.n(items.length, 'Eintrag in dieser Ansicht', 'Einträge in dieser Ansicht')}
            onClose={() => setFilterOpen(false)}
            footer={
              <div className="row row--gap">
                <button type="button" className="btn btn--ghost" data-testid="lt-f-reset" disabled={nFilters === 0 && query.kind === null} onClick={() => onQuery({ ...EMPTY_QUERY, q: query.q })}>
                  {t('Zurücksetzen')}
                </button>
                <button type="button" className="btn btn--primary btn--grow" data-testid="lt-f-done" onClick={() => setFilterOpen(false)}>
                  {live === 0 && isActive(query) ? t('Nichts gefunden') : t.n(live, 'Eintrag zeigen', 'Einträge zeigen')}
                </button>
              </div>
            }
          >
            {GROUPS.map((g) => {
              const shown = g.filters.map((f) => ({ f, n: countFor(items, f) })).filter((c) => c.n > 0 || query.f.includes(c.f))
              if (!shown.length && !g.bands) return null
              return (
                <section key={g.title} className="fgroup">
                  <h3>{t(g.title)}</h3>
                  <div className="fgroup__chips">
                    {g.bands &&
                      (Object.keys(BANDS) as PriceBand[]).map((b) => (
                        <button key={b} type="button" className="lchip" data-on={query.band === b} aria-pressed={query.band === b} data-testid={`lt-band-${b}`} onClick={() => onQuery({ ...query, band: query.band === b ? null : b })}>
                          {query.band === b && <Check size={13} strokeWidth={3} />}
                          {t(BAND_LABELS[b])} €
                        </button>
                      ))}
                    {shown.map(({ f, n }) => (
                      <button key={f} type="button" className="lchip" data-on={query.f.includes(f)} aria-pressed={query.f.includes(f)} data-testid={`lt-f-${f}`} onClick={() => toggle(f)}>
                        {query.f.includes(f) && <Check size={13} strokeWidth={3} />}
                        {t(FILT_LABELS[f])} <span className="lchip__n">{n}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )
            })}
          </Sheet>
        )}
      </Presence>
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
