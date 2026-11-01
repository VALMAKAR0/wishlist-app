import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ListChecks, Share2, ShieldAlert, X } from 'lucide-react'
import { ListSheetHost, ListStatsCard } from '../components/Lists'
import { ListTiles } from '../components/ListTiles'
import { AddButton, Page, Section } from '../components/Page'
import { Presence } from '../components/Presence'
import { ItemFormSheet } from '../components/ItemFormSheet'
import { ShareSheet } from '../components/ShareSheet'
import { BACKUP_NUDGE_DAYS } from '../lib/brand'
import { daysAgo } from '../lib/format'
import { listStats } from '../lib/stats'
import { useNav } from '../state/nav'
import { useLists, useStore } from '../state/store'
import { useBackup } from '../state/backup'
import { useT } from '../state/ui'

function BackupNudge({ days, onDismiss }: { days: number | null; onDismiss: () => void }) {
  const t = useT()
  const { setTab } = useNav()
  const { backupNow } = useBackup()
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
        <strong>{days === null ? t('Noch kein Backup') : t('Letztes Backup vor {n} Tagen', { n: days })}</strong>
        <p>{days === null ? t('Deine Daten liegen nur auf diesem Gerät. Sichere sie, bevor etwas verloren geht.') : t('Seitdem hat sich etwas geändert. Sichere deine Daten, bevor etwas verloren geht.')}</p>
        <div className="nudge__actions">
          <button className="btn btn--small btn--primary" onClick={() => void backupNow()}>
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

/** Übersicht der Listen mit Kacheln. Tippen öffnet die Liste. */
export function WishesScreen() {
  const t = useT()
  const { mine, listsOf } = useLists()
  const { lastBackupAt, changedSinceBackup, nudgeOpen, dispatch } = useStore()
  const { open } = useNav()
  const lists = listsOf('me')
  const [form, setForm] = useState(false)
  const [share, setShare] = useState(false)
  const [newList, setNewList] = useState(false)

  const backupDays = lastBackupAt ? daysAgo(lastBackupAt) : null
  const showNudge = nudgeOpen && changedSinceBackup && (backupDays === null ? mine.length > 0 : backupDays >= BACKUP_NUDGE_DAYS)
  const nudge = <AnimatePresence>{showNudge && <BackupNudge days={backupDays} onDismiss={() => dispatch({ type: 'ackNudge' })} />}</AnimatePresence>

  const rows = useMemo(() => lists.map((l) => ({ list: l, stats: listStats(mine.filter((i) => i.listId === l.id)) })), [lists, mine])

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
            <AddButton label={t('Wunsch')} onClick={() => setForm(true)} />
          </>
        }
      >
        {nudge}
        <ListStatsCard title={t('Alle Listen')} stats={listStats(mine)} />
        <Section
          title={t('Listen')}
          collapseId="wishes-lists"
          summary={t.n(rows.length, 'Liste', 'Listen')}
          aside={
            <button className="chip chip--button" onClick={() => open({ type: 'list', id: 'all' })}>
              <ListChecks size={14} /> {t('Alle Einträge')}
            </button>
          }
        >
          <ListTiles rows={rows} onOpen={(id) => open({ type: 'list', id })} onNew={() => setNewList(true)} />
        </Section>
      </Page>
      <Presence show={form}>{form && <ItemFormSheet key="new" owner="me" onClose={() => setForm(false)} />}</Presence>
      <Presence show={share}>{share && <ShareSheet onClose={() => setShare(false)} />}</Presence>
      <ListSheetHost open={newList} owner="me" onClose={() => setNewList(false)} onCreated={(id) => open({ type: 'list', id })} />
    </>
  )
}
