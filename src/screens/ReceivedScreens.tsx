import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, Check, ChevronRight, Download, ExternalLink, Eye, EyeOff, Link as LinkIcon, Link2Off, Plus, Trash2 } from 'lucide-react'
import { AddButton, Page, Section } from '../components/Page'
import { Avatar, Chip, Cover, CountUp, EmptyState } from '../components/Primitives'
import { findTaken } from '../lib/received'
import { agoLabel, eur, hostOf, longDate, toHref } from '../lib/format'
import { Presence } from '../components/Presence'
import { Sheet } from '../components/Sheet'
import { daysUntilIso, distanceLabel, uid } from '../lib/format'
import type { Item, Person, ReceivedItem, ReceivedList } from '../lib/types'
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

type RowProps = {
  it: ReceivedItem
  index: number
  owned?: boolean
  taken?: Item
  person?: Person
  onTake?: (it: ReceivedItem) => void
  onPerson?: () => void
}

function ReceivedRow({ it, index, owned, taken, person, onTake, onPerson }: RowProps) {
  const t = useT()
  return (
    <motion.li className="item item--static" data-owned={owned} data-taken={!!taken} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }} transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 + Math.min(index, 8) * 0.05 }}>
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
        {taken && person && (
          <button className="takenchip" onClick={onPerson} aria-label={t('Zu den Ideen für {name}', { name: person.name })}>
            <Check size={12} strokeWidth={3.2} /> {t('Übernommen · Ideen für {name}', { name: person.name })} <ChevronRight size={12} />
          </button>
        )}
      </div>
      {!owned && !taken && (
        <button className="icon-btn" onClick={() => onTake?.(it)} aria-label={t('Als Geschenkidee übernehmen')}>
          <Plus size={17} />
        </button>
      )}
      {!owned && taken && (
        <span className="icon-btn icon-btn--done" aria-hidden>
          <Check size={17} strokeWidth={3} />
        </span>
      )}
    </motion.li>
  )
}

export function ReceivedDetailScreen({ id }: { id: string }) {
  const t = useT()
  const { received, persons, lists, items, dispatch } = useStore()
  const { back, open } = useNav()
  const ui = useUI()
  const pkg = received.find((r) => r.id === id)
  const [sel, setSel] = useState<'all' | string>('all')
  const [showOwned, setShowOwned] = useState(false)
  const [take, setTake] = useState<ReceivedItem[] | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)

  useEffect(() => {
    if (!pkg) back()
  }, [pkg, back])
  if (!pkg) return null

  const linked = persons.find((p) => p.id === pkg.personId)
  const ideas = linked ? items.filter((i) => i.owner === linked.id && !i.deletedAt) : []
  const takenOf = (it: ReceivedItem) => (linked ? findTaken(it, ideas) : undefined)

  const collections = sel === 'all' ? pkg.lists : pkg.lists.filter((l) => l.id === sel)
  const visible = collections.flatMap((l) => l.items.filter((i) => !i.owned))
  const owned = collections.flatMap((l) => l.items.filter((i) => i.owned))
  const todo = visible.filter((i) => !takenOf(i))
  const total = visible.reduce((s, i) => s + (i.price ?? 0), 0)
  const scopeName = sel === 'all' ? '' : t(pkg.lists.find((l) => l.id === sel)?.name ?? '')

  const addIdeas = (list: ReceivedItem[], personId: string) => {
    const person = persons.find((p) => p.id === personId)
    const mine = lists.filter((l) => l.owner === personId)
    const listId = (mine.find((l) => l.isDefault) ?? mine[0])?.id
    if (!person || !listId || !list.length) return
    const made: Item[] = list.map((it) => ({
      id: uid(), owner: personId, listId, name: it.name, kind: it.kind, link: it.link, price: it.price, note: it.note, imageId: it.imageId,
      emoji: it.emoji, hue: it.hue, bought: false, createdAt: Date.now(),
    }))
    for (const idea of made) dispatch({ type: 'addItem', item: idea })
    if (pkg.personId !== personId) dispatch({ type: 'updateReceived', id, patch: { personId } })
    ui.haptic(18)
    ui.toast({
      message: made.length === 1 ? t('„{name}“ als Idee für {person} gemerkt', { name: list[0].name, person: person.name }) : t('{n} Wünsche als Ideen für {person} gemerkt', { n: made.length, person: person.name }),
      emoji: '💡',
      actionLabel: t('Rückgängig'),
      onAction: () => made.forEach((m) => dispatch({ type: 'purgeItem', id: m.id })),
    })
  }

  const start = (list: ReceivedItem[]) => {
    if (!list.length) return
    if (linked) return addIdeas(list, linked.id)
    if (!persons.length) return ui.toast({ message: t('Lege zuerst unter „Ideen“ eine Person an.'), emoji: 'ℹ️' })
    setTake(list)
  }
  const takeAll = () => {
    if (!todo.length) return
    if (!linked) return start(todo)
    ui.confirm({
      title: t('{n} Wünsche übernehmen?', { n: todo.length }),
      text: t('Sie werden als Geschenkideen für {name} gemerkt. Was dort schon steht, wird übersprungen.', { name: linked.name }),
      confirmLabel: t('Übernehmen'),
      onConfirm: () => addIdeas(todo, linked.id),
    })
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

  const allWishes = pkg.lists.flatMap((l) => l.items.filter((i) => !i.owned))
  const takenAll = allWishes.filter((i) => takenOf(i)).length

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
      <motion.div className="linkcard" data-linked={!!linked} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        {linked ? (
          <>
            <button className="linkcard__main spot" onClick={() => open({ type: 'person', id: linked.id })} aria-label={t('Zu den Ideen für {name}', { name: linked.name })}>
              <Avatar name={linked.name} hue={linked.hue} size={46} />
              <span className="linkcard__text">
                <small>{t('Verknüpft mit')}</small>
                <strong>{t('Ideen für {name}', { name: linked.name })}</strong>
                <em>{t('{n} Ideen · {m} übernommen', { n: items.filter((i) => i.owner === linked.id && !i.deletedAt).length, m: takenAll })}</em>
              </span>
              <ChevronRight size={18} />
            </button>
            <button className="btn btn--ghost btn--small" onClick={() => setLinkOpen(true)}>
              {t('Ändern')}
            </button>
          </>
        ) : (
          <>
            <span className="linkcard__icon" aria-hidden>
              <Link2Off size={20} />
            </span>
            <span className="linkcard__text">
              <small>{t('Nicht verknüpft')}</small>
              <strong>{t('Mit einer Person verknüpfen')}</strong>
              <em>{t('So warnt dich die App unauffällig vor doppelten Geschenken.')}</em>
            </span>
            <button className="btn btn--primary btn--small" onClick={() => (persons.length ? setLinkOpen(true) : ui.toast({ message: t('Lege zuerst unter „Ideen“ eine Person an.'), emoji: 'ℹ️' }))}>
              {t('Verknüpfen')}
            </button>
          </>
        )}
      </motion.div>

      <Section title={t('Listen')} collapseId="received-lists" summary={t.n(pkg.lists.length, 'Liste', 'Listen')}>
        <div className="ltiles">
          {pkg.lists.map((l, i) => {
            const wishes = l.items.filter((x) => !x.owned)
            const done = wishes.filter((x) => takenOf(x)).length
            const sum = wishes.reduce((s, x) => s + (x.price ?? 0), 0)
            const days = l.date ? daysUntilIso(l.date) : null
            const style = { '--h': l.hue } as React.CSSProperties
            return (
              <motion.button
                key={l.id}
                className="ltile spot"
                style={style}
                data-on={sel === l.id}
                aria-pressed={sel === l.id}
                onClick={() => setSel((s) => (s === l.id ? 'all' : l.id))}
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 + Math.min(i, 8) * 0.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="ltile__top">
                  <span className="ltile__icon" aria-hidden>{l.emoji}</span>
                  <span className="ltile__name">
                    <strong>{t(l.name)}</strong>
                    <small>{t.n(wishes.length, 'Wunsch', 'Wünsche')}</small>
                  </span>
                </span>
                {days !== null && (
                  <span className="ltile__date" data-past={days < 0} data-soon={days >= 0 && days <= 14}>
                    <CalendarDays size={12} /> {distanceLabel(days, t)}
                  </span>
                )}
                <span className="ltile__total">{eur(sum)}</span>
                <span className="ltile__bar" aria-hidden>
                  <span style={{ width: `${wishes.length ? (done / wishes.length) * 100 : 0}%` }} />
                </span>
                <span className="ltile__foot">
                  <span>{linked ? t('{n} übernommen', { n: done }) : t('Nicht verknüpft')}</span>
                  <span>{done}/{wishes.length}</span>
                </span>
              </motion.button>
            )
          })}
        </div>
      </Section>

      <div className="minirow minirow--split">
        <span>
          {scopeName && <b>{scopeName} · </b>}
          {t.n(visible.length, 'Wunsch', 'Wünsche')} · <b><CountUp value={total} format={(n) => eur(Math.round(n))} /></b> {t('zusammen')}
        </span>
        <button className="chip chip--button" onClick={takeAll} disabled={todo.length === 0} data-testid="take-all">
          {todo.length === 0 ? <Check size={14} /> : <Plus size={14} />}
          {todo.length === 0 ? t('Alles übernommen') : t('Alle übernehmen ({n})', { n: todo.length })}
        </button>
      </div>

      <ul className="group">
        <AnimatePresence initial>
          {visible.map((it, i) => (
            <ReceivedRow key={it.id} it={it} index={i} taken={takenOf(it)} person={linked} onTake={(x) => start([x])} onPerson={() => linked && open({ type: 'person', id: linked.id })} />
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
        {take && <TakeOverSheet items={take} onPick={(pid) => addIdeas(take, pid)} onClose={() => setTake(null)} />}
      </Presence>
      <Presence show={linkOpen}>{linkOpen && <LinkSheet pkg={pkg} onClose={() => setLinkOpen(false)} />}</Presence>
    </Page>
  )
}

function LinkSheet({ pkg, onClose }: { pkg: ReceivedList; onClose: () => void }) {
  const t = useT()
  const { persons, dispatch } = useStore()
  const ui = useUI()
  const set = (personId?: string) => {
    dispatch({ type: 'updateReceived', id: pkg.id, patch: { personId } })
    const p = persons.find((x) => x.id === personId)
    ui.toast({ message: p ? t('Verknüpft mit Ideen für {name}', { name: p.name }) : t('Verknüpfung gelöst'), emoji: '🔗' })
    onClose()
  }
  return (
    <Sheet title={t('Verknüpfen mit')} subtitle={t('Liste von {name}', { name: pkg.from })} onClose={onClose}>
      <div className="plist" role="radiogroup" aria-label={t('Verknüpfen mit')}>
        {persons.map((p) => (
          <button key={p.id} role="radio" aria-checked={p.id === pkg.personId} data-active={p.id === pkg.personId} className="pchoice" onClick={() => set(p.id)}>
            <Avatar name={p.name} hue={p.hue} size={38} />
            <strong>{t('Ideen für {name}', { name: p.name })}</strong>
            {p.id === pkg.personId && <Check size={17} strokeWidth={3} />}
          </button>
        ))}
        <button role="radio" aria-checked={!pkg.personId} data-active={!pkg.personId} className="pchoice" onClick={() => set(undefined)}>
          <span className="linkcard__icon" aria-hidden>
            <Link2Off size={18} />
          </span>
          <strong>{t('Keiner')}</strong>
          {!pkg.personId && <Check size={17} strokeWidth={3} />}
        </button>
      </div>
      <p className="hint">{t('Mit Verknüpfung siehst du bei einer Idee, was die Person schon hat, und übernommene Wünsche erscheinen hier als erledigt.')}</p>
    </Sheet>
  )
}

function TakeOverSheet({ items, onPick, onClose }: { items: ReceivedItem[]; onPick: (personId: string) => void; onClose: () => void }) {
  const t = useT()
  const { persons } = useStore()
  const [pid, setPid] = useState(persons[0]?.id ?? '')
  return (
    <Sheet
      title={items.length === 1 ? t('Als Geschenkidee übernehmen') : t('{n} Wünsche übernehmen', { n: items.length })}
      subtitle={items.length === 1 ? items[0].name : t('Als Ideen für eine Person')}
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
          {t('Übernehmen und verknüpfen')}
        </button>
      }
    >
      <div className="plist" role="radiogroup" aria-label={t('Für wen?')}>
        {persons.map((p) => (
          <button key={p.id} role="radio" aria-checked={p.id === pid} data-active={p.id === pid} className="pchoice" onClick={() => setPid(p.id)}>
            <Avatar name={p.name} hue={p.hue} size={38} />
            <strong>{p.name}</strong>
            {p.id === pid && <Check size={17} strokeWidth={3} />}
          </button>
        ))}
      </div>
      <p className="hint">{t('Die Liste wird dabei mit dieser Person verknüpft.')}</p>
    </Sheet>
  )
}
