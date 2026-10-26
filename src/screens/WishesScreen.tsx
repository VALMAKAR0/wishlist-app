import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, Share2, ShieldAlert, X } from 'lucide-react'
import { ListBar, ListSheetHost, ListStatsCard, type ListSelection } from '../components/Lists'
import { AddButton, Page } from '../components/Page'
import { Presence } from '../components/Presence'
import { EmptyState, Segmented } from '../components/Primitives'
import { ItemFormSheet } from '../components/ItemFormSheet'
import { ShareSheet } from '../components/ShareSheet'
import { BACKUP_NUDGE_DAYS } from '../lib/brand'
import { daysAgo } from '../lib/format'
import { listTitle } from '../lib/lists'
import { listStats } from '../lib/stats'
import type { Item } from '../lib/types'
import { useNav } from '../state/nav'
import { useLists, useStore } from '../state/store'
import { useT, useUI } from '../state/ui'
import { ItemList } from './shared'

type Seg = 'open' | 'done'

function BackupNudge({ days, onDismiss }: { days: number; onDismiss: () => void }) {
  const t = useT()
  const ui = useUI()
  const { setTab } = useNav()
  return (
    <motion.aside
      className="nudge"
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0, overflow: 'hidden', pointerEvents: 'none' }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.3 }}
    >
      <ShieldAlert size={22} />
      <div>
        <strong>{t('Letztes Backup vor {n} Tagen', { n: days })}</strong>
        <p>{t('Seitdem hat sich etwas geändert. Sichere deine Daten, bevor etwas verloren geht.')}</p>
        <div className="nudge__actions">
          <button className="btn btn--small btn--primary" onClick={() => ui.planned('backup-now')}>
            {t('Jetzt sichern')}
          </button>
          <button className="btn btn--small btn--ghost" onClick={() => setTab('more')}>
            {t('Einstellungen')}
          </button>
        </div>
      </div>
      <button className="icon-btn icon-btn--sm" onClick={onDismiss} aria-label={t('Hinweis ausblenden')}>
        <X size={16} />
      </button>
    </motion.aside>
  )
}

export function WishesScreen() {
  const t = useT()
  const { mine, listsOf } = useLists()
  const { lastBackupAt, changedSinceBackup, nudgeOpen, dispatch } = useStore()
  const lists = listsOf('me')
  const [sel, setSel] = useState<ListSelection>('all')
  const [seg, setSeg] = useState<Seg>('open')
  const [form, setForm] = useState<{ item: Item | null } | null>(null)
  const [share, setShare] = useState(false)
  const [listSheet, setListSheet] = useState<{ edit: boolean } | null>(null)

  // Wurde die gewählte Liste gelöscht, zurück auf "Alle".
  const active = sel !== 'all' && lists.some((l) => l.id === sel) ? sel : 'all'
  const activeList = lists.find((l) => l.id === active)

  const scoped = useMemo(() => (active === 'all' ? mine : mine.filter((i) => i.listId === active)), [mine, active])
  const stats = listStats(scoped)
  const open = scoped.filter((i) => !i.bought)
  const done = scoped.filter((i) => i.bought).sort((a, b) => (b.boughtAt ?? 0) - (a.boughtAt ?? 0))
  const list = seg === 'open' ? open : done
  const counts = useMemo(() => Object.fromEntries(lists.map((l) => [l.id, mine.filter((i) => i.listId === l.id).length])), [lists, mine])

  const backupDays = lastBackupAt ? daysAgo(lastBackupAt) : null
  const showNudge = nudgeOpen && changedSinceBackup && backupDays !== null && backupDays >= BACKUP_NUDGE_DAYS

  const listLabelFor = active === 'all' && lists.length > 1 ? (i: Item) => {
    const l = lists.find((x) => x.id === i.listId)
    return l?.emoji
  } : undefined

  return (
    <>
      <Page
        title={t('Meine Wünsche')}
        eyebrow={t('Zum Teilen')}
        subtitle={mine.length ? t.n(mine.filter((i) => !i.bought).length, 'offener Wunsch', 'offene Wünsche') : t('Deine Liste ist noch leer')}
        actions={
          <>
            <button className="icon-btn" onClick={() => setShare(true)} aria-label={t('Wunschlisten teilen')}>
              <Share2 size={17} />
            </button>
            <AddButton label={t('Wunsch')} onClick={() => setForm({ item: null })} />
          </>
        }
      >
        <AnimatePresence>{showNudge && <BackupNudge days={backupDays!} onDismiss={() => dispatch({ type: 'ackNudge' })} />}</AnimatePresence>

        <ListBar lists={lists} counts={counts} total={mine.length} value={active} onChange={setSel} onAdd={() => setListSheet({ edit: false })} />

        {(mine.length > 0 || active !== 'all') && (
          <ListStatsCard
            key={active}
            title={activeList ? listTitle(activeList, t) : t('Alle Listen')}
            emoji={activeList?.emoji}
            stats={stats}
            onEdit={activeList ? () => setListSheet({ edit: true }) : undefined}
          />
        )}

        {scoped.length > 0 && (
          <div className="toolbar">
            <Segmented
              id="wishes"
              value={seg}
              onChange={setSeg}
              options={[
                { value: 'open', label: t('Offen'), count: open.length },
                { value: 'done', label: t('Archiv'), count: done.length },
              ]}
            />
          </div>
        )}

        {list.length > 0 ? (
          <ItemList items={list} onOpen={(item) => setForm({ item })} listLabelFor={listLabelFor} />
        ) : (
          <EmptyState
            emoji={seg === 'open' ? '✨' : '🗂️'}
            title={seg === 'open' ? (scoped.length ? t('Alles erfüllt!') : t('Was wünschst du dir?')) : t('Noch nichts im Archiv')}
            text={
              seg === 'open'
                ? scoped.length
                  ? t('Du hast jeden Wunsch abgehakt. Zeit für neue Ideen.')
                  : t('Lege deinen ersten Wunsch an und teile die Liste mit Familie und Freunden.')
                : t('Gekaufte Wünsche wandern automatisch hierher und bleiben, bis du sie löschst.')
            }
            action={
              seg === 'open' && (
                <button className="btn btn--primary" onClick={() => setForm({ item: null })}>
                  <Plus size={17} /> {t('Ersten Wunsch anlegen')}
                </button>
              )
            }
          />
        )}
      </Page>

      <Presence show={!!form}>{form && <ItemFormSheet key={form.item?.id ?? 'new'} owner="me" item={form.item} listId={active === 'all' ? undefined : active} onClose={() => setForm(null)} />}</Presence>
      <Presence show={share}>{share && <ShareSheet initialList={active === 'all' ? undefined : active} onClose={() => setShare(false)} />}</Presence>
      <ListSheetHost open={!!listSheet} owner="me" list={listSheet?.edit ? activeList : null} onClose={() => setListSheet(null)} onCreated={(id) => setSel(id)} onDeleted={() => setSel('all')} />
    </>
  )
}
