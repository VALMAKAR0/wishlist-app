import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Download, ExternalLink, Eye, EyeOff, Link as LinkIcon, Plus, Trash2 } from 'lucide-react'
import { AddButton, Page } from '../components/Page'
import { Avatar, Chip, Cover, CountUp, EmptyState } from '../components/Primitives'
import { agoLabel, eur, hostOf, longDate, toHref } from '../lib/format'
import type { ReceivedItem, ReceivedList } from '../lib/types'
import { useNav } from '../state/nav'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'

const visibleCount = (r: ReceivedList) => r.lists.reduce((n, l) => n + l.items.filter((x) => !x.owned).length, 0)

export function ReceivedScreen() {
  const t = useT()
  const { received, persons } = useStore()
  const { open } = useNav()
  const ui = useUI()

  return (
    <Page
      title={t('Erhaltene Listen')}
      eyebrow={t('Von anderen')}
      subtitle={received.length ? t.n(received.length, 'Paket', 'Pakete') : t('Wunschlisten, die dir andere geschickt haben')}
      actions={<AddButton label={t('Import')} onClick={() => ui.planned('import-list')} />}
    >
      {received.length > 0 ? (
        <ul className="group">
          <AnimatePresence>
            {received.map((r, i) => {
              const linked = persons.find((p) => p.id === r.personId)
              const covers = r.lists.flatMap((l) => l.items.filter((x) => !x.owned)).slice(0, 3)
              return (
                <motion.li key={r.id} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, height: 0, marginBottom: 0, overflow: 'hidden', pointerEvents: 'none' }} transition={{ type: 'spring', stiffness: 280, damping: 26, delay: i * 0.07 }}>
                  <button className="list-card spot" onClick={() => open({ type: 'received', id: r.id })}>
                    <Avatar name={r.from} hue={r.hue} size={44} />
                    <div className="list-card__main">
                      <strong>{r.from}</strong>
                      <span>
                        {t.n(r.lists.length, 'Liste', 'Listen')} · {t.n(visibleCount(r), 'Wunsch', 'Wünsche')} · {t('erhalten {when}', { when: agoLabel(r.receivedAt, t) })}
                      </span>
                      <div className="chips">
                        {linked ? (
                          <Chip tone="accent" icon={<LinkIcon size={12} />}>
                            {t('Verknüpft mit Ideen für {name}', { name: linked.name })}
                          </Chip>
                        ) : (
                          <Chip>{t('Nicht verknüpft')}</Chip>
                        )}
                      </div>
                    </div>
                    <div className="stack-covers" aria-hidden>
                      {covers.map((x, k) => (
                        <span key={x.id} style={{ marginLeft: k ? -10 : 0, zIndex: 5 - k }}>
                          <Cover emoji={x.emoji} hue={x.hue} size={28} />
                        </span>
                      ))}
                    </div>
                  </button>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      ) : (
        <EmptyState
          emoji="📬"
          title={t('Noch keine Listen erhalten')}
          text={t('Wenn dir jemand seine Wunschliste schickt, speicherst du sie hier. Sie bleibt von deinen eigenen Daten getrennt.')}
          action={
            <button className="btn btn--primary" onClick={() => ui.planned('import-list')}>
              <Download size={17} /> {t('Liste importieren')}
            </button>
          }
        />
      )}
    </Page>
  )
}

function ReceivedRow({ it, index, owned }: { it: ReceivedItem; index: number; owned?: boolean }) {
  const t = useT()
  const ui = useUI()
  return (
    <motion.li className="item item--static" data-owned={owned} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 + Math.min(index, 8) * 0.05 }}>
      <Cover emoji={it.emoji} hue={it.hue} size={44} />
      <div className="item__main">
        <span className="item__name">{it.name}</span>
        <div className="item__meta">
          {it.price !== undefined && <span className="item__price">{eur(it.price)}</span>}
          {it.link && (
            <a className="linkbtn" href={toHref(it.link)} target="_blank" rel="noopener noreferrer" aria-label={t('Link öffnen: {host}', { host: hostOf(it.link) })}>
              <ExternalLink size={12} /> {hostOf(it.link)}
            </a>
          )}
          {it.kind && <span className="item__list">{t(it.kind)}</span>}
        </div>
        {it.note && <p className="item__note">{it.note}</p>}
        {owned && <span className="item__owned">{it.boughtAt ? t('Hat schon, gekauft am {date}', { date: longDate(it.boughtAt) }) : t('Hat schon')}</span>}
      </div>
      {!owned && (
        <button className="icon-btn" onClick={() => ui.planned('received-to-idea')} aria-label={t('Als Geschenkidee übernehmen')}>
          <Plus size={17} />
        </button>
      )}
    </motion.li>
  )
}

export function ReceivedDetailScreen({ id }: { id: string }) {
  const t = useT()
  const { received, persons, dispatch } = useStore()
  const { back } = useNav()
  const ui = useUI()
  const pkg = received.find((r) => r.id === id)
  const [sel, setSel] = useState<'all' | string>('all')
  const [showOwned, setShowOwned] = useState(false)

  useEffect(() => {
    if (!pkg) back()
  }, [pkg, back])

  const collections = useMemo(() => (pkg ? (sel === 'all' ? pkg.lists : pkg.lists.filter((l) => l.id === sel)) : []), [pkg, sel])
  if (!pkg) return null

  // Unauffällig mitgesendete Artikel (owned) bleiben standardmäßig verborgen.
  const visible = collections.flatMap((l) => l.items.filter((i) => !i.owned))
  const owned = collections.flatMap((l) => l.items.filter((i) => i.owned))
  const linked = persons.find((p) => p.id === pkg.personId)
  const total = visible.reduce((s, i) => s + (i.price ?? 0), 0)

  const remove = () =>
    ui.confirm({
      title: t('Liste von {name} löschen?', { name: pkg.from }),
      text: t('Die Liste wird von diesem Gerät entfernt. Du kannst sie später erneut importieren, wenn du die Datei noch hast.'),
      confirmLabel: t('Löschen'),
      tone: 'danger',
      onConfirm: () => {
        dispatch({ type: 'deleteReceived', id })
        ui.toast({ message: t('Liste von {name} gelöscht', { name: pkg.from }) })
      },
    })

  return (
    <Page
      title={pkg.from}
      eyebrow={t('Erhaltene Liste')}
      subtitle={`${t.n(pkg.lists.length, 'Liste', 'Listen')} · ${t('erhalten {when}', { when: agoLabel(pkg.receivedAt, t) })}`}
      onBack={back}
      actions={
        <button className="icon-btn" onClick={remove} aria-label={t('Liste löschen')}>
          <Trash2 size={16} />
        </button>
      }
    >
      <motion.aside className="note-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <LinkIcon size={17} />
        <p>{linked ? t('Mit Geschenkideen für {name} verknüpft. Wenn eine Idee dort schon vorhanden ist, siehst du das direkt bei der Idee.', { name: linked.name }) : t('Nicht verknüpft. Verknüpfe sie mit einer Person, damit dich doppelte Geschenkideen unauffällig warnen.')}</p>
      </motion.aside>

      {pkg.lists.length > 1 && (
        <div className="listbar" role="tablist" aria-label={t('Listen')}>
          <button className="listchip" role="tab" aria-selected={sel === 'all'} data-active={sel === 'all'} onClick={() => setSel('all')}>
            {t('Alle')} <em>{pkg.lists.reduce((n, l) => n + l.items.filter((x) => !x.owned).length, 0)}</em>
          </button>
          {pkg.lists.map((l) => (
            <button key={l.id} className="listchip" role="tab" aria-selected={sel === l.id} data-active={sel === l.id} onClick={() => setSel(l.id)}>
              <span aria-hidden>{l.emoji}</span> {t(l.name)} <em>{l.items.filter((x) => !x.owned).length}</em>
            </button>
          ))}
        </div>
      )}

      <div className="minirow">
        <span>
          {t.n(visible.length, 'Wunsch', 'Wünsche')} · <b><CountUp value={total} format={(n) => eur(Math.round(n))} /></b> {t('zusammen')}
        </span>
      </div>

      <ul className="group">
        <AnimatePresence initial>
          {visible.map((it, i) => (
            <ReceivedRow key={it.id} it={it} index={i} />
          ))}
        </AnimatePresence>
      </ul>

      {owned.length > 0 && (
        <div className="revealrow">
          <button className="reveal" onClick={() => setShowOwned((s) => !s)} aria-pressed={showOwned}>
            {showOwned ? <EyeOff size={14} /> : <Eye size={14} />}
            {showOwned ? t('Schon Vorhandenes ausblenden') : t('Schon Vorhandenes anzeigen ({n})', { n: owned.length })}
          </button>
        </div>
      )}
      <AnimatePresence initial={false}>
        {showOwned && owned.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 32 }} style={{ overflow: 'hidden' }}>
            <p className="hint ownedhint">{t('Das hat {name} schon. Gut zu wissen, bevor du etwas verschenkst.', { name: pkg.from })}</p>
            <ul className="group group--muted">
              {owned.map((it, i) => (
                <ReceivedRow key={it.id} it={it} index={i} owned />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  )
}
