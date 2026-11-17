import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CalendarDays, FolderInput, Link2, Plus, Share2, X } from 'lucide-react'
import { ListSheetHost, ListStatsCard } from '../components/Lists'
import { AddButton, Page } from '../components/Page'
import { Presence } from '../components/Presence'
import { EmptyState, ListMark, Segmented } from '../components/Primitives'
import { ItemFormSheet } from '../components/ItemFormSheet'
import { MoveSheet } from '../components/MoveSheet'
import { ShareSheet } from '../components/ShareSheet'
import { ListTools } from '../components/ListTools'
import { daysUntilIso, isoLabel, priceOf } from '../lib/format'
import { listDate, listOccasion, listTitle } from '../lib/lists'
import { occasionEmoji } from '../lib/occasions'
import { EMPTY_QUERY, isActive, matches, sortList, type ListQuery } from '../lib/listQuery'
import { listStats } from '../lib/stats'
import type { Item, Owner } from '../lib/types'
import { pushBack } from '../state/back'
import { useNav } from '../state/nav'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'
import { ItemList } from './shared'

type Seg = 'open' | 'done'

interface Props {
  owner: Owner
  /** 'all' = alle Listen des Eigentümers. */
  listId: 'all' | string
  title?: string
  eyebrow?: string
  onBack?: () => void
  /** Inhalt direkt unter der Kopfzeile, z. B. der Backup-Hinweis. */
  top?: ReactNode
}

/** Eine Liste (oder alle Listen) mit Kennzahlen, offenen und gekauften Einträgen. Gilt für Wünsche und Ideen. */
export function ListPage({ owner, listId, title, eyebrow, onBack, top }: Props) {
  const t = useT()
  const ui = useUI()
  const { settings } = ui
  const { items, lists: allLists, persons, alreadyOwned } = useStore()
  const { back } = useNav()
  const forMe = owner === 'me'
  const lists = useMemo(() => allLists.filter((l) => l.owner === owner), [allLists, owner])
  const list = listId === 'all' ? undefined : lists.find((l) => l.id === listId)
  const missing = listId !== 'all' && !list
  const [seg, setSeg] = useState<Seg>('open')
  const [form, setForm] = useState<{ item: Item | null } | null>(null)
  const [share, setShare] = useState(false)
  const [listSheet, setListSheet] = useState(false)
  const [sel, setSel] = useState<Set<string> | null>(null)
  const [moving, setMoving] = useState(false)
  const [moveOne, setMoveOne] = useState<Item | null>(null)
  const [query, setQuery] = useState<ListQuery>(EMPTY_QUERY)
  // Tippen bleibt flüssig: Die Liste filtert mit dem zuletzt fertig gerenderten Suchtext nach.
  const q = useDeferredValue(query)

  useEffect(() => {
    if (missing) back()
  }, [missing, back])
  // Beim Wechsel des Reiters oder der Liste endet die Auswahl.
  useEffect(() => setSel(null), [seg, listId])
  // Die Zurück-Geste beendet zuerst die Auswahl.
  const selecting = sel !== null
  useEffect(() => {
    if (!selecting) return
    return pushBack(() => setSel(null))
  }, [selecting])
  useEffect(() => setQuery(EMPTY_QUERY), [listId, owner])
  if (missing) return null

  const person = forMe ? undefined : persons.find((p) => p.id === owner)
  const mineAll = items.filter((i) => i.owner === owner && !i.deletedAt)
  const scoped = list ? mineAll.filter((i) => i.listId === list.id) : mineAll
  const openAll = scoped.filter((i) => !i.bought)
  const doneAll = scoped.filter((i) => i.bought)
  const filtering = isActive(q)
  const open = sortList(filtering ? openAll.filter((i) => matches(i, q)) : openAll, settings.sort, priceOf)
  const doneF = filtering ? doneAll.filter((i) => matches(i, q)) : doneAll
  const done = settings.sort === 'new' || settings.sort === 'old' ? [...doneF].sort((a, b) => (b.boughtAt ?? 0) - (a.boughtAt ?? 0)) : sortList(doneF, settings.sort, priceOf)
  const shown = seg === 'open' ? open : done
  const stats = listStats(scoped)
  const pickedItems = sel ? shown.filter((i) => sel.has(i.id)) : []
  const flip = (id: string) =>
    setSel((cur) => {
      if (!cur) return cur
      const next = new Set(cur)
      if (!next.delete(id)) next.add(id)
      return next
    })
  const startSelect = (id?: string) => {
    ui.haptic(18)
    setSel(new Set(id ? [id] : []))
  }
  const date = list ? listDate(list, persons) : undefined
  const occ = list ? listOccasion(list, persons) : undefined
  const days = date ? daysUntilIso(date) : null

  const heading = title ?? (list ? listTitle(list, t) : forMe ? t('Meine Wünsche') : (person?.name ?? ''))
  const kicker = eyebrow ?? (!forMe && list ? person?.name : undefined)
  const doneLabel = forMe ? t('Archiv') : t('Gekauft')

  const listLabelFor =
    !list && lists.length > 1
      ? (i: Item) => {
          const l = lists.find((x) => x.id === i.listId)
          return l ? { icon: l.emoji, hue: l.hue } : undefined
        }
      : undefined

  return (
    <>
      <Page
        title={heading}
        eyebrow={kicker}
        subtitle={
          mineAll.length
            ? t.n(mineAll.filter((i) => !i.bought).length, forMe ? 'offener Wunsch' : 'offene Idee', forMe ? 'offene Wünsche' : 'offene Ideen')
            : forMe
              ? t('Deine Liste ist noch leer')
              : t('Nur für dich sichtbar, wird nie geteilt')
        }
        onBack={onBack}
        actions={
          <>
            {forMe && !sel && (
              <button className="icon-btn" onClick={() => setShare(true)} aria-label={t('Wunschlisten teilen')}>
                <Share2 size={17} />
              </button>
            )}
            {!sel && <AddButton label={forMe ? t('Wunsch') : t('Idee')} onClick={() => setForm({ item: null })} />}
          </>
        }
      >
        {top}

        {date && days !== null && (
          <button
            className="occ-tile occ-tile--banner spot"
            data-next
            data-soon={days >= 0 && days <= 14}
            onClick={list ? () => setListSheet(true) : undefined}
            aria-label={t('Datum der Liste')}
          >
            <span className="occ-tile__emoji" data-plain={!occ || undefined} aria-hidden>
              {occ ? <ListMark icon={occasionEmoji(occ.label)} hue={list?.hue ?? 260} size={38} /> : <CalendarDays size={22} />}
            </span>
            <span className="occ-tile__main">
              <strong>{occ ? t(occ.label) : isoLabel(date)}</strong>
              <span>{occ ? isoLabel(date) : t('Datum der Liste')}</span>
              {occ && (
                <span className="occ-tile__lists">
                  <Link2 size={12} /> {t('Verknüpfter Anlass')}
                </span>
              )}
            </span>
            <span className="occ-tile__days">
              {days <= 1 && days >= 0 ? (
                <strong>{days === 0 ? t('Heute') : t('Morgen')}</strong>
              ) : (
                <>
                  <strong>{Math.abs(days)}</strong>
                  <small>{days < 0 ? t('Tage her') : t('Tage')}</small>
                </>
              )}
            </span>
          </button>
        )}

        {(mineAll.length > 0 || list) && (
          <ListStatsCard
            key={list?.id ?? 'all'}
            title={list ? '' : t('Alle Listen')}
            emoji={list?.emoji}
            hue={list?.hue}
            stats={stats}
            onEdit={list ? () => setListSheet(true) : undefined}
            budget={forMe ? undefined : list?.budget}
          />
        )}

        {scoped.length > 0 && (
          <div className="toolbar">
            <Segmented
              id={`list-${owner}`}
              value={seg}
              onChange={setSeg}
              options={[
                { value: 'open', label: t('Offen'), count: open.length },
                { value: 'done', label: doneLabel, count: done.length },
              ]}
            />
          </div>
        )}

        {scoped.length > 1 && (
          <ListTools
            items={seg === 'open' ? openAll : doneAll}
            shown={shown.length}
            query={query}
            onQuery={setQuery}
            sort={settings.sort}
            onSort={(sort) => ui.setSettings({ sort })}
            sortable
          />
        )}

        {shown.length > 0 ? (
          <ItemList
            items={shown}
            onOpen={(item) => (sel ? flip(item.id) : setForm({ item }))}
            selected={sel}
            onLongPress={(item) => startSelect(item.id)}
            onMove={(item) => setMoveOne(item)}
            badgeFor={forMe ? undefined : (item) => (alreadyOwned(item) ? t('Schon vorhanden') : undefined)}
            listLabelFor={listLabelFor}
          />
        ) : filtering && (seg === 'open' ? openAll : doneAll).length > 0 ? (
          <EmptyState
            emoji="🔍"
            title={t('Nichts gefunden')}
            text={t('Kein Eintrag passt zu Suche und Filtern.')}
            action={
              <button className="btn btn--ghost" data-testid="lt-empty-reset" onClick={() => setQuery(EMPTY_QUERY)}>
                {t('Filter zurücksetzen')}
              </button>
            }
          />
        ) : (
          <EmptyState
            emoji={seg === 'open' ? (forMe ? '✨' : '💡') : '🗂️'}
            title={
              seg === 'open'
                ? scoped.length
                  ? forMe
                    ? t('Alles erfüllt!')
                    : t('Alles besorgt!')
                  : forMe
                    ? t('Was wünschst du dir?')
                    : t('Noch keine Ideen')
                : forMe
                  ? t('Noch nichts im Archiv')
                  : t('Noch nichts gekauft')
            }
            text={
              seg === 'open'
                ? scoped.length
                  ? forMe
                    ? t('Du hast jeden Wunsch abgehakt. Zeit für neue Ideen.')
                    : t('Alle Ideen dieser Liste sind gekauft.')
                  : forMe
                    ? t('Lege deinen ersten Wunsch an und teile die Liste mit Familie und Freunden.')
                    : t('Halte fest, was {name} gefallen könnte. Nur du siehst das.', { name: person?.name ?? '' })
                : forMe
                  ? t('Gekaufte Wünsche wandern automatisch hierher und bleiben, bis du sie löschst.')
                  : t('Gekaufte Ideen erscheinen hier und bleiben, bis du sie löschst.')
            }
            action={
              seg === 'open' && (
                <button className="btn btn--primary" onClick={() => setForm({ item: null })}>
                  <Plus size={17} /> {forMe ? t('Ersten Wunsch anlegen') : t('Idee notieren')}
                </button>
              )
            }
          />
        )}
      </Page>

      {sel && (
        <div className="selbar" role="toolbar" aria-label={t('Auswahl')} data-testid="selbar">
          <button className="selbar__btn selbar__btn--icon" data-testid="sel-cancel" onClick={() => setSel(null)} aria-label={t('Auswahl beenden')}>
            <X size={16} />
          </button>
          <span className="selbar__n" data-testid="sel-count">{t.n(sel.size, 'ausgewählt', 'ausgewählt')}</span>
          <button className="selbar__btn" data-testid="sel-all" onClick={() => setSel(sel.size === shown.length ? new Set() : new Set(shown.map((i) => i.id)))}>
            {sel.size === shown.length ? t('Keine') : t('Alle')}
          </button>
          <button className="selbar__btn selbar__btn--main" data-testid="sel-move" disabled={!sel.size} onClick={() => setMoving(true)}>
            <FolderInput size={16} /> {t('Verschieben')}
          </button>
        </div>
      )}
      <Presence show={!!moveOne || (moving && pickedItems.length > 0)}>
        {(moveOne || (moving && pickedItems.length > 0)) && (
          <MoveSheet
            owner={owner}
            picked={moveOne ? [moveOne] : pickedItems}
            onClose={() => {
              setMoving(false)
              setMoveOne(null)
            }}
            onDone={() => {
              setMoving(false)
              setMoveOne(null)
              setSel(null)
            }}
          />
        )}
      </Presence>
      <Presence show={!!form}>{form && <ItemFormSheet key={form.item?.id ?? 'new'} owner={owner} item={form.item} listId={list?.id} onClose={() => setForm(null)} />}</Presence>
      <Presence show={share}>{share && <ShareSheet initialList={list?.id} onClose={() => setShare(false)} />}</Presence>
      <ListSheetHost open={listSheet} owner={owner} list={list} onClose={() => setListSheet(false)} />
    </>
  )
}

/** Als Ansicht geöffnet (aus der Listen-Übersicht), mit Zurück-Pfeil. */
export function ListScreen({ id }: { id: string }) {
  const { lists } = useStore()
  const { back } = useNav()
  // 'all' = alle Wünsche, 'all:<Person>' = alle Ideen einer Person, sonst die ID einer Liste.
  if (id === 'all' || id.startsWith('all:')) return <ListPage owner={id === 'all' ? 'me' : id.slice(4)} listId="all" onBack={back} />
  return <ListPage owner={lists.find((l) => l.id === id)?.owner ?? 'me'} listId={id} onBack={back} />
}
