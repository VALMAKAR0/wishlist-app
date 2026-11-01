import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Archive, Bell, CalendarClock, Check, ChevronRight, DatabaseBackup, Flame, HardDriveDownload, Map, Palette, RefreshCw, RotateCcw, Share2, ShieldCheck, Smartphone, Trash2, Undo2,
} from 'lucide-react'
import { Page, Section } from '../components/Page'
import { Chip, Cover, EmptyState, Ring, Segmented, Switch } from '../components/Primitives'
import { APP_NAME, APP_VERSION, BACKUP_NUDGE_DAYS, TRASH_DAYS } from '../lib/brand'
import { clearSafetyCopies } from '../lib/backup'
import { BACKUP_DIR, AUTO_KEEP } from '../lib/backupFiles'
import { daysAgo, timeLabel } from '../lib/format'
import { checkPersist, usePersist } from '../lib/persist'
import { roadmap } from '../lib/plannedFeatures'
import type { FxSetting, Lang, ThemeSetting } from '../lib/types'
import { useBackup } from '../state/backup'
import { useNav } from '../state/nav'
import { useLists, useStore } from '../state/store'
import { useT, useUI } from '../state/ui'

const HUES = [14, 45, 150, 200, 265, 330]

function Row({ icon, title, text, right, onClick }: { icon: ReactNode; title: string; text?: string; right?: ReactNode; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className="row-item" onClick={onClick}>
      <span className="row-item__icon">{icon}</span>
      <span className="row-item__main">
        <strong>{title}</strong>
        {text && <small>{text}</small>}
      </span>
      {right ?? (onClick && <ChevronRight size={18} className="row-item__chev" />)}
    </Tag>
  )
}

export function MoreScreen() {
  const t = useT()
  const ui = useUI()
  const { settings, setSettings } = ui
  const { open, setTab } = useNav()
  const { lastBackupAt, dispatch, items, persons, storage } = useStore()
  const { trash, mine } = useLists()
  const [checking, setChecking] = useState(false)
  const persist = usePersist()
  const bk = useBackup()
  const fileRef = useRef<HTMLInputElement>(null)
  const [copies, setCopies] = useState<Awaited<ReturnType<typeof bk.listSafetyCopies>>>([])
  useEffect(() => {
    void bk.listSafetyCopies().then(setCopies).catch(() => setCopies([]))
  }, [bk.busy, lastBackupAt])

  const days = lastBackupAt ? daysAgo(lastBackupAt) : null
  const stale = days === null || days >= BACKUP_NUDGE_DAYS
  const archived = mine.filter((i) => i.bought).length

  const recheck = async () => {
    setChecking(true)
    ui.haptic(10)
    await Promise.all([checkPersist(true), new Promise((r) => setTimeout(r, 500))])
    setChecking(false)
  }

  const wipe = () =>
    ui.confirm({
      title: t('Alle Daten löschen?'),
      text: t('Wünsche, Personen, Ideen, Papierkorb, Archiv und erhaltene Listen werden endgültig entfernt. Mach vorher ein Backup.'),
      confirmLabel: t('Alles löschen'),
      tone: 'danger',
      hold: true,
      onConfirm: () => {
        void clearSafetyCopies().catch(() => undefined)
        dispatch({ type: 'wipe' })
        ui.toast({ message: t('Alle Daten gelöscht'), emoji: '🧹' })
      },
    })

  const loadDemo = () => {
    const apply = () => {
      void bk.safetyBefore('demo')
      dispatch({ type: 'loadDemo' })
      ui.toast({ message: t('Demo-Daten geladen'), emoji: '🎁' })
    }
    if (!items.length && !persons.length) return apply()
    ui.confirm({
      title: t('Demo-Daten laden?'),
      text: t('Deine echten Einträge werden durch Beispieldaten ersetzt. Mach vorher ein Backup.'),
      confirmLabel: t('Ersetzen'),
      tone: 'danger',
      hold: true,
      onConfirm: apply,
    })
  }

  return (
    <Page title={t('Mehr')} eyebrow={`${APP_NAME} · V${APP_VERSION}`} subtitle={t('Sicherheit, Aussehen und alles andere')}>
      <motion.aside className="preview-note" data-warn={storage === 'memory'} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Flame size={18} />
        <p>
          {storage === 'memory' ? (
            <>
              <strong>{t('Speichern nicht möglich.')}</strong> {t('Einträge gelten nur, bis du die App schließt.')}
            </>
          ) : (
            <>
              <strong>{t('Vorschau (V{v}).', { v: APP_VERSION.split('.').slice(0, 2).join('.') })}</strong> {t('Deine Einträge bleiben auf diesem Gerät gespeichert. Teilen und Erinnerungen folgen.')}{' '}
              <button onClick={() => open({ type: 'roadmap' })}>{t('Roadmap')}</button>
            </>
          )}
        </p>
      </motion.aside>

      <Section title={t('Sicherung')}>
        <div className="card spot">
          <div className="backup">
            <Ring value={days === null ? 0.04 : Math.max(0.06, 1 - Math.min(days, 30) / 30)} size={56} stroke={6} hue={stale ? 20 : 150}>
              <DatabaseBackup size={22} />
            </Ring>
            <div className="backup__text">
              <strong>{days === null ? t('Noch kein Backup') : days === 0 ? t('Heute gesichert') : t('Letztes Backup vor {n} Tagen', { n: days })}</strong>
              <span>{stale ? t('Ab {n} Tagen erinnert dich die App beim Start, sofern sich etwas geändert hat.', { n: BACKUP_NUDGE_DAYS }) : t('Alles im grünen Bereich.')}</span>
            </div>
          </div>
          <div className="row row--gap">
            <button className="btn btn--primary btn--grow" onClick={() => void bk.backupNow()} disabled={bk.busy}>
              <HardDriveDownload size={17} /> {t('Jetzt sichern')}
            </button>
            <button className="btn btn--ghost btn--grow" onClick={() => fileRef.current?.click()} disabled={bk.busy}>
              <RotateCcw size={17} /> {t('Wiederherstellen')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              hidden
              data-testid="restore-input"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void bk.restoreFile(f)
              }}
            />
          </div>
          {bk.native ? (
            <div className="setting">
              <div>
                <strong>{t('Automatisch sichern')}</strong>
                <p>{t('Täglich beim Start, wenn sich etwas geändert hat. Ordner: Dokumente/{dir}, die letzten {n} bleiben.', { dir: BACKUP_DIR, n: AUTO_KEEP })}</p>
              </div>
              <Switch checked={settings.autoBackup} onChange={(autoBackup) => setSettings({ autoBackup })} label={t('Automatisch sichern')} />
            </div>
          ) : (
            <Row icon={<RefreshCw size={18} />} title={t('Automatisch sichern')} text={t('Nur in der Android-App. Hier sicherst du von Hand.')} right={<Chip>Android</Chip>} />
          )}
        </div>

        {copies.length > 0 && (
          <div className="card spot">
            <strong className="card__title">{t('Interne Kopien')}</strong>
            {copies.map((c) => (
              <div key={c.id} className="row-item row-item--static">
                <span className="row-item__main">
                  <strong>{timeLabel(c.at)}</strong>
                  <small>
                    {c.reason === 'restore' ? t('vor dem Wiederherstellen') : t('vor den Demo-Daten')} · {t.n(c.counts.items, 'Eintrag', 'Einträge')}
                  </small>
                </span>
                <button className="btn btn--small btn--ghost" onClick={() => void bk.restoreSafety(c.id)} disabled={bk.busy}>
                  {t('Zurückholen')}
                </button>
              </div>
            ))}
            <p className="hint">{t('Bleiben nur auf diesem Gerät, es gibt die letzten 3. Das ersetzt kein Backup.')}</p>
          </div>
        )}

        <div className="card spot">
          <div className="persist">
            <span className="persist__icon" data-ok={persist.state === 'active' || persist.state === 'native'}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={checking ? 'busy' : 'idle'} initial={{ scale: 0.4, opacity: 0, rotate: -40 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                  {checking ? <RefreshCw size={22} className="spin" /> : <ShieldCheck size={22} />}
                </motion.span>
              </AnimatePresence>
            </span>
            <div className="backup__text">
              <strong>
                {t('Speicherschutz: {state}', {
                  state:
                    persist.state === 'active' ? t('aktiv')
                    : persist.state === 'inactive' ? t('nicht aktiv')
                    : persist.state === 'native' ? t('App-Speicher')
                    : persist.state === 'unsupported' ? t('nicht verfügbar')
                    : t('wird geprüft'),
                })}
              </strong>
              <span>{persist.at ? t('zuletzt geprüft: {date}', { date: timeLabel(persist.at) }) : t('noch nicht geprüft')}</span>
            </div>
          </div>
          <div className="row">
            <button className="btn btn--ghost btn--block" onClick={() => void recheck()} disabled={checking}>
              <RefreshCw size={16} className={checking ? 'spin' : undefined} /> {t('Status prüfen')}
            </button>
          </div>
          {(persist.state === 'inactive' || persist.state === 'unsupported') && (
            <p className="hint hint--warn">{t('Das System darf die Daten bei Speichermangel aufräumen. Mach regelmäßig ein Backup.')}</p>
          )}
          <p className="hint">
            {persist.state === 'native'
              ? t('In der Android-App liegen die Daten im geschützten App-Speicher. „Daten löschen“ oder Deinstallieren entfernt sie, ein Backup bleibt Pflicht.')
              : t('Der Schutz hilft nur gegen automatisches Aufräumen bei Speichermangel. Das Backup bleibt Pflicht.')}
          </p>
        </div>
      </Section>

      <Section title={t('Aufbewahrung')}>
        <div className="card">
          <Row icon={<Archive size={18} />} title={t('Archiv')} text={t.n(archived, 'gekaufter Wunsch', 'gekaufte Wünsche')} onClick={() => setTab('wishes')} />
          <Row icon={<Trash2 size={18} />} title={t('Papierkorb')} text={t('{count} · wird nach {n} Tagen geleert', { count: t.n(trash.length, 'Eintrag', 'Einträge'), n: TRASH_DAYS })} onClick={() => open({ type: 'trash' })} />
        </div>
      </Section>

      <Section title={t('Aussehen')}>
        <div className="card">
          <div className="setting setting--col">
            <div>
              <strong>{t('Sprache')}</strong>
            </div>
            <Segmented<Lang> id="lang" value={settings.lang} onChange={(lang) => setSettings({ lang })} options={[{ value: 'de', label: 'Deutsch' }, { value: 'en', label: 'English' }]} />
          </div>
          <div className="setting setting--col">
            <div>
              <strong>{t('Darstellung')}</strong>
            </div>
            <Segmented<ThemeSetting> id="theme" value={settings.theme} onChange={(theme) => setSettings({ theme })} options={[{ value: 'system', label: t('Auto') }, { value: 'dark', label: t('Dunkel') }, { value: 'light', label: t('Hell') }]} />
          </div>
          <div className="setting setting--col">
            <div>
              <strong>{t('Akzentfarbe')}</strong>
            </div>
            <div className="swatches swatches--left" role="radiogroup" aria-label={t('Akzentfarbe')}>
              {HUES.map((h) => (
                <button key={h} role="radio" aria-checked={settings.hue === h} aria-label={`${t('Akzentfarbe')} ${h}`} data-active={settings.hue === h} className="swatch swatch--color" style={{ ['--h' as string]: h }} onClick={() => setSettings({ hue: h })} />
              ))}
            </div>
          </div>
          <div className="setting setting--col">
            <div>
              <strong>{t('Effekte')}</strong>
              <p>{t('Weniger Bewegung spart Akku und ist ruhiger.')}</p>
            </div>
            <Segmented<FxSetting> id="fx" value={settings.fx} onChange={(fx) => setSettings({ fx })} options={[{ value: 'full', label: t('Voll') }, { value: 'calm', label: t('Dezent') }, { value: 'off', label: t('Aus') }]} />
          </div>
          <div className="setting">
            <div>
              <strong>{t('Offene Ideen im Budget zeigen')}</strong>
              <p>{t('Blendet in der Budget-Leiste einen hellen Balken mit der Summe der noch offenen Ideen ein.')}</p>
            </div>
            <Switch checked={settings.showPlanned} onChange={(showPlanned) => setSettings({ showPlanned })} label={t('Offene Ideen im Budget zeigen')} />
          </div>
        </div>
      </Section>

      <Section title={t('Erinnerungen')}>
        <div className="card">
          <div className="setting">
            <div>
              <strong>
                {t('Vor Anlässen erinnern')} <Chip tone="accent">V0.7</Chip>
              </strong>
              <p>{t('Android per Benachrichtigung, iPhone per Kalenderdatei. Die Einstellung ist schon da, die Erinnerungen folgen.')}</p>
            </div>
            <Switch checked={settings.remind} onChange={(remind) => setSettings({ remind })} label={t('Erinnerungen')} />
          </div>
          <AnimatePresence initial={false}>
            {settings.remind && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <div className="setting">
                  <div>
                    <strong>{t('Vorlauf')}</strong>
                  </div>
                  <div className="stepper">
                    <button onClick={() => setSettings({ remindDays: Math.max(1, settings.remindDays - 1) })} aria-label={t('Weniger Tage')}>
                      −
                    </button>
                    <b>{t('{n} Tage', { n: settings.remindDays })}</b>
                    <button onClick={() => setSettings({ remindDays: Math.min(30, settings.remindDays + 1) })} aria-label={t('Mehr Tage')}>
                      +
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <Row icon={<CalendarClock size={18} />} title={t('Kalenderdatei erzeugen')} text={t('Funktioniert auf iPhone und Android')} onClick={() => ui.planned('ics-export')} />
        </div>
      </Section>

      <Section title={t('App')}>
        <div className="card">
          <Row icon={<Smartphone size={18} />} title={t('Auf dem Home-Bildschirm installieren')} onClick={() => ui.planned('install-hint')} />
          <Row icon={<Share2 size={18} />} title={t('Links aus dem Browser teilen')} text={t('Nur Android')} right={<Chip tone="accent">V0.7</Chip>} onClick={() => ui.planned('share-link-in')} />
          <Row icon={<Bell size={18} />} title={t('Auf Updates prüfen')} text={t('Version {v}', { v: APP_VERSION })} onClick={() => ui.planned('update-check')} />
          <Row icon={<Map size={18} />} title={t('Roadmap')} text={t('Was als Nächstes kommt')} onClick={() => open({ type: 'roadmap' })} />
        </div>
      </Section>

      <Section title={t('Vorschau-Werkzeuge')}>
        <div className="card">
          <Row
            icon={<Palette size={18} />}
            title={t('Demo-Daten laden')}
            text={t('Ersetzt alle Daten durch Beispieldaten')}
            onClick={loadDemo}
          />
        </div>
      </Section>

      <Section title={t('Gefahrenzone')}>
        <button className="btn btn--danger-soft btn--block" onClick={wipe}>
          <Trash2 size={17} /> {t('Alle Daten löschen')}
        </button>
      </Section>
    </Page>
  )
}

export function TrashScreen() {
  const t = useT()
  const { trash } = useLists()
  const { dispatch } = useStore()
  const { back } = useNav()
  const ui = useUI()

  const left = (deletedAt: number) => Math.max(0, TRASH_DAYS - daysAgo(deletedAt))

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
      eyebrow={t('Automatisch nach {n} Tagen', { n: TRASH_DAYS })}
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
