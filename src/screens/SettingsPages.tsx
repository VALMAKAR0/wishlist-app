import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertTriangle, Archive, Bell, CalendarClock, Check, Clock, DatabaseBackup, FileDown, HardDriveDownload, Link2, Lock, Map, Palette, RefreshCw, RotateCcw, Share2, ShieldCheck, Smartphone, Trash2,
} from 'lucide-react'
import { Page, Section } from '../components/Page'
import { Presence } from '../components/Presence'
import { useCalendarFile } from '../components/CalendarFile'
import { InstallSheet } from '../components/InstallSheet'
import { LinkTestSheet } from '../components/LinkTestSheet'
import { netReason } from '../lib/netReason'
import { promptInstall, useInstall } from '../lib/install'
import { ReminderSettings } from '../components/ReminderSettings'
import { Chip, Ring, Segmented, Switch } from '../components/Primitives'
import { ChipChoice, Choice, Row, SwitchRow } from '../components/SettingsUi'
import { ExportSheet, PinSheet, type PinMode } from '../components/SettingsSheets'
import { LOCK_EVENT } from '../components/AppLock'
import { APP_VERSION, BACKUP_NUDGE_DAYS } from '../lib/brand'
import { clearSafetyCopies } from '../lib/backup'
import { BACKUP_DIR } from '../lib/backupFiles'
import { CURRENCIES, agoLabel, daysAgo, longDate, timeLabel } from '../lib/format'
import { lockAvailable } from '../lib/lock'
import { checkPersist, usePersist } from '../lib/persist'
import { KEEP_CHOICES, LOCK_CHOICES, TRASH_CHOICES } from '../lib/settings'
import { fetchRates } from '../lib/rates'
import type { DateFmt, FontScale, FxSetting, Lang, SortMode, StartTab, ThemeSetting } from '../lib/types'
import { useBackup } from '../state/backup'
import { useUpdate } from '../state/update'
import { useNav, type SettingsPageId } from '../state/nav'
import { useLists, useStore } from '../state/store'
import { useT, useUI } from '../state/ui'

const HUES = [14, 45, 150, 200, 265, 330]

export function SettingsPage({ page }: { page: SettingsPageId }) {
  return page === 'data' ? <DataPage /> : page === 'look' ? <LookPage /> : page === 'money' ? <MoneyPage /> : page === 'remind' ? <RemindPage /> : page === 'privacy' ? <PrivacyPage /> : <AppPage />
}

function SubPage({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const t = useT()
  const { back } = useNav()
  return (
    <Page title={title} eyebrow={t('Mehr')} subtitle={subtitle} onBack={back}>
      {children}
    </Page>
  )
}

// ---- Sicherung und Daten
function DataPage() {
  const t = useT()
  const ui = useUI()
  const { settings, setSettings } = ui
  const { open, setTab } = useNav()
  const { lastBackupAt, dispatch } = useStore()
  const { trash, mine } = useLists()
  const [checking, setChecking] = useState(false)
  const [exporting, setExporting] = useState(false)
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

  return (
    <SubPage title={t('Sicherung und Daten')} subtitle={t('Backup, Papierkorb, Export')}>
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
                <p>{t('Täglich beim Start, wenn sich etwas geändert hat. Ordner: Dokumente/{dir}, die letzten {n} bleiben.', { dir: BACKUP_DIR, n: settings.autoKeep })}</p>
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
          <Row icon={<Trash2 size={18} />} title={t('Papierkorb')} text={t('{count} · wird nach {n} Tagen geleert', { count: t.n(trash.length, 'Eintrag', 'Einträge'), n: settings.trashDays })} onClick={() => open({ type: 'trash' })} />
          <Choice title={t('Papierkorb-Frist')} text={t('So lange bleiben gelöschte Einträge zurückholbar. Eine kürzere Frist wirkt beim nächsten Start.')}>
            <ChipChoice<number> label={t('Papierkorb-Frist')} value={settings.trashDays} onChange={(trashDays) => setSettings({ trashDays })} options={TRASH_CHOICES.map((n) => ({ value: n, label: t('{n} Tage', { n }) }))} />
          </Choice>
          {bk.native && (
            <Choice title={t('Automatische Backups behalten')} text={t('Ältere Dateien in Dokumente/{dir} werden gelöscht.', { dir: BACKUP_DIR })}>
              <ChipChoice<number> label={t('Automatische Backups behalten')} value={settings.autoKeep} onChange={(autoKeep) => setSettings({ autoKeep })} options={KEEP_CHOICES.map((n) => ({ value: n, label: String(n) }))} />
            </Choice>
          )}
        </div>
      </Section>

      <Section title={t('Export')}>
        <div className="card">
          <Row icon={<FileDown size={18} />} title={t('Daten exportieren')} text={t('Wünsche und Ideen als CSV oder Text')} onClick={() => setExporting(true)} />
        </div>
      </Section>

      <Section title={t('Gefahrenzone')}>
        <button className="btn btn--danger-soft btn--block" onClick={wipe}>
          <Trash2 size={17} /> {t('Alle Daten löschen')}
        </button>
      </Section>
      <Presence show={exporting}>{exporting && <ExportSheet onClose={() => setExporting(false)} />}</Presence>
    </SubPage>
  )
}

// ---- Aussehen und Anzeige
function LookPage() {
  const t = useT()
  const { settings, setSettings } = useUI()
  return (
    <SubPage title={t('Aussehen und Anzeige')} subtitle={t('Sprache, Farben, Schrift und Verhalten')}>
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
          <Choice title={t('Schriftgröße')} text={t('Gilt für alle Texte in der App.')}>
            <ChipChoice<FontScale>
              label={t('Schriftgröße')}
              value={settings.fontScale}
              onChange={(fontScale) => setSettings({ fontScale })}
              options={[{ value: 'small', label: t('Klein') }, { value: 'normal', label: t('Normal') }, { value: 'large', label: t('Groß') }, { value: 'xl', label: t('Sehr groß') }]}
            />
          </Choice>
          <SwitchRow title={t('Vibration')} text={t('Kurzes Feedback bei Aktionen. Bei „Effekte: Aus“ bleibt es immer still.')} checked={settings.haptics} onChange={(haptics) => setSettings({ haptics })} />
        </div>
      </Section>

      <Section title={t('Anzeige')}>
        <div className="card">
          <SwitchRow title={t('Offene Ideen im Budget zeigen')} text={t('Blendet in der Budget-Leiste einen hellen Balken mit der Summe der noch offenen Ideen ein.')} checked={settings.showPlanned} onChange={(showPlanned) => setSettings({ showPlanned })} />
          <Choice title={t('Start-Reiter')} text={t('Was beim Öffnen der App zuerst erscheint.')}>
            <ChipChoice<StartTab>
              label={t('Start-Reiter')}
              value={settings.startTab}
              onChange={(startTab) => setSettings({ startTab })}
              options={[{ value: 'wishes', label: t('Wünsche') }, { value: 'ideas', label: t('Ideen') }, { value: 'received', label: t('Erhalten') }, { value: 'stats', label: t('Statistik') }, { value: 'last', label: t('Zuletzt benutzt') }]}
            />
          </Choice>
          <Choice title={t('Sortierung')} text={t('Reihenfolge der offenen Einträge in Listen.')}>
            <ChipChoice<SortMode>
              label={t('Sortierung')}
              value={settings.sort}
              onChange={(sort) => setSettings({ sort })}
              options={[{ value: 'new', label: t('Neueste zuerst') }, { value: 'old', label: t('Älteste zuerst') }, { value: 'name', label: t('Name A–Z') }, { value: 'priceDown', label: t('Teuerste zuerst') }, { value: 'priceUp', label: t('Günstigste zuerst') }]}
            />
          </Choice>
        </div>
      </Section>
    </SubPage>
  )
}

// ---- Währung und Format
function MoneyPage() {
  const t = useT()
  const ui = useUI()
  const { settings, setSettings } = ui
  const { items, received } = useStore()
  const main = settings.currency
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const used = new Set<string>(['EUR', main])
  for (const i of items) if (i.currency) used.add(i.currency)
  for (const r of received) for (const l of r.lists) for (const x of l.items) if (x.cur) used.add(x.cur)
  const rows = CURRENCIES.filter((c) => used.has(c) && c !== main)
  const rateMain = main === 'EUR' ? 1 : settings.rates[main]
  const perMain = (c: string): number | undefined => {
    const rc = c === 'EUR' ? 1 : settings.rates[c]
    return rc && rateMain ? rc / rateMain : undefined
  }
  const show = (n: number) => String(Math.round(n * 1e6) / 1e6).replace('.', ',')

  const commit = (c: string) => {
    const raw = drafts[c]
    if (raw === undefined) return
    const x = Number(raw.replace(',', '.'))
    setDrafts((d) => {
      const n = { ...d }
      delete n[c]
      return n
    })
    if (!Number.isFinite(x) || x <= 0) return
    if (c === 'EUR') {
      if (main !== 'EUR') setSettings({ rates: { ...settings.rates, [main]: 1 / x }, ratesAt: Date.now() })
    } else if (rateMain) {
      setSettings({ rates: { ...settings.rates, [c]: x * rateMain }, ratesAt: Date.now() })
    }
  }

  const load = async () => {
    setBusy(true)
    try {
      const rates = await fetchRates()
      setSettings({ rates, ratesAt: Date.now() })
      ui.toast({ message: t('Kurse aktualisiert'), emoji: '💱' })
    } catch (e) {
      const raw = e instanceof Error ? e.message : ''
      const why = netReason(raw)
      ui.toast({ message: t('Kurse konnten nicht geladen werden. Bist du online?') + (why ? ` ${t(why)}` : /^\d{3}$/.test(raw) ? ` (HTTP ${raw})` : ''), emoji: '📡' })
    } finally {
      setBusy(false)
    }
  }

  const now = Date.now()
  const missing = rows.some((c) => perMain(c) === undefined)
  return (
    <SubPage title={t('Währung und Format')} subtitle={t('Hauptwährung, Kurse und Datum')}>
      <Section title={t('Hauptwährung')}>
        <div className="card">
          <Choice title={t('Hauptwährung')} text={t('Summen, Budget und Statistik rechnen alles in diese Währung um. Jeder Preis behält seine eigene.')}>
            <ChipChoice<string> label={t('Hauptwährung')} value={main} onChange={(currency) => setSettings({ currency })} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
          </Choice>
        </div>
      </Section>

      <Section title={t('Wechselkurse')}>
        <div className="card">
          {rows.length === 0 && <p className="hint hint--pad">{t('Alle Preise sind in der Hauptwährung. Wähle beim Preis eine andere Währung, dann erscheint sie hier.')}</p>}
          {rows.map((c) => {
            const v = perMain(c)
            const locked = c !== 'EUR' && !rateMain
            return (
              <div key={c} className="setting rate-row">
                <div>
                  <strong>
                    1 {main} =
                  </strong>
                </div>
                <div className="rate-row__in">
                  <input
                    inputMode="decimal"
                    aria-label={t('Kurs {cur}', { cur: c })}
                    disabled={locked}
                    placeholder={t('fehlt')}
                    value={drafts[c] ?? (v === undefined ? '' : show(v))}
                    onChange={(e) => setDrafts((d) => ({ ...d, [c]: e.target.value.replace(/[^0-9.,]/g, '') }))}
                    onBlur={() => commit(c)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  />
                  <b>{c}</b>
                </div>
              </div>
            )
          })}
          {missing && <p className="hint hint--warn hint--pad">{t('Ohne Kurs zählt der Betrag unverändert in der Summe. Trag ihn ein oder hol die aktuellen Kurse.')}</p>}
          <div className="setting">
            <div>
              <strong>{t('Kurse online holen')}</strong>
              <p>{settings.ratesAt ? t('Stand: {when}', { when: timeLabel(settings.ratesAt) }) : t('Noch nie geladen')}</p>
            </div>
            <button className="btn btn--ghost btn--small" onClick={() => void load()} disabled={busy}>
              <RefreshCw size={15} className={busy ? 'spin' : undefined} /> {t('Holen')}
            </button>
          </div>
          <p className="hint hint--pad">{t('Tageskurse der Europäischen Zentralbank über frankfurter.dev. Die App fragt nur, wenn du auf „Holen“ tippst, ohne Konto und ohne Daten von dir. Echte Kartenkurse weichen ab.')}</p>
        </div>
      </Section>

      <Section title={t('Datumsformat')}>
        <div className="card">
          <Choice title={t('Datumsformat')} text={t('Heute sieht das so aus: {date}', { date: longDate(now) })}>
            <ChipChoice<DateFmt>
              label={t('Datumsformat')}
              value={settings.dateFmt}
              onChange={(dateFmt) => setSettings({ dateFmt })}
              options={[{ value: 'auto', label: t('Automatisch') }, { value: 'dmy', label: 'TT.MM.JJJJ' }, { value: 'mdy', label: 'MM/DD/YYYY' }, { value: 'iso', label: 'JJJJ-MM-TT' }]}
            />
          </Choice>
        </div>
      </Section>
    </SubPage>
  )
}

// ---- Erinnerungen
function RemindPage() {
  const t = useT()
  const calendarFile = useCalendarFile()
  return (
    <SubPage title={t('Erinnerungen')} subtitle={t('Vor Anlässen benachrichtigt werden')}>
      <Section title={t('Erinnerungen')}>
        <div className="card">
          <ReminderSettings />
          <Row icon={<CalendarClock size={18} />} title={t('Kalenderdatei erzeugen')} text={t('Alle Anlässe, jährlich, mit Erinnerung. Für iPhone und Android.')} onClick={() => void calendarFile()} />
        </div>
      </Section>
    </SubPage>
  )
}

// ---- Teilen und Datenschutz
function PrivacyPage() {
  const t = useT()
  const ui = useUI()
  const { settings, setSettings } = ui
  const [pin, setPin] = useState<PinMode | null>(null)
  const on = !!settings.lockHash
  const sd = settings.shareDefaults
  const setSd = (patch: Partial<typeof sd>) => setSettings({ shareDefaults: { ...sd, ...patch } })
  return (
    <SubPage title={t('Teilen und Datenschutz')} subtitle={t('Sperre, Name und Voreinstellungen beim Teilen')}>
      <Section title={t('App-Sperre')}>
        <div className="card">
          {!lockAvailable() ? (
            <p className="hint hint--pad hint--warn">{t('Die Sperre ist hier nicht verfügbar, weil der Browser keine sichere Verschlüsselung anbietet.')}</p>
          ) : !on ? (
            <Row icon={<Lock size={18} />} title={t('PIN festlegen')} text={t('Die App fragt beim Öffnen nach einer PIN')} onClick={() => setPin('set')} />
          ) : (
            <>
              <Row icon={<Lock size={18} />} title={t('App-Sperre ist an')} text={t('PIN ändern')} onClick={() => setPin('change')} />
              <Choice title={t('Sperren nach')} text={t('So lange darf die App im Hintergrund sein, ohne zu sperren.')}>
                <ChipChoice<number>
                  label={t('Sperren nach')}
                  value={settings.lockAfter}
                  onChange={(lockAfter) => setSettings({ lockAfter })}
                  options={LOCK_CHOICES.map((n) => ({ value: n, label: n === 0 ? t('Sofort') : t('{n} Min.', { n: n / 60 }) }))}
                />
              </Choice>
              <Row icon={<Clock size={18} />} title={t('Jetzt sperren')} onClick={() => window.dispatchEvent(new Event(LOCK_EVENT))} />
              <Row icon={<Trash2 size={18} />} title={t('Sperre entfernen')} onClick={() => setPin('remove')} />
            </>
          )}
          <p className="hint hint--pad">{t('Die Sperre hält neugierige Blicke fern. Die Daten sind nicht verschlüsselt, und Backups in Dokumente sind ohne PIN lesbar.')}</p>
        </div>
      </Section>

      <Section title={t('Teilen')}>
        <div className="card">
          <label className="field field--pad">
            <span>{t('Dein Name beim Teilen')}</span>
            <input value={settings.shareName} maxLength={40} onChange={(e) => setSettings({ shareName: e.target.value })} placeholder={t('So steht es beim Empfänger')} />
          </label>
          <SwitchRow title={t('Preise mitsenden')} text={t('Der Empfänger sieht, was die Wünsche ungefähr kosten.')} checked={sd.price} onChange={(price) => setSd({ price })} />
          <SwitchRow title={t('Bilder mitsenden')} text={t('Macht die Datei größer. Ohne Bilder zeigt die Liste Symbol und Farbe.')} checked={sd.images} onChange={(images) => setSd({ images })} />
          <SwitchRow title={t('Notizen mitsenden')} text={t('Standardmäßig bleiben sie bei dir.')} checked={sd.notes} onChange={(notes) => setSd({ notes })} />
          <SwitchRow title={t('Datum der Liste mitsenden')} text={t('Zum Beispiel der Geburtstag, mit Tagen bis dahin.')} checked={sd.listDate} onChange={(listDate) => setSd({ listDate })} />
          <Choice title={t('Gekaufte Artikel')} text={t('Gilt als Vorauswahl. Beim Teilen lässt es sich weiter ändern.')}>
            <ChipChoice<typeof sd.bought>
              label={t('Gekaufte Artikel')}
              value={sd.bought}
              onChange={(bought) => setSd({ bought })}
              options={[{ value: 'hidden', label: t('Unauffällig') }, { value: 'only', label: t('Nur gekauft') }, { value: 'exclude', label: t('Ohne') }]}
            />
          </Choice>
          <p className="hint hint--pad">{t('Geschenkideen für andere werden nie geteilt.')}</p>
        </div>
      </Section>
      <Presence show={pin !== null}>{pin && <PinSheet mode={pin} onClose={() => setPin(null)} />}</Presence>
    </SubPage>
  )
}

// ---- App und Updates
function UpdateRow({ upd }: { upd: ReturnType<typeof useUpdate> }) {
  const t = useT()
  const { settings } = useUI()
  const { checking, result } = upd
  const state = checking ? 'checking' : (result?.kind ?? 'idle')
  const icon = checking ? <RefreshCw size={18} className="spin" /> : result?.kind === 'fail' ? <AlertTriangle size={18} /> : result ? <Check size={18} /> : <RefreshCw size={18} />
  const title = checking ? (upd.native ? t('Prüfe bei GitHub …') : t('Suche neue Version …')) : result?.kind === 'fail' ? t('Prüfung fehlgeschlagen') : result ? result.text : t('Auf Updates prüfen')
  const idleText = `${t('Version {v}', { v: APP_VERSION })}${settings.updateAt ? ` · ${t('geprüft: {when}', { when: agoLabel(settings.updateAt, t) })}` : ''}`
  const text = checking ? t('Einen Moment …') : result?.kind === 'fail' ? result.text : result ? idleText : idleText
  return (
    <div className="updrow" data-state={state} aria-live="polite">
      <Row
        icon={icon}
        title={title}
        text={text}
        right={result?.kind === 'fail' && !checking ? <Chip tone="accent">{t('Nochmal')}</Chip> : checking ? <span /> : undefined}
        onClick={checking ? undefined : () => void upd.check(true)}
      />
      {checking && <span className="updrow__bar" aria-hidden="true" />}
    </div>
  )
}

function AppPage() {
  const t = useT()
  const ui = useUI()
  const { settings, setSettings } = ui
  const { open } = useNav()
  const { items, persons, dispatch } = useStore()
  const upd = useUpdate()
  const bk = useBackup()
  const inst = useInstall()
  const [howTo, setHowTo] = useState(false)
  const [linkTest, setLinkTest] = useState(false)

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
    <SubPage title={t('App und Updates')} subtitle={`${t('Version {v}', { v: APP_VERSION })}`}>
      <Section title={t('App')}>
        <div className="card">
          {!upd.native && (
            <Row
              icon={inst.installed ? <Check size={18} /> : <Smartphone size={18} />}
              title={inst.installed ? t('Schon installiert') : t('Auf dem Home-Bildschirm installieren')}
              text={inst.installed ? t('Du nutzt die App gerade ohne Browserleiste.') : t('Anleitung und Hinweis zum Speicher')}
              onClick={inst.installed ? undefined : () => (inst.canPrompt ? void promptInstall() : setHowTo(true))}
            />
          )}
          <Row icon={<Share2 size={18} />} title={t('Links aus dem Browser teilen')} text={upd.native ? t('Im Browser oder Shop: Teilen → Wunschliste') : t('Nur in der Android-App')} />
          {upd.enabled ? (
            <>
              {upd.available && (
                <div className="setting setting--hl">
                  <div>
                    <strong>{upd.native ? t('Version {v} verfügbar', { v: upd.latest }) : t('Neue Version bereit')}</strong>
                    <p>{upd.native ? t('Lade die APK herunter und installiere sie über die alte. Deine Daten bleiben erhalten.') : t('Lade neu, um sie zu nutzen. Deine Daten bleiben erhalten.')}</p>
                  </div>
                  {upd.native ? (
                    <a className="btn btn--primary btn--small" href={upd.url} target="_blank" rel="noopener noreferrer">
                      {t('Herunterladen')}
                    </a>
                  ) : (
                    <button className="btn btn--primary btn--small" onClick={upd.apply}>
                      {t('Neu laden')}
                    </button>
                  )}
                </div>
              )}
              <UpdateRow upd={upd} />
              {upd.native && (
                <div className="setting">
                  <div>
                    <strong>{t('Beim Start prüfen')}</strong>
                    <p>{t('Fragt einmal am Tag bei GitHub nach dem neuesten Release. Sonst nutzt die App kein Internet.')}</p>
                  </div>
                  <Switch checked={settings.updateCheck} onChange={(updateCheck) => setSettings({ updateCheck })} label={t('Beim Start prüfen')} />
                </div>
              )}
            </>
          ) : (
            <Row icon={<Bell size={18} />} title={t('Auf Updates prüfen')} text={`${t('Version {v}', { v: APP_VERSION })} · ${t('In dieser Ansicht nicht verfügbar')}`} />
          )}
          <Row icon={<Map size={18} />} title={t('Roadmap')} text={t('Was als Nächstes kommt')} onClick={() => open({ type: 'roadmap' })} />
        </div>
      </Section>

      <Section title={t('Formular')}>
        <div className="card">
          <SwitchRow title={t('Art automatisch erkennen')} text={t('Schlägt beim Tippen des Namens eine Art vor. Aus: Die Art bleibt, was du einträgst oder aus den Vorschlägen wählst.')} checked={settings.kindAuto} onChange={(kindAuto) => setSettings({ kindAuto })} />
        </div>
      </Section>

      <Section title={t('Link-Import')}>
        <div className="card">
          <SwitchRow
            title={t('Link-Import')}
            text={t('Liest Name, Bild und Preis aus einem Produktlink. Aus: Die App öffnet nie eine fremde Webseite. Nur in der Android-App.')}
            checked={settings.linkImport}
            onChange={(linkImport) => setSettings({ linkImport })}
          />
          {settings.linkImport && (
            <>
              <SwitchRow title={t('Automatisch lesen')} text={t('Liest einen eingefügten oder getippten Link nach kurzer Ruhe von selbst. Aus: nur mit dem Knopf „Daten holen“.')} checked={settings.linkAuto} onChange={(linkAuto) => setSettings({ linkAuto })} />
              <SwitchRow title={t('Preis übernehmen')} text={t('Trägt den gefundenen Preis ein. Steht er nur im Text der Seite, ist er geraten und so markiert.')} checked={settings.linkPrice} onChange={(linkPrice) => setSettings({ linkPrice })} />
              <SwitchRow title={t('Bilder übernehmen')} text={t('Zeigt und übernimmt das Produktbild von der Seite.')} checked={settings.linkImages} onChange={(linkImages) => setSettings({ linkImages })} />
              <SwitchRow title={t('Ausgefüllte Felder überschreiben')} text={t('Aus: Die App füllt nur leere Felder und lässt Eingetipptes in Ruhe.')} checked={settings.linkOverwrite} onChange={(linkOverwrite) => setSettings({ linkOverwrite })} />
            </>
          )}
          <Row
            icon={<Link2 size={18} />}
            title={t('Link testen')}
            text={!upd.native ? t('Nur in der Android-App') : settings.linkImport ? t('Zeigt, was die App aus einer Produktseite liest') : t('Link-Import ist aus')}
            onClick={upd.native && settings.linkImport ? () => setLinkTest(true) : undefined}
          />
        </div>
      </Section>

      <Section title={t('Vorschau-Werkzeuge')}>
        <div className="card">
          <Row icon={<Palette size={18} />} title={t('Demo-Daten laden')} text={t('Ersetzt alle Daten durch Beispieldaten')} onClick={loadDemo} />
        </div>
      </Section>
      {howTo && <InstallSheet onClose={() => setHowTo(false)} />}
      <Presence show={linkTest}>{linkTest && <LinkTestSheet onClose={() => setLinkTest(false)} />}</Presence>
    </SubPage>
  )
}
