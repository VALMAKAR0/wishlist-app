import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Archive, Bell, Check, DatabaseBackup, Flame, HardDriveDownload, Lock, Map, Palette, Search, SlidersHorizontal, Trash2, Undo2, Wallet, X,
} from 'lucide-react'
import { Page, Section } from '../components/Page'
import { Chip, Cover, EmptyState, Ring } from '../components/Primitives'
import { Row } from '../components/SettingsUi'
import { APP_NAME, APP_VERSION, BACKUP_NUDGE_DAYS } from '../lib/brand'
import { daysAgo, longDate } from '../lib/format'
import { roadmap } from '../lib/plannedFeatures'
import { PAGE_TITLES, searchSettings } from '../lib/settingsIndex'
import { useBackup } from '../state/backup'
import { useNav, type SettingsPageId } from '../state/nav'
import { useLists, useStore } from '../state/store'
import { useUpdate } from '../state/update'
import { useT, useUI } from '../state/ui'

const PAGE_ICONS: Record<SettingsPageId, typeof Bell> = {
  data: DatabaseBackup,
  look: Palette,
  money: Wallet,
  remind: Bell,
  privacy: Lock,
  app: SlidersHorizontal,
}

const PAGE_ORDER: SettingsPageId[] = ['data', 'look', 'money', 'remind', 'privacy', 'app']

let lastQuery = ''

export function MoreScreen() {
  const t = useT()
  const ui = useUI()
  const { settings } = ui
  const { open, setTab } = useNav()
  const { lastBackupAt, storage } = useStore()
  const { trash, mine } = useLists()
  const upd = useUpdate()
  const bk = useBackup()
  const [q, setQ] = useState(lastQuery)
  lastQuery = q

  const days = lastBackupAt ? daysAgo(lastBackupAt) : null
  const stale = days === null || days >= BACKUP_NUDGE_DAYS
  const archived = mine.filter((i) => i.bought).length
  const hits = searchSettings(q, t)

  const dateExample = settings.dateFmt === 'auto' ? t('Automatisch') : longDate(Date.now())
  const summary: Record<SettingsPageId, string> = {
    data: days === null ? t('Noch kein Backup') : days === 0 ? t('Heute gesichert') : t('Backup vor {n} Tagen', { n: days }),
    look: `${settings.theme === 'system' ? t('Auto') : settings.theme === 'dark' ? t('Dunkel') : t('Hell')} · ${settings.lang === 'de' ? 'Deutsch' : 'English'}`,
    money: `${settings.currency} · ${dateExample}`,
    remind: settings.remindOn ? t('An · {n} Vorlauf', { n: settings.remindDays.length }) : t('Aus'),
    privacy: settings.lockHash ? t('Sperre an') : t('Keine Sperre'),
    app: upd.available ? t('Update verfügbar') : t('Version {v}', { v: APP_VERSION }),
  }

  return (
    <Page title={t('Mehr')} eyebrow={`${APP_NAME} · V${APP_VERSION}`} subtitle={t('Einstellungen und alles andere')}>
      <motion.aside className="preview-note" data-warn={storage === 'memory'} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Flame size={18} />
        <p>
          {storage === 'memory' ? (
            <>
              <strong>{t('Speichern nicht möglich.')}</strong> {t('Einträge gelten nur, bis du die App schließt.')}
            </>
          ) : (
            <>
              <strong>{t('Vorschau (V{v}).', { v: APP_VERSION.split('.').slice(0, 2).join('.') })}</strong> {t('Deine Einträge bleiben auf diesem Gerät gespeichert. Installieren wie eine App folgt.')}{' '}
              <button onClick={() => open({ type: 'roadmap' })}>{t('Roadmap')}</button>
            </>
          )}
        </p>
      </motion.aside>

      <div className="card spot bkmini">
        <Ring value={days === null ? 0.04 : Math.max(0.06, 1 - Math.min(days, 30) / 30)} size={44} stroke={5} hue={stale ? 20 : 150}>
          <DatabaseBackup size={18} />
        </Ring>
        <div className="backup__text">
          <strong>{days === null ? t('Noch kein Backup') : days === 0 ? t('Heute gesichert') : t('Letztes Backup vor {n} Tagen', { n: days })}</strong>
          <span>{stale ? t('Zeit für ein neues Backup.') : t('Alles im grünen Bereich.')}</span>
        </div>
        <button className="btn btn--primary btn--small" onClick={() => void bk.backupNow()} disabled={bk.busy}>
          <HardDriveDownload size={15} /> {t('Sichern')}
        </button>
      </div>

      <div className="setsearch">
        <Search size={16} aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Einstellung suchen')} aria-label={t('Einstellung suchen')} data-testid="settings-search" />
        {q && (
          <button className="icon-btn" onClick={() => setQ('')} aria-label={t('Suche leeren')}>
            <X size={15} />
          </button>
        )}
      </div>

      {q.trim() ? (
        <div className="card" data-testid="search-results">
          {hits.length === 0 && <p className="hint hint--pad">{t('Nichts gefunden.')}</p>}
          {hits.map((h) => {
            const Icon = PAGE_ICONS[h.page]
            return <Row key={`${h.page}:${h.label}`} icon={<Icon size={18} />} title={t(h.label)} text={t(PAGE_TITLES[h.page])} onClick={() => open({ type: 'settings', page: h.page })} />
          })}
        </div>
      ) : (
        <>
          <div className="settiles">
            {PAGE_ORDER.map((p) => {
              const Icon = PAGE_ICONS[p]
              return (
                <button key={p} className="settile spot" onClick={() => open({ type: 'settings', page: p })} data-testid={`tile-${p}`}>
                  <span className="settile__icon">
                    <Icon size={20} />
                    {p === 'app' && upd.available && <i className="settile__dot" aria-label={t('Update verfügbar')} />}
                  </span>
                  <strong>{t(PAGE_TITLES[p])}</strong>
                  <small>{summary[p]}</small>
                </button>
              )
            })}
          </div>

          <Section title={t('Aufbewahrung')}>
            <div className="card">
              <Row icon={<Archive size={18} />} title={t('Archiv')} text={t.n(archived, 'gekaufter Wunsch', 'gekaufte Wünsche')} onClick={() => setTab('wishes')} />
              <Row icon={<Trash2 size={18} />} title={t('Papierkorb')} text={t('{count} · wird nach {n} Tagen geleert', { count: t.n(trash.length, 'Eintrag', 'Einträge'), n: settings.trashDays })} onClick={() => open({ type: 'trash' })} />
              <Row icon={<Map size={18} />} title={t('Roadmap')} text={t('Was als Nächstes kommt')} onClick={() => open({ type: 'roadmap' })} />
            </div>
          </Section>
        </>
      )}
    </Page>
  )
}

export function TrashScreen() {
  const t = useT()
  const { trash } = useLists()
  const { dispatch } = useStore()
  const { back } = useNav()
  const ui = useUI()

  const left = (deletedAt: number) => Math.max(0, ui.settings.trashDays - daysAgo(deletedAt))

  const empty = () =>
    ui.confirm({
      title: t('Papierkorb leeren?'),
      text: t('{count} endgültig gelöscht.', { count: t.n(trash.length, 'Eintrag wird', 'Einträge werden') }),
      confirmLabel: t('Leeren'),
      tone: 'danger',
      onConfirm: () => {
        dispatch({ type: 'emptyTrash' })
        ui.toast({ message: t('Papierkorb geleert'), emoji: '🧹' })
      },
    })

  return (
    <Page
      title={t('Papierkorb')}
      eyebrow={t('Automatisch nach {n} Tagen', { n: ui.settings.trashDays })}
      subtitle={trash.length ? t.n(trash.length, 'Eintrag', 'Einträge') : undefined}
      onBack={back}
      actions={
        trash.length > 0 && (
          <button className="btn btn--small btn--ghost" onClick={empty}>
            {t('Leeren')}
          </button>
        )
      }
    >
      {trash.length > 0 ? (
        <ul className="group">
          <AnimatePresence>
            {trash.map((it, i) => {
              const d = left(it.deletedAt!)
              return (
                <motion.li key={it.id} className="item item--static" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 60, height: 0, marginBottom: 0, overflow: 'hidden', pointerEvents: 'none', transition: { duration: 0.22 } }} transition={{ type: 'spring', stiffness: 300, damping: 28, delay: i * 0.05 }}>
                  <Cover emoji={it.emoji} hue={it.hue} size={40} imageId={it.imageId} />
                  <div className="item__main">
                    <span className="item__name">{it.name}</span>
                    <div className="item__meta">
                      <Chip tone={d <= 5 ? 'warn' : 'neutral'}>{t('noch {n}', { n: t.n(d, 'Tag', 'Tage') })}</Chip>
                    </div>
                  </div>
                  <button
                    className="icon-btn"
                    aria-label={t('Wiederherstellen')}
                    onClick={() => {
                      dispatch({ type: 'restoreItem', id: it.id })
                      ui.toast({ message: t('„{name}“ wiederhergestellt', { name: it.name }), emoji: '♻️' })
                    }}
                  >
                    <Undo2 size={17} />
                  </button>
                  <button
                    className="icon-btn icon-btn--danger"
                    aria-label={t('Endgültig löschen')}
                    onClick={() =>
                      ui.confirm({
                        title: t('Endgültig löschen?'),
                        text: t('„{name}“ lässt sich danach nicht mehr wiederherstellen.', { name: it.name }),
                        confirmLabel: t('Löschen'),
                        tone: 'danger',
                        onConfirm: () => dispatch({ type: 'purgeItem', id: it.id }),
                      })
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      ) : (
        <EmptyState emoji="🍃" title={t('Der Papierkorb ist leer')} text={t('Gelöschte Einträge bleiben hier 30 Tage, bevor sie endgültig verschwinden.')} />
      )}
    </Page>
  )
}

export function RoadmapScreen() {
  const t = useT()
  const { back } = useNav()
  return (
    <Page title={t('Roadmap')} eyebrow={t('Vom Design zur App')} subtitle={t('Erst das Gefühl, dann die Logik')} onBack={back}>
      <ol className="timeline">
        {roadmap.map((s, i) => {
          const current = s.version === `V${APP_VERSION.split('.').slice(0, 2).join('.')}`
          return (
            <motion.li key={s.version} className="timeline__item" data-current={current} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 + i * 0.07, type: 'spring', stiffness: 260, damping: 24 }}>
              <span className="timeline__dot">{current ? <Check size={12} strokeWidth={3.5} /> : null}</span>
              <div className="timeline__card spot">
                <div className="timeline__head">
                  <Chip tone={current ? 'accent' : 'neutral'}>{s.version}</Chip>
                  <strong>{t(s.title)}</strong>
                </div>
                <p>{t(s.text)}</p>
              </div>
            </motion.li>
          )
        })}
      </ol>
    </Page>
  )
}
