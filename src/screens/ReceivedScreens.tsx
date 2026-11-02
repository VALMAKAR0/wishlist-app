import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, Check, ChevronRight, Download, ExternalLink, Eye, EyeOff, Link as LinkIcon, Link2Off, Plus, Trash2, Undo2 } from 'lucide-react'
import { AddButton, Page, Section } from '../components/Page'
import { Avatar, Chip, Cover, CountUp, EmptyState } from '../components/Primitives'
import { findTaken, targetList } from '../lib/received'
import { listTitle } from '../lib/lists'
import { agoLabel, eur, hostOf, longDate, toHref } from '../lib/format'
import { Presence } from '../components/Presence'
import { Sheet } from '../components/Sheet'
import { daysUntilIso, distanceLabel, uid } from '../lib/format'
import type { Item, Person, ReceivedCollection, ReceivedItem, ReceivedList, Wishlist } from '../lib/types'
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

type Part = { col: ReceivedCollection; items: ReceivedItem[] }

type RowProps = {
  it: ReceivedItem
  index: number
  owned?: boolean
  taken?: Item
  person?: Person
  onToggle?: () => void
  onPerson?: () => void
}

function ReceivedRow({ it, index, owned, taken, person, onToggle, onPerson }: RowProps) {
  const t = useT()
  const tap = !owned && !!onToggle
  return (
    <motion.li
      className="item item--static"
      data-owned={owned}
      data-taken={!!taken}
      data-tap={tap}
      role={tap ? 'button' : undefined}
      tabIndex={tap ? 0 : undefined}
      aria-pressed={tap ? !!taken : undefined}
      aria-label={tap ? `${taken ? t('Übernahme zurücknehmen') : t('Als Geschenkidee übernehmen')}: ${it.name}` : undefined}
      onClick={tap ? onToggle : undefined}
      onKeyDown={tap ? (e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onToggle?.() } } : undefined}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 + Math.min(index, 8) * 0.05 }}
    >
      <Cover emoji={it.emoji} hue={it.hue} size={44} imageId={it.imageId} />
      <div className="item__main">
        <span className="item__name">{it.name}</span>
        <div className="item__meta">
          {it.price !== undefined && <span className="item__price">{eur(it.price)}</span>}
          {it.link && (
            <a className="linkbtn" href={toHref(it.link)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} aria-label={t('Link öffnen: {host}', { host: hostOf(it.link) })}>
              <ExternalLink size={12} /> {hostOf(it.link)}
            </a>
          )}
        </div>
        {it.note && <p className="item__note">{it.note}</p>}
        {owned && <span className="item__owned">{it.boughtAt ? t('Hat schon, gekauft am {date}', { date: longDate(it.boughtAt) }) : t('Hat schon')}</span>}
        {taken && person && (
          <button
            className="takenchip"
            onClick={(e) => {
              e.stopPropagation()
              onPerson?.()
            }}
            aria-label={t('Zu den Ideen für {name}', { name: person.name })}
          >
            <Check size={12} strokeWidth={3.2} /> {t('Übernommen · Ideen für {name}', { name: person.name })} <ChevronRight size={12} />
          </button>
        )}
      </div>
      {tap && (
        <span className={taken ? 'icon-btn icon-btn--done' : 'icon-btn'} aria-hidden>
          {taken ? <Check size={17} strokeWidth={3} /> : <Plus size={17} />}
        </span>
      )}
    </motion.li>
  )
}

export function ReceivedDetailScreen({ id, listId }: { id: string; listId?: string }) {
  const t = useT()
  const { received, persons, lists, items, dispatch } = useStore()
  const { back, open } = useNav()
  const ui = useUI()
  const pkg = received.find((r) => r.id === id)
  const [showOwned, setShowOwned] = useState(false)
  const [job, setJob] = useState<{ parts: Part[]; prompt: boolean } | null>(null)
  const [ask, setAsk] = useState<{ parts: Part[]; personId: string; missing: string[] } | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)

  const gone = !pkg || (!!listId && !pkg.lists.some((l) => l.id === listId))
  useEffect(() => {
    if (gone) back()
  }, [gone, back])
  if (!pkg || gone) return null

  const linked = persons.find((p) => p.id === pkg.personId)
  const ideas = linked ? items.filter((i) => i.owner === linked.id && !i.deletedAt) : []
  const takenOf = (it: ReceivedItem) => (linked ? findTaken(it, ideas) : undefined)

  const cols = listId ? pkg.lists.filter((l) => l.id === listId) : pkg.lists
  const wishesOf = (c: ReceivedCollection) => c.items.filter((i) => !i.owned)
  const rows = cols.flatMap((col) => wishesOf(col).map((it) => ({ it, col })))
  const owned = cols.flatMap((l) => l.items.filter((i) => i.owned))
  const total = rows.reduce((s, r) => s + (r.it.price ?? 0), 0)
  const partsOf = (list: ReceivedCollection[]): Part[] => list.map((col) => ({ col, items: wishesOf(col).filter((i) => !takenOf(i)) })).filter((p) => p.items.length)
  const takenIn = (list: ReceivedCollection[]) => list.flatMap(wishesOf).filter((i) => takenOf(i))
  const todo = partsOf(cols).reduce((n, p) => n + p.items.length, 0)
  const doneCount = takenIn(cols).length
  const takenAll = takenIn(pkg.lists).length

  const execute = (parts: Part[], personId: string, create: boolean) => {
    const person = persons.find((p) => p.id === personId)
    if (!person) return
    const mine = lists.filter((l) => l.owner === personId)
    const fallback = mine.find((l) => l.isDefault) ?? mine[0]
    const newLists: Wishlist[] = []
    const made: Item[] = []
    let where = ''
    for (const { col, items: its } of parts) {
      const hit = targetList(col, person, lists, t)
      let target = hit.list
      if (!target && create) {
        target = { id: uid(), owner: personId, name: col.name, emoji: col.emoji, hue: col.hue, date: hit.occasion ? undefined : col.date, occasionId: hit.occasion?.id, createdAt: Date.now() }
        newLists.push(target)
      }
      const dest = target ?? fallback
      if (!dest) continue
      where = listTitle(dest, t)
      for (const it of its) {
        made.push({ id: uid(), owner: personId, listId: dest.id, name: it.name, kind: it.kind, link: it.link, price: it.price, note: it.note, imageId: it.imageId, emoji: it.emoji, hue: it.hue, bought: false, createdAt: Date.now() })
      }
    }
    if (!made.length) return
    for (const l of newLists) dispatch({ type: 'addList', list: l })
    for (const m of made) dispatch({ type: 'addItem', item: m })
    if (pkg.personId !== personId) dispatch({ type: 'updateReceived', id: pkg.id, patch: { personId } })
    ui.haptic(18)
    const base =
      made.length === 1
        ? t('„{name}“ als Idee für {person} gemerkt', { name: parts[0].items[0].name, person: person.name })
        : t('{n} Wünsche als Ideen für {person} gemerkt', { n: made.length, person: person.name })
    ui.toast({
      message: parts.length === 1 && where ? `${base} · ${where}` : newLists.length ? `${base} · ${t('Neue Liste: {names}', { names: newLists.map((l) => l.name).join(', ') })}` : base,
      emoji: '💡',
      actionLabel: t('Rückgängig'),
      onAction: () => {
        made.forEach((m) => dispatch({ type: 'purgeItem', id: m.id }))
        newLists.forEach((l) => dispatch({ type: 'deleteList', id: l.id }))
      },
    })
  }

  const proceed = (parts: Part[], personId: string, prompt: boolean) => {
    const person = persons.find((p) => p.id === personId)
    if (!person) return
    const missing = prompt ? parts.filter((p) => !targetList(p.col, person, lists, t).list) : []
    if (missing.length) return setAsk({ parts, personId, missing: missing.map((m) => t(m.col.name)) })
    execute(parts, personId, false)
  }

  const begin = (parts: Part[], prompt: boolean) => {
    if (!parts.length) return
    if (linked) return proceed(parts, linked.id, prompt)
    if (!persons.length) return ui.toast({ message: t('Lege zuerst unter „Ideen“ eine Person an.'), emoji: 'ℹ️' })
    setJob({ parts, prompt })
  }

  const untake = (its: ReceivedItem[]) => {
    const found = its.map(takenOf).filter((x): x is Item => !!x)
    if (!found.length) return
    found.forEach((f) => dispatch({ type: 'trashItem', id: f.id }))
    ui.haptic(12)
    ui.toast({
      message: found.length === 1 ? t('„{name}“ zurückgenommen', { name: found[0].name }) : t('{n} Ideen zurückgenommen', { n: found.length }),
      emoji: '↩️',
      actionLabel: t('Rückgängig'),
      onAction: () => found.forEach((f) => dispatch({ type: 'restoreItem', id: f.id })),
    })
  }
  const untakeAsk = (list: ReceivedCollection[]) => untake(takenIn(list))

  const toggleRow = (it: ReceivedItem, col: ReceivedCollection) => (takenOf(it) ? untake([it]) : begin([{ col, items: [it] }], false))

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

  const single = listId ? cols[0] : undefined
  const singleDays = single?.date ? daysUntilIso(single.date) : null
  const bulkLabel = todo > 0 ? (listId ? t('Liste übernehmen ({n})', { n: todo }) : t('Alle übernehmen ({n})', { n: todo })) : t('Übernahme zurücknehmen')

  return (
    <Page
      title={single ? t(single.name) : pkg.from}
      eyebrow={single ? t('Liste von {name}', { name: pkg.from }) : t('Erhaltene Liste')}
      subtitle={single ? `${single.emoji} ${t.n(wishesOf(single).length, 'Wunsch', 'Wünsche')}${singleDays !== null ? ` · ${distanceLabel(singleDays, t)}` : ''}` : `${t.n(pkg.lists.length, 'Liste', 'Listen')} · ${t('erhalten {when}', { when: agoLabel(pkg.receivedAt, t) })}`}
      onBack={back}
      actions={
        single ? undefined : (
          <button className="icon-btn" onClick={remove} aria-label={t('Liste löschen')}>
            <Trash2 size={16} />
          </button>
        )
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

      {!listId && (
        <Section title={t('Listen')} collapseId="received-lists" summary={t.n(pkg.lists.length, 'Liste', 'Listen')}>
          <div className="ltiles">
            {pkg.lists.map((l, i) => {
              const wishes = wishesOf(l)
              const done = wishes.filter((x) => takenOf(x)).length
              const sum = wishes.reduce((s, x) => s + (x.price ?? 0), 0)
              const days = l.date ? daysUntilIso(l.date) : null
              const style = { '--h': l.hue } as React.CSSProperties
              const all = wishes.length > 0 && done === wishes.length
              return (
                <motion.div
                  key={l.id}
                  className="ltile spot"
                  style={style}
                  role="button"
                  tabIndex={0}
                  aria-label={t('Liste „{name}“ öffnen', { name: t(l.name) })}
                  onClick={() => open({ type: 'received', id: pkg.id, listId: l.id })}
                  onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open({ type: 'received', id: pkg.id, listId: l.id }) } }}
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
                    <span>{linked ? `${done}/${wishes.length}` : t('Nicht verknüpft')}</span>
                    <button
                      className="chip chip--button"
                      data-testid={`tile-take-${l.id}`}
                      disabled={wishes.length === 0}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (all) untakeAsk([l])
                        else begin(partsOf([l]), true)
                      }}
                    >
                      {all ? <Undo2 size={13} /> : <Plus size={13} />} {all ? t('Zurücknehmen') : t('Übernehmen')}
                    </button>
                  </span>
                </motion.div>
              )
            })}
          </div>
        </Section>
      )}

      <div className="minirow minirow--split">
        <span>
          {t.n(rows.length, 'Wunsch', 'Wünsche')} · <b><CountUp value={total} format={eur} /></b> {t('zusammen')}
        </span>
        <button
          className="chip chip--button"
          onClick={() => (todo > 0 ? begin(partsOf(cols), true) : untakeAsk(cols))}
          disabled={todo === 0 && doneCount === 0}
          data-testid="take-all"
        >
          {todo > 0 ? <Plus size={14} /> : <Undo2 size={14} />}
          {bulkLabel}
        </button>
      </div>

      <ul className="group">
        <AnimatePresence initial>
          {rows.map(({ it, col }, i) => (
            <ReceivedRow key={`${col.id}:${it.id}`} it={it} index={i} taken={takenOf(it)} person={linked} onToggle={() => toggleRow(it, col)} onPerson={() => linked && open({ type: 'person', id: linked.id })} />
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

      <Presence show={!!job}>
        {job && <TakeOverSheet count={job.parts.reduce((n, p) => n + p.items.length, 0)} name={job.parts.length === 1 && job.parts[0].items.length === 1 ? job.parts[0].items[0].name : undefined} onPick={(pid) => proceed(job.parts, pid, job.prompt)} onClose={() => setJob(null)} />}
      </Presence>
      <Presence show={!!ask}>
        {ask && (
          <NoListSheet
            person={persons.find((p) => p.id === ask.personId)}
            names={ask.missing}
            fallback={t(listTitle(lists.filter((l) => l.owner === ask.personId).find((l) => l.isDefault) ?? lists.find((l) => l.owner === ask.personId)!, t))}
            onCreate={() => execute(ask.parts, ask.personId, true)}
            onDefault={() => execute(ask.parts, ask.personId, false)}
            onClose={() => setAsk(null)}
          />
        )}
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

function NoListSheet({ person, names, fallback, onCreate, onDefault, onClose }: { person?: Person; names: string[]; fallback: string; onCreate: () => void; onDefault: () => void; onClose: () => void }) {
  const t = useT()
  const act = (fn: () => void) => () => {
    fn()
    onClose()
  }
  return (
    <Sheet
      title={t('Keine passende Liste')}
      subtitle={person ? t('Ideen für {name}', { name: person.name }) : undefined}
      onClose={onClose}
      footer={
        <div className="stack-btns">
          <button className="btn btn--primary btn--block" onClick={act(onCreate)}>
            <Plus size={17} /> {names.length > 1 ? t('Listen anlegen und übernehmen') : t('Liste anlegen und übernehmen')}
          </button>
          <button className="btn btn--ghost btn--block" onClick={act(onDefault)}>
            {t('Trotzdem in „{name}“ übernehmen', { name: fallback })}
          </button>
          <button className="btn btn--ghost btn--block" onClick={onClose}>
            {t('Abbrechen')}
          </button>
        </div>
      }
    >
      <p className="hint">
        {person ? t('Bei {person} gibt es keine Liste mit gleichem Namen oder Anlass für:', { person: person.name }) : ''}
      </p>
      <div className="chips">
        {names.map((n) => (
          <Chip key={n} tone="accent">
            {n}
          </Chip>
        ))}
      </div>
      <p className="hint">{t('Beim Anlegen übernimmt die neue Liste Name, Symbol und Datum. Gibt es dazu einen Anlass, folgt sie ihm.')}</p>
    </Sheet>
  )
}

function TakeOverSheet({ count, name, onPick, onClose }: { count: number; name?: string; onPick: (personId: string) => void; onClose: () => void }) {
  const t = useT()
  const { persons } = useStore()
  const [pid, setPid] = useState(persons[0]?.id ?? '')
  return (
    <Sheet
      title={count === 1 ? t('Als Geschenkidee übernehmen') : t('{n} Wünsche übernehmen', { n: count })}
      subtitle={name ?? t('Als Ideen für eine Person')}
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
