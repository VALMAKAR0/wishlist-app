import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, Download, ExternalLink, Eye, EyeOff, Link as LinkIcon, Plus, Trash2 } from 'lucide-react'
import { AddButton, Page } from '../components/Page'
import { Avatar, Chip, Cover, CountUp, EmptyState } from '../components/Primitives'
import { agoLabel, eur, hostOf, longDate, toHref } from '../lib/format'
import { Presence } from '../components/Presence'
import { Sheet } from '../components/Sheet'
import { daysUntilIso, distanceLabel, isoLabel, uid } from '../lib/format'
import type { Item, ReceivedItem, ReceivedList } from '../lib/types'
import { useReceive } from '../state/receive'
import { useNav } from '../state/nav'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'

const visibleCount = (r: ReceivedList) => r.lists.reduce((n, l) => n + l.items.filter((x) => !x.owned).length, 0)

export function ReceivedScreen() {
  const t = useT()
  const { received, persons } = useStore()
  const { open } = useNav()
  const { importFile } = useReceive()
  const fileRef = useRef<HTMLInputElement>(null)
  const pick = () => fileRef.current?.click()

  return (
    <Page
      title={t('Erhaltene Listen')}
      eyebrow={t('Von anderen')}
      subtitle={received.length ? t.n(received.length, 'Paket', 'Pakete') : t('Wunschlisten, die dir andere geschickt haben')}
      actions={<AddButton label={t('Import')} onClick={pick} />}
    >
      <input
        ref={fileRef}
        type="file"
        hidden
        data-testid="import-input"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void importFile(f)
        }}
      />
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
                          <Cover emoji={x.emoji} hue={x.hue} size={28} imageId={x.imageId} />
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
            <button className="btn btn--primary" onClick={pick}>
              <Download size={17} /> {t('Liste importieren')}
            </button>
          }
        />
      )}
    </Page>
  )
}

function ReceivedRow({ it, index, owned, onTake }: { it: ReceivedItem; index: number; owned?: boolean; onTake?: (it: ReceivedItem) => void }) {
  const t = useT()
  return (
    <motion.li className="item item--static" data-owned={owned} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 + Math.min(index, 8) * 0.05 }}>
      <Cover emoji={it.emoji} hue={it.hue} size={44} imageId={it.imageId} />
      <div className="item__main">
        <span className="item__name">{it.name}</span>
        <div className="item__meta">
          {it.price !== undefined && <span className="item__price">{eur(it.price)}</span>}
          {it.link && (
            <a className="linkbtn" href={toHref(it.link)} target="_blank" rel="noopener noreferrer" aria-label={t('Link öffnen: {host}', { host: hostOf(it.link) })}>
              <ExternalLink size={12} /> {hostOf(it.link)}
            </a>
          )}
        </div>
        {it.note && <p className="item__note">{it.note}</p>}
        {owned && <span className="item__owned">{it.boughtAt ? t('Hat schon, gekauft am {date}', { date: longDate(it.boughtAt) }) : t('Hat schon')}</span>}
      </div>
      {!owned && (
        <button className="icon-btn" onClick={() => onTake?.(it)} aria-label={t('Als Geschenkidee übernehmen')}>
          <Plus size={17} />
        </button>
      )}
    </motion.li>
  )
}

export function ReceivedDetailScreen({ id }: { id: string }) {
  const t = useT()
  const { received, persons, lists, dispatch } = useStore()
  const { back } = useNav()
  const ui = useUI()
  const pkg = received.find((r) => r.id === id)
  const [sel, setSel] = useState<'all' | string>('all')
  const [showOwned, setShowOwned] = useState(false)
  const [take, setTake] = useState<ReceivedItem | null>(null)

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

  const addIdea = (it: ReceivedItem, personId: string) => {
    const person = persons.find((p) => p.id === personId)
    const listId = lists.find((l) => l.owner === personId)?.id
    if (!person || !listId) return
    const idea: Item = {
      id: uid(), owner: personId, listId, name: it.name, kind: it.kind, link: it.link, price: it.price, note: it.note, imageId: it.imageId,
      emoji: it.emoji, hue: it.hue, bought: false, createdAt: Date.now(),
    }
    dispatch({ type: 'addItem', item: idea })
    ui.haptic(18)
    ui.toast({
      message: t('„{name}“ als Idee für {person} gemerkt', { name: it.name, person: person.name }),
      emoji: '💡',
      actionLabel: t('Rückgängig'),
      onAction: () => dispatch({ type: 'purgeItem', id: idea.id }),
    })
  }
  const onTake = (it: ReceivedItem) => {
    if (linked) return addIdea(it, linked.id)
    if (!persons.length) return ui.toast({ message: t('Lege zuerst unter „Ideen“ eine Person an.'), emoji: 'ℹ️' })
    setTake(it)
  }

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

      {persons.length > 0 && (
        <div className="field">
          <span>{t('Verknüpfen mit')}</span>
          <div className="listbar listbar--form" role="radiogroup" aria-label={t('Verknüpfen mit')}>
            <button role="radio" aria-checked={!linked} data-active={!linked} className="listchip" onClick={() => dispatch({ type: 'updateReceived', id, patch: { personId: undefined } })}>
              {t('Keiner')}
            </button>
            {persons.map((p) => (
              <button key={p.id} role="radio" aria-checked={p.id === linked?.id} data-active={p.id === linked?.id} className="listchip" onClick={() => dispatch({ type: 'updateReceived', id, patch: { personId: p.id } })}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {collections.some((c) => c.date) && (
        <div className="chips" style={{ marginBottom: 10 }}>
          {collections.filter((c) => c.date).map((c) => {
            const d = daysUntilIso(c.date!)
            return (
              <Chip key={c.id} tone={d !== null && d >= 0 && d <= 14 ? 'warn' : 'neutral'} icon={<CalendarDays size={13} />}>
                {`${t(c.name)} · ${isoLabel(c.date!)}${d === null ? '' : ` · ${distanceLabel(d, t)}`}`}
              </Chip>
            )
          })}
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
            <ReceivedRow key={it.id} it={it} index={i} onTake={onTake} />
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

      <Presence show={!!take}>
        {take && <TakeOverSheet item={take} onPick={(pid) => addIdea(take, pid)} onClose={() => setTake(null)} />}
      </Presence>
    </Page>
  )
}

function TakeOverSheet({ item, onPick, onClose }: { item: ReceivedItem; onPick: (personId: string) => void; onClose: () => void }) {
  const t = useT()
  const { persons } = useStore()
  const [pid, setPid] = useState(persons[0]?.id ?? '')
  return (
    <Sheet
      title={t('Als Geschenkidee übernehmen')}
      subtitle={item.name}
      onClose={onClose}
      footer={
        <button
          className="btn btn--primary btn--block"
          disabled={!pid}
          onClick={() => {
            onPick(pid)
            onClose()
          }}
        >
          {t('Übernehmen')}
        </button>
      }
    >
      <div className="field">
        <span>{t('Für wen?')}</span>
        <div className="listbar listbar--form" role="radiogroup" aria-label={t('Für wen?')}>
          {persons.map((p) => (
            <button key={p.id} role="radio" aria-checked={p.id === pid} data-active={p.id === pid} className="listchip" onClick={() => setPid(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
