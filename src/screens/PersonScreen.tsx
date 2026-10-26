import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarPlus, ChevronDown, Pencil, Plus } from 'lucide-react'
import { AddButton, Page, Section } from '../components/Page'
import { Presence } from '../components/Presence'
import { Avatar, Chip, CountUp, EmptyState } from '../components/Primitives'
import { ItemFormSheet } from '../components/ItemFormSheet'
import { PersonFormSheet } from '../components/PersonFormSheet'
import { dateLabel, daysUntil, eur, plural, untilLabel } from '../lib/format'
import type { Item } from '../lib/types'
import { useNav } from '../state/nav'
import { useStore } from '../state/store'
import { useUI } from '../state/ui'
import { BudgetBar } from './IdeasScreen'
import { closeness, nextOccasion } from '../lib/occasions'
import { ItemList } from './shared'

export function PersonScreen({ id }: { id: string }) {
  const { persons, items, alreadyOwned } = useStore()
  const { back } = useNav()
  const ui = useUI()
  const person = persons.find((p) => p.id === id)
  const [form, setForm] = useState<{ item: Item | null } | null>(null)
  const [editing, setEditing] = useState(false)
  const [showDone, setShowDone] = useState(false)

  // Person wurde gelöscht: zurück zur Übersicht.
  useEffect(() => {
    if (!person) back()
  }, [person, back])
  if (!person) return null

  const mine = items.filter((i) => i.owner === id && !i.deletedAt)
  const open = mine.filter((i) => !i.bought)
  const done = mine.filter((i) => i.bought)
  const spent = done.reduce((s, i) => s + (i.price ?? 0), 0)
  const planned = open.reduce((s, i) => s + (i.price ?? 0), 0)
  const next = nextOccasion(person)

  return (
    <>
      <Page
        title={person.name}
        eyebrow={next ? `${next.o.label} ${untilLabel(next.days)}` : 'Geschenkideen'}
        subtitle={plural(open.length, 'offene Idee', 'offene Ideen')}
        onBack={back}
        actions={
          <>
            <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Person bearbeiten">
              <Pencil size={16} />
            </button>
            <AddButton label="Idee" onClick={() => setForm({ item: null })} />
          </>
        }
      >
        <motion.section className="hero spot" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 240, damping: 24 }}>
          <Avatar name={person.name} hue={person.hue} size={64} ring={next ? closeness(next.days) : 0.06} />
          <div className="hero__text hero__text--grow">
            <span className="hero__label">Budget</span>
            <strong className="hero__value hero__value--nowrap">
              <CountUp value={spent} format={(n) => eur(Math.round(n))} />
              <small> von {eur(person.budget)}</small>
            </strong>
            <BudgetBar spent={spent} planned={planned} budget={person.budget} hideText />
            <span className="hero__note">{planned > 0 ? `${eur(planned)} in offenen Ideen` : 'Keine offenen Ideen'}</span>
          </div>
        </motion.section>

        <Section
          title="Anlässe"
          aside={
            <button className="chip chip--button" onClick={() => ui.planned('ics-export')}>
              <CalendarPlus size={14} /> Erinnerung
            </button>
          }
        >
          <div className="chips">
            {person.occasions.length === 0 && <span className="muted">Noch kein Anlass eingetragen.</span>}
            {person.occasions
              .map((o) => ({ o, d: daysUntil(o) }))
              .sort((a, b) => a.d - b.d)
              .map(({ o, d }, i) => (
                <motion.div key={o.id} className="occ spot" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 + i * 0.07, type: 'spring', stiffness: 360, damping: 22 }}>
                  <strong>{o.label}</strong>
                  <span>{dateLabel(o)}</span>
                  <Chip tone={d <= 14 ? 'warn' : 'neutral'}>{untilLabel(d)}</Chip>
                </motion.div>
              ))}
          </div>
        </Section>

        <Section title="Ideen">
          {open.length > 0 ? (
            <ItemList items={open} onOpen={(item) => setForm({ item })} badgeFor={(item) => (alreadyOwned(item) ? 'Schon vorhanden' : undefined)} />
          ) : (
            <EmptyState emoji="💡" title="Noch keine Ideen" text={`Halte fest, was ${person.name} gefallen könnte. Nur du siehst das.`} action={<button className="btn btn--primary" onClick={() => setForm({ item: null })}><Plus size={17} /> Idee notieren</button>} />
          )}
        </Section>

        {done.length > 0 && (
          <Section
            title="Schon gekauft"
            aside={
              <button className="chip chip--button" onClick={() => setShowDone((s) => !s)} aria-expanded={showDone}>
                {done.length} · {eur(spent)}
                <motion.span animate={{ rotate: showDone ? 180 : 0 }} style={{ display: 'inline-flex' }}>
                  <ChevronDown size={14} />
                </motion.span>
              </button>
            }
          >
            <AnimatePresence initial={false}>
              {showDone && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 32 }} style={{ overflow: 'hidden' }}>
                  <ItemList items={done} onOpen={(item) => setForm({ item })} />
                </motion.div>
              )}
            </AnimatePresence>
          </Section>
        )}
      </Page>

      <Presence show={!!form}>{form && <ItemFormSheet key={form.item?.id ?? 'new'} owner={id} item={form.item} onClose={() => setForm(null)} />}</Presence>
      <Presence show={editing}>{editing && <PersonFormSheet person={person} onClose={() => setEditing(false)} />}</Presence>
    </>
  )
}
