import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Archive, Bell, CalendarClock, Check, ChevronRight, DatabaseBackup, Flame, HardDriveDownload, Map, Palette, RefreshCw, RotateCcw, ShieldCheck, Smartphone, Trash2, Undo2,
} from 'lucide-react'
import { Page, Section } from '../components/Page'
import { Chip, Cover, EmptyState, Ring, Segmented, Switch } from '../components/Primitives'
import { APP_NAME, APP_VERSION, BACKUP_NUDGE_DAYS, TRASH_DAYS } from '../lib/brand'
import { daysAgo, plural, timeLabel } from '../lib/format'
import { roadmap } from '../lib/plannedFeatures'
import type { FxSetting, ThemeSetting } from '../lib/types'
import { useNav } from '../state/nav'
import { useLists, useStore } from '../state/store'
import { useUI } from '../state/ui'

const HUES = [14, 45, 150, 200, 265, 330]

function Row({ icon, title, text, right, onClick }: { icon: React.ReactNode; title: string; text?: string; right?: React.ReactNode; onClick?: () => void }) {
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
  const ui = useUI()
  const { settings, setSettings } = ui
  const { open, setTab } = useNav()
  const { lastBackupAt, dispatch, items } = useStore()
  const { trash, wishesDone } = useLists()
  const [checking, setChecking] = useState(false)
  const [persist, setPersist] = useState<{ ok: boolean; at: number }>({ ok: true, at: Date.now() - 3_600_000 })

  const days = lastBackupAt ? daysAgo(lastBackupAt) : null
  const stale = days === null || days >= BACKUP_NUDGE_DAYS

  // Vorschau: Die echte Abfrage von storage.persisted() kommt in V0.5.
  const checkPersist = () => {
    setChecking(true)
    ui.haptic(10)
    setTimeout(() => {
      setPersist({ ok: true, at: Date.now() })
      setChecking(false)
    }, 1100)
  }

  const wipe = () =>
    ui.confirm({
      title: 'Alle Daten löschen?',
      text: 'Wünsche, Personen, Ideen, Papierkorb, Archiv und erhaltene Listen werden endgültig entfernt. Mach vorher ein Backup.',
      confirmLabel: 'Alles löschen',
      tone: 'danger',
      hold: true,
      onConfirm: () => {
        dispatch({ type: 'wipe' })
        ui.toast({ message: 'Alle Daten gelöscht', emoji: '🧹' })
      },
    })

  return (
    <Page title="Mehr" eyebrow={`${APP_NAME} · V${APP_VERSION}`} subtitle="Sicherheit, Aussehen und alles andere">
      <motion.aside className="preview-note" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Flame size={18} />
        <p>
          <strong>Design-Vorschau (V0.1).</strong> Bedienen und Animationen sind echt, gespeichert wird noch nichts.{' '}
          <button onClick={() => ui.planned('save-persist')}>Mehr dazu</button>
        </p>
      </motion.aside>

      <Section title="Sicherung">
        <div className="card spot">
          <div className="backup">
            <Ring value={days === null ? 0.04 : Math.max(0.06, 1 - Math.min(days, 30) / 30)} size={56} stroke={6} hue={stale ? 20 : 150}>
              <DatabaseBackup size={22} />
            </Ring>
            <div className="backup__text">
              <strong>{days === null ? 'Noch kein Backup' : days === 0 ? 'Heute gesichert' : `Letztes Backup vor ${days} Tagen`}</strong>
              <span>{stale ? `Ab ${BACKUP_NUDGE_DAYS} Tagen erinnert dich die App, sofern sich etwas geändert hat.` : 'Alles im grünen Bereich.'}</span>
            </div>
          </div>
          <div className="row row--gap">
            <button className="btn btn--primary btn--grow" onClick={() => ui.planned('backup-now')}>
              <HardDriveDownload size={18} /> Jetzt sichern
            </button>
            <button className="btn btn--ghost btn--grow" onClick={() => ui.planned('backup-restore')}>
              <RotateCcw size={18} /> Wiederherstellen
            </button>
          </div>
          <Row icon={<RefreshCw size={18} />} title="Automatisch sichern" text="Nur auf Android, täglich bei Änderungen" right={<Chip tone="accent">V0.7</Chip>} onClick={() => ui.planned('backup-auto')} />
        </div>

        <div className="card spot">
          <div className="persist">
            <span className="persist__icon" data-ok={persist.ok}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={checking ? 'busy' : 'idle'} initial={{ scale: 0.4, opacity: 0, rotate: -40 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                  {checking ? <RefreshCw size={22} className="spin" /> : <ShieldCheck size={22} />}
                </motion.span>
              </AnimatePresence>
            </span>
            <div className="backup__text">
              <strong>Speicherschutz: {persist.ok ? 'aktiv' : 'nicht aktiv'}</strong>
              <span>zuletzt geprüft: {timeLabel(persist.at)} · <em className="demo-tag">Demo-Wert</em></span>
            </div>
          </div>
          <div className="row">
            <button className="btn btn--ghost btn--block" onClick={checkPersist} disabled={checking}>
              <RefreshCw size={16} className={checking ? 'spin' : undefined} /> Status prüfen
            </button>
          </div>
          <p className="hint">Der Schutz hilft nur gegen automatisches Aufräumen bei Speichermangel. Das Backup bleibt Pflicht.</p>
        </div>
      </Section>

      <Section title="Aufbewahrung">
        <div className="card">
          <Row icon={<Archive size={18} />} title="Archiv" text={`${plural(wishesDone.length, 'gekaufter Wunsch', 'gekaufte Wünsche')}`} onClick={() => setTab('wishes')} />
          <Row icon={<Trash2 size={18} />} title="Papierkorb" text={`${plural(trash.length, 'Eintrag', 'Einträge')} · wird nach ${TRASH_DAYS} Tagen geleert`} onClick={() => open({ type: 'trash' })} />
        </div>
      </Section>

      <Section title="Aussehen">
        <div className="card">
          <div className="setting setting--col">
            <div><strong>Darstellung</strong></div>
            <Segmented<ThemeSetting> id="theme" value={settings.theme} onChange={(theme) => setSettings({ theme })} options={[{ value: 'system', label: 'Auto' }, { value: 'dark', label: 'Dunkel' }, { value: 'light', label: 'Hell' }]} />
          </div>
          <div className="setting setting--col">
            <div><strong>Akzentfarbe</strong></div>
            <div className="swatches swatches--left" role="radiogroup" aria-label="Akzentfarbe">
              {HUES.map((h) => (
                <button key={h} role="radio" aria-checked={settings.hue === h} aria-label={`Akzent ${h}`} data-active={settings.hue === h} className="swatch swatch--color" style={{ ['--h' as string]: h }} onClick={() => setSettings({ hue: h })} />
              ))}
            </div>
          </div>
          <div className="setting setting--col">
            <div>
              <strong>Effekte</strong>
              <p>Weniger Bewegung spart Akku und ist ruhiger.</p>
            </div>
            <Segmented<FxSetting> id="fx" value={settings.fx} onChange={(fx) => setSettings({ fx })} options={[{ value: 'full', label: 'Voll' }, { value: 'calm', label: 'Dezent' }, { value: 'off', label: 'Aus' }]} />
          </div>
        </div>
      </Section>

      <Section title="Erinnerungen">
        <div className="card">
          <div className="setting">
            <div>
              <strong>
                Vor Anlässen erinnern <Chip tone="accent">V0.7</Chip>
              </strong>
              <p>Android per Benachrichtigung, iPhone per Kalenderdatei. Die Einstellung ist schon da, die Erinnerungen folgen.</p>
            </div>
            <Switch checked={settings.remind} onChange={(remind) => setSettings({ remind })} label="Erinnerungen" />
          </div>
          <AnimatePresence initial={false}>
            {settings.remind && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <div className="setting">
                  <div><strong>Vorlauf</strong></div>
                  <div className="stepper">
                    <button onClick={() => setSettings({ remindDays: Math.max(1, settings.remindDays - 1) })} aria-label="Weniger Tage">−</button>
                    <b>{settings.remindDays} Tage</b>
                    <button onClick={() => setSettings({ remindDays: Math.min(30, settings.remindDays + 1) })} aria-label="Mehr Tage">+</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <Row icon={<CalendarClock size={18} />} title="Kalenderdatei erzeugen" text="Funktioniert auf iPhone und Android" onClick={() => ui.planned('ics-export')} />
        </div>
      </Section>

      <Section title="App">
        <div className="card">
          <Row icon={<Smartphone size={18} />} title="Auf dem Home-Bildschirm installieren" onClick={() => ui.planned('install-hint')} />
          <Row icon={<Bell size={18} />} title="Auf Updates prüfen" text={`Version ${APP_VERSION}`} onClick={() => ui.planned('update-check')} />
          <Row icon={<Map size={18} />} title="Roadmap" text="Was als Nächstes kommt" onClick={() => open({ type: 'roadmap' })} />
        </div>
      </Section>

      <Section title="Vorschau-Werkzeuge">
        <div className="card">
          <Row icon={<Palette size={18} />} title="Demo-Daten laden" text="Setzt alles auf die Beispieldaten zurück" onClick={() => { dispatch({ type: 'loadDemo' }); ui.toast({ message: 'Demo-Daten geladen', emoji: '🎁' }) }} />
          <Row icon={<Undo2 size={18} />} title="Leere App ansehen" text={`${items.length} Einträge werden ausgeblendet`} onClick={() => { dispatch({ type: 'wipe' }); ui.toast({ message: 'Leere App geladen' , emoji: '🧹' }) }} />
        </div>
      </Section>

      <Section title="Gefahrenzone">
        <button className="btn btn--danger-soft btn--block" onClick={wipe}>
          <Trash2 size={18} /> Alle Daten löschen
        </button>
      </Section>
    </Page>
  )
}

export function TrashScreen() {
  const { trash } = useLists()
  const { dispatch } = useStore()
  const { back } = useNav()
  const ui = useUI()

  const left = (deletedAt: number) => Math.max(0, TRASH_DAYS - daysAgo(deletedAt))

  const empty = () =>
    ui.confirm({
      title: 'Papierkorb leeren?',
      text: `${plural(trash.length, 'Eintrag wird', 'Einträge werden')} endgültig gelöscht.`,
      confirmLabel: 'Leeren',
      tone: 'danger',
      onConfirm: () => {
        dispatch({ type: 'emptyTrash' })
        ui.toast({ message: 'Papierkorb geleert', emoji: '🧹' })
      },
    })

  return (
    <Page
      title="Papierkorb"
      eyebrow={`Automatisch nach ${TRASH_DAYS} Tagen`}
      subtitle={trash.length ? plural(trash.length, 'Eintrag', 'Einträge') : undefined}
      onBack={back}
      actions={
        trash.length > 0 && (
          <button className="btn btn--small btn--ghost" onClick={empty}>
            Leeren
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
                  <Cover emoji={it.emoji} hue={it.hue} size={40} />
                  <div className="item__main">
                    <span className="item__name">{it.name}</span>
                    <div className="item__meta">
                      <Chip tone={d <= 5 ? 'warn' : 'neutral'}>noch {plural(d, 'Tag', 'Tage')}</Chip>
                    </div>
                  </div>
                  <button className="icon-btn" aria-label="Wiederherstellen" onClick={() => { dispatch({ type: 'restoreItem', id: it.id }); ui.toast({ message: `„${it.name}“ wiederhergestellt`, emoji: '♻️' }) }}>
                    <Undo2 size={18} />
                  </button>
                  <button className="icon-btn icon-btn--danger" aria-label="Endgültig löschen" onClick={() => ui.confirm({ title: 'Endgültig löschen?', text: `„${it.name}“ lässt sich danach nicht mehr wiederherstellen.`, confirmLabel: 'Löschen', tone: 'danger', onConfirm: () => dispatch({ type: 'purgeItem', id: it.id }) })}>
                    <Trash2 size={18} />
                  </button>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      ) : (
        <EmptyState emoji="🍃" title="Der Papierkorb ist leer" text="Gelöschte Einträge bleiben hier 30 Tage, bevor sie endgültig verschwinden." />
      )}
    </Page>
  )
}

export function RoadmapScreen() {
  const { back } = useNav()
  return (
    <Page title="Roadmap" eyebrow="Vom Design zur App" subtitle="Erst das Gefühl, dann die Logik" onBack={back}>
      <ol className="timeline">
        {roadmap.map((s, i) => {
          const current = i === 0
          return (
            <motion.li key={s.version} className="timeline__item" data-current={current} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 + i * 0.07, type: 'spring', stiffness: 260, damping: 24 }}>
              <span className="timeline__dot">{current ? <Check size={12} strokeWidth={3.5} /> : null}</span>
              <div className="timeline__card spot">
                <div className="timeline__head">
                  <Chip tone={current ? 'accent' : 'neutral'}>{s.version}</Chip>
                  <strong>{s.title}</strong>
                </div>
                <p>{s.text}</p>
              </div>
            </motion.li>
          )
        })}
      </ol>
    </Page>
  )
}
