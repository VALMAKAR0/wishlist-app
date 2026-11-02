import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link2, Plus, Share2 } from 'lucide-react'
import { ListSheetHost, ListStatsCard } from '../components/Lists'
import { AddButton, Page } from '../components/Page'
import { Presence } from '../components/Presence'
import { EmptyState, Segmented } from '../components/Primitives'
import { ItemFormSheet } from '../components/ItemFormSheet'
import { ShareSheet } from '../components/ShareSheet'
import { daysUntilIso, isoLabel, priceOf } from '../lib/format'
import { listDate, listOccasion, listTitle } from '../lib/lists'
import { occasionEmoji } from '../lib/occasions'
import { sortItems } from '../lib/settings'
import { listStats } from '../lib/stats'
import type { Item, Owner } from '../lib/types'
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
  const { settings } = useUI()
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

  useEffect(() => {
    if (missing) back()
  }, [missing, back])
  if (missing) return null

  const person = forMe ? undefined : persons.find((p) => p.id === owner)
  const mineAll = items.filter((i) => i.owner === owner && !i.deletedAt)
  const scoped = list ? mineAll.filter((i) => i.listId === list.id) : mineAll
  const open = sortItems(scoped.filter((i) => !i.bought), settings.sort, priceOf)
  const done = scoped.filter((i) => i.bought).sort((a, b) => (b.boughtAt ?? 0) - (a.boughtAt ?? 0))
  const shown = seg === 'open' ? open : done
  const stats = listStats(scoped)
  const date = list ? listDate(list, persons) : undefined
  const occ = list ? listOccasion(list, persons) : undefined
  const days = date ? daysUntilIso(date) : null

  const heading = title ?? (list ? listTitle(list, t) : forMe ? t('Meine Wünsche') : (person?.name ?? ''))
  const kicker = eyebrow ?? (forMe ? (list ? t('Meine Wünsche') : t('Zum Teilen')) : (person?.name ?? t('Geschenkideen')))
  const doneLabel = forMe ? t('Archiv') : t('Gekauft')

  const listLabelFor =
    !list && lists.length > 1
      ? (i: Item) => lists.find((x) => x.id === i.listId)?.emoji
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
            {forMe && (
              <button className="icon-btn" onClick={() => setShare(true)} aria-label={t('Wunschlisten teilen')}>
                <Share2 size={17} />
              </button>
            )}
            <AddButton label={forMe ? t('Wunsch') : t('Idee')} onClick={() => setForm({ item: null })} />
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
            <span className="occ-tile__emoji" aria-hidden>
              {occ ? occasionEmoji(occ.label) : '🗓️'}
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
            title={list ? listTitle(list, t) : t('Alle Listen')}
            emoji={list?.emoji}
            stats={stats}
            onEdit={list ? () => setListSheet(true) : undefined}
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

        {shown.length > 0 ? (
          <ItemList
            items={shown}
            onOpen={(item) => setForm({ item })}
            badgeFor={forMe ? undefined : (item) => (alreadyOwned(item) ? t('Schon vorhanden') : undefined)}
            listLabelFor={listLabelFor}
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
