import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Plus, Share2 } from 'lucide-react'
import { ListSheetHost, ListStatsCard } from '../components/Lists'
import { AddButton, Page } from '../components/Page'
import { Presence } from '../components/Presence'
import { EmptyState, Segmented } from '../components/Primitives'
import { ItemFormSheet } from '../components/ItemFormSheet'
import { ShareSheet } from '../components/ShareSheet'
import { listTitle } from '../lib/lists'
import { listStats } from '../lib/stats'
import type { Item, Owner } from '../lib/types'
import { useNav } from '../state/nav'
import { useStore } from '../state/store'
import { useT } from '../state/ui'
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
  /** Zeigt "Neue Liste" (für den Fall, dass es nur eine Liste gibt). */
  canCreateList?: boolean
}

/** Eine Liste (oder alle Listen) mit Kennzahlen, offenen und gekauften Einträgen. Gilt für Wünsche und Ideen. */
export function ListPage({ owner, listId, title, eyebrow, onBack, top, canCreateList }: Props) {
  const t = useT()
  const { items, lists: allLists, persons, alreadyOwned } = useStore()
  const { back } = useNav()
  const forMe = owner === 'me'
  const lists = useMemo(() => allLists.filter((l) => l.owner === owner), [allLists, owner])
  const list = listId === 'all' ? undefined : lists.find((l) => l.id === listId)
  const missing = listId !== 'all' && !list
  const [seg, setSeg] = useState<Seg>('open')
  const [form, setForm] = useState<{ item: Item | null } | null>(null)
  const [share, setShare] = useState(false)
  const [listSheet, setListSheet] = useState<'edit' | 'new' | null>(null)

  useEffect(() => {
    if (missing) back()
  }, [missing, back])
  if (missing) return null

  const person = forMe ? undefined : persons.find((p) => p.id === owner)
  const mineAll = items.filter((i) => i.owner === owner && !i.deletedAt)
  const scoped = list ? mineAll.filter((i) => i.listId === list.id) : mineAll
  const open = scoped.filter((i) => !i.bought)
  const done = scoped.filter((i) => i.bought).sort((a, b) => (b.boughtAt ?? 0) - (a.boughtAt ?? 0))
  const shown = seg === 'open' ? open : done
  const stats = listStats(scoped)

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

        {canCreateList && (
          <div className="listbar">
            <button className="listchip listchip--add" onClick={() => setListSheet('new')}>
              <Plus size={15} strokeWidth={2.6} /> {t('Neue Liste')}
            </button>
          </div>
        )}

        {(mineAll.length > 0 || list) && (
          <ListStatsCard
            key={list?.id ?? 'all'}
            title={list ? listTitle(list, t) : t('Alle Listen')}
            emoji={list?.emoji}
            stats={stats}
            onEdit={list ? () => setListSheet('edit') : undefined}
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
      <ListSheetHost open={!!listSheet} owner={owner} list={listSheet === 'edit' ? list : null} onClose={() => setListSheet(null)} />
    </>
  )
}

/** Als Ansicht geöffnet (aus der Listen-Übersicht), mit Zurück-Pfeil. */
export function ListScreen({ id }: { id: string }) {
  const { lists } = useStore()
  const { back } = useNav()
  const list = lists.find((l) => l.id === id)
  const owner = list?.owner ?? 'me'
  return <ListPage owner={owner} listId={id === 'all' ? 'all' : id} onBack={back} />
}
