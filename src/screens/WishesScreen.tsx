import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Presence } from '../components/Presence'
import { Plus, Share2, ShieldAlert, X } from 'lucide-react'
import { Fab, Page } from '../components/Page'
import { CountUp, EmptyState, Ring, Segmented } from '../components/Primitives'
import { ItemFormSheet } from '../components/ItemFormSheet'
import { ShareSheet } from '../components/ShareSheet'
import { BACKUP_NUDGE_DAYS } from '../lib/brand'
import { daysAgo, eur, plural } from '../lib/format'
import type { Item } from '../lib/types'
import { useLists, useStore } from '../state/store'
import { useUI } from '../state/ui'
import { useNav } from '../state/nav'
import { ItemList } from './shared'

type Seg = 'open' | 'done'

function BackupNudge({ days, onDismiss }: { days: number; onDismiss: () => void }) {
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
        <strong>Letztes Backup vor {days} Tagen</strong>
        <p>Seitdem hat sich etwas geändert. Sichere deine Daten, bevor etwas verloren geht.</p>
        <div className="nudge__actions">
          <button className="btn btn--small btn--primary" onClick={() => ui.planned('backup-now')}>
            Jetzt sichern
          </button>
          <button className="btn btn--small btn--ghost" onClick={() => setTab('more')}>
            Zu den Einstellungen
          </button>
        </div>
      </div>
      <button className="icon-btn icon-btn--sm" onClick={onDismiss} aria-label="Hinweis ausblenden">
        <X size={16} />
      </button>
    </motion.aside>
  )
}

export function WishesScreen() {
  const { wishesOpen, wishesDone } = useLists()
  const { lastBackupAt, changedSinceBackup } = useStore()
  const [seg, setSeg] = useState<Seg>('open')
  const [form, setForm] = useState<{ item: Item | null } | null>(null)
  const [share, setShare] = useState(false)
  const [nudgeHidden, setNudgeHidden] = useState(false)

  const total = wishesOpen.reduce((s, w) => s + (w.price ?? 0), 0)
  const all = wishesOpen.length + wishesDone.length
  const backupDays = lastBackupAt ? daysAgo(lastBackupAt) : null
  const showNudge = !nudgeHidden && changedSinceBackup && backupDays !== null && backupDays >= BACKUP_NUDGE_DAYS

  const list = seg === 'open' ? wishesOpen : wishesDone

  return (
    <>
      <Page
        title="Meine Wünsche"
        eyebrow="Zum Teilen"
        subtitle={all ? `${plural(wishesOpen.length, 'offener Wunsch', 'offene Wünsche')}` : 'Deine Liste ist noch leer'}
        actions={
          <button className="icon-btn" onClick={() => setShare(true)} aria-label="Wunschliste teilen">
            <Share2 size={19} />
          </button>
        }
        fab={<Fab label="Wunsch" icon={<Plus size={22} strokeWidth={2.6} />} onClick={() => setForm({ item: null })} />}
      >
        <AnimatePresence>{showNudge && <BackupNudge days={backupDays!} onDismiss={() => setNudgeHidden(true)} />}</AnimatePresence>

        {all > 0 && (
          <motion.section className="hero spot" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, type: 'spring', stiffness: 240, damping: 24 }}>
            <div className="hero__text">
              <span className="hero__label">Gesamtwert offen</span>
              <strong className="hero__value">
                <CountUp value={total} format={(n) => eur(Math.round(n))} />
              </strong>
              <span className="hero__note">
                {wishesDone.length} von {all} schon gekauft
              </span>
            </div>
            <Ring value={all ? wishesDone.length / all : 0} size={84} stroke={8} delay={0.35}>
              <span className="ring__num">
                <CountUp value={Math.round((all ? wishesDone.length / all : 0) * 100)} format={(n) => `${Math.round(n)}%`} />
              </span>
            </Ring>
          </motion.section>
        )}

        {all > 0 && (
          <div className="toolbar">
            <Segmented
              id="wishes"
              value={seg}
              onChange={setSeg}
              options={[
                { value: 'open', label: 'Offen', count: wishesOpen.length },
                { value: 'done', label: 'Archiv', count: wishesDone.length },
              ]}
            />
          </div>
        )}

        {list.length > 0 ? (
          <ItemList items={list} onOpen={(item) => setForm({ item })} />
        ) : (
          <EmptyState
            emoji={seg === 'open' ? '✨' : '🗂️'}
            title={seg === 'open' ? (all ? 'Alles erfüllt!' : 'Was wünschst du dir?') : 'Noch nichts im Archiv'}
            text={
              seg === 'open'
                ? all
                  ? 'Du hast jeden Wunsch abgehakt. Zeit für neue Ideen.'
                  : 'Lege deinen ersten Wunsch an und teile die Liste mit Familie und Freunden.'
                : 'Gekaufte Wünsche wandern automatisch hierher und bleiben, bis du sie löschst.'
            }
            action={
              seg === 'open' && (
                <button className="btn btn--primary" onClick={() => setForm({ item: null })}>
                  <Plus size={18} /> Ersten Wunsch anlegen
                </button>
              )
            }
          />
        )}
      </Page>

      <Presence show={!!form}>{form && <ItemFormSheet key={form.item?.id ?? 'new'} owner="me" item={form.item} onClose={() => setForm(null)} />}</Presence>
      <Presence show={share}>{share && <ShareSheet onClose={() => setShare(false)} />}</Presence>
    </>
  )
}
