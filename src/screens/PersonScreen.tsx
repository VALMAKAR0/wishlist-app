import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarPlus, ChevronDown, Pencil, Plus } from 'lucide-react'
import { ListBar, ListSheetHost, ListStatsCard, type ListSelection } from '../components/Lists'
import { AddButton, Page, Section } from '../components/Page'
import { Presence } from '../components/Presence'
import { Avatar, Chip, CountUp, EmptyState } from '../components/Primitives'
import { ItemFormSheet } from '../components/ItemFormSheet'
import { PersonFormSheet } from '../components/PersonFormSheet'
import { dateLabel, daysUntil, eur, untilLabel } from '../lib/format'
import { listTitle } from '../lib/lists'
import { nextOccasion } from '../lib/occasions'
import { listStats } from '../lib/stats'
import type { Item } from '../lib/types'
import { useNav } from '../state/nav'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'
import { BudgetBar } from './IdeasScreen'
import { ItemList } from './shared'

export function PersonScreen({ id }: { id: string }) {
  const t = useT()
  const { persons, items, lists: allLists, alreadyOwned } = useStore()
  const { back } = useNav()
  const ui = useUI()
  const person = persons.find((p) => p.id === id)
  const lists = useMemo(() => allLists.filter((l) => l.owner === id), [allLists, id])
  const [sel, setSel] = useState<ListSelection>('all')
  const [form, setForm] = useState<{ item: Item | null } | null>(null)
  const [editing, setEditing] = useState(false)
  const [listSheet, setListSheet] = useState<{ edit: boolean } | null>(null)
  const [showDone, setShowDone] = useState(false)

  // Person wurde gelöscht: zurück zur Übersicht.
  useEffect(() => {
    if (!person) back()
  }, [person, back])
  if (!person) return null

  const active = sel !== 'all' && lists.some((l) => l.id === sel) ? sel : 'all'
  const activeList = lists.find((l) => l.id === active)
  const mineAll = items.filter((i) => i.owner === id && !i.deletedAt)
  const scoped = active === 'all' ? mineAll : mineAll.filter((i) => i.listId === active)
  const open = scoped.filter((i) => !i.bought)
  const done = scoped.filter((i) => i.bought)
  const spent = mineAll.filter((i) => i.bought).reduce((s, i) => s + (i.price ?? 0), 0)
  const planned = mineAll.filter((i) => !i.bought).reduce((s, i) => s + (i.price ?? 0), 0)
  const next = nextOccasion(person)
  const counts = Object.fromEntries(lists.map((l) => [l.id, mineAll.filter((i) => i.listId === l.id).length]))
  const doneValue = done.reduce((s, i) => s + (i.price ?? 0), 0)

  const listLabelFor = active === 'all' && lists.length > 1 ? (i: Item) => {
    const l = lists.find((x) => x.id === i.listId)
    return l?.emoji
  } : undefined

  return (
    <>
      <Page
        title={person.name}
        eyebrow={next ? `${t(next.o.label)} ${untilLabel(next.days, t)}` : t('Geschenkideen')}
        subtitle={t.n(mineAll.filter((i) => !i.bought).length, 'offene Idee', 'offene Ideen')}
        onBack={back}
        actions={
          <>
            <button className="icon-btn" onClick={() => setEditing(true)} aria-label={t('Person bearbeiten')}>
              <Pencil size={16} />
            </button>
            <AddButton label={t('Idee')} onClick={() => setForm({ item: null })} />
          </>
        }
      >
        <motion.section className="hero spot" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 240, damping: 24 }}>
          <Avatar name={person.name} hue={person.hue} size={60} />
          <div className="hero__text hero__text--grow">
            <span className="hero__label">{t('Budget')}</span>
            <strong className="hero__value hero__value--nowrap">
              <CountUp value={spent} format={(n) => eur(Math.round(n))} />
              <small> {t('von {total}', { total: eur(person.budget) })}</small>
            </strong>
            <BudgetBar spent={spent} planned={planned} budget={person.budget} hideText />
            <span className="hero__note">{planned > 0 ? t('{amount} in offenen Ideen', { amount: eur(planned) }) : t('Keine offenen Ideen')}</span>
          </div>
        </motion.section>

        <ListBar lists={lists} counts={counts} total={mineAll.length} value={active} onChange={setSel} onAdd={() => setListSheet({ edit: false })} />
        {mineAll.length > 0 && (
          <ListStatsCard
            key={active}
            title={activeList ? listTitle(activeList, t) : t('Alle Listen')}
            emoji={activeList?.emoji}
            stats={listStats(scoped)}
            onEdit={activeList ? () => setListSheet({ edit: true }) : undefined}
          />
        )}

        <Section
          title={t('Anlässe')}
          aside={
            <button className="chip chip--button" onClick={() => ui.planned('ics-export')}>
              <CalendarPlus size={14} /> {t('Erinnerung')}
            </button>
          }
        >
          <div className="chips">
            {person.occasions.length === 0 && <span className="muted">{t('Noch kein Anlass eingetragen.')}</span>}
            {person.occasions
              .map((o) => ({ o, d: daysUntil(o) }))
              .sort((a, b) => a.d - b.d)
              .map(({ o, d }, i) => (
                <motion.div key={o.id} className="occ spot" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 + i * 0.07, type: 'spring', stiffness: 360, damping: 22 }}>
                  <strong>{t(o.label)}</strong>
                  <span>{dateLabel(o)}</span>
                  <Chip tone={d <= 14 ? 'warn' : 'neutral'}>{untilLabel(d, t)}</Chip>
                </motion.div>
              ))}
          </div>
        </Section>

        <Section title={t('Ideen')}>
          {open.length > 0 ? (
            <ItemList items={open} onOpen={(item) => setForm({ item })} badgeFor={(item) => (alreadyOwned(item) ? t('Schon vorhanden') : undefined)} listLabelFor={listLabelFor} />
          ) : (
            <EmptyState
              emoji="💡"
              title={t('Noch keine Ideen')}
              text={t('Halte fest, was {name} gefallen könnte. Nur du siehst das.', { name: person.name })}
              action={
                <button className="btn btn--primary" onClick={() => setForm({ item: null })}>
                  <Plus size={17} /> {t('Idee notieren')}
                </button>
              }
            />
          )}
        </Section>

        {done.length > 0 && (
          <Section
            title={t('Schon gekauft')}
            aside={
              <button className="chip chip--button" onClick={() => setShowDone((s) => !s)} aria-expanded={showDone}>
                {done.length} · {eur(doneValue)}
                <motion.span animate={{ rotate: showDone ? 180 : 0 }} style={{ display: 'inline-flex' }}>
                  <ChevronDown size={14} />
                </motion.span>
              </button>
            }
          >
            <AnimatePresence initial={false}>
              {showDone && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 32 }} style={{ overflow: 'hidden' }}>
                  <ItemList items={done} onOpen={(item) => setForm({ item })} listLabelFor={listLabelFor} />
                </motion.div>
              )}
            </AnimatePresence>
          </Section>
        )}
      </Page>

      <Presence show={!!form}>{form && <ItemFormSheet key={form.item?.id ?? 'new'} owner={id} item={form.item} listId={active === 'all' ? undefined : active} onClose={() => setForm(null)} />}</Presence>
      <Presence show={editing}>{editing && <PersonFormSheet person={person} onClose={() => setEditing(false)} />}</Presence>
      <ListSheetHost open={!!listSheet} owner={id} list={listSheet?.edit ? activeList : null} onClose={() => setListSheet(null)} onCreated={(lid) => setSel(lid)} onDeleted={() => setSel('all')} />
    </>
  )
}
