import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Plus, Sparkles, UserPlus } from 'lucide-react'
import { Fab, Page } from '../components/Page'
import { Presence } from '../components/Presence'
import { Avatar, Chip, CountUp, EmptyState } from '../components/Primitives'
import { PersonFormSheet } from '../components/PersonFormSheet'
import { dateLabel, eur, plural, untilLabel } from '../lib/format'
import { closeness, nextOccasion } from '../lib/occasions'
import { useNav } from '../state/nav'
import { useStore } from '../state/store'

export function BudgetBar({ spent, planned, budget, hideText }: { spent: number; planned: number; budget: number; hideText?: boolean }) {
  // Offene Ideen sind nur Optionen: Die Leiste skaliert am Budget, erst echte Käufe können es überschreiten.
  const max = Math.max(budget, spent, 1)
  const over = spent > budget && budget > 0
  return (
    <div className="budget" data-over={over}>
      <div className="budget__bar">
        <motion.span className="budget__planned" initial={{ width: 0 }} animate={{ width: `${(Math.min(spent + planned, max) / max) * 100}%` }} transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }} />
        <motion.span className="budget__spent" initial={{ width: 0 }} animate={{ width: `${(spent / max) * 100}%` }} transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      {!hideText && (
        <span className="budget__text">
          {eur(spent)} <em>von {eur(budget)}</em>
          {over && <strong> · über Budget</strong>}
        </span>
      )}
    </div>
  )
}

export function IdeasScreen() {
  const { persons, items, alreadyOwned } = useStore()
  const { open } = useNav()
  const [adding, setAdding] = useState(false)

  const rows = useMemo(
    () =>
      persons
        .map((p) => {
          const mine = items.filter((i) => i.owner === p.id && !i.deletedAt)
          return {
            person: p,
            next: nextOccasion(p),
            ideas: mine.filter((i) => !i.bought),
            spent: mine.filter((i) => i.bought).reduce((s, i) => s + (i.price ?? 0), 0),
            planned: mine.filter((i) => !i.bought).reduce((s, i) => s + (i.price ?? 0), 0),
            dupes: mine.filter(alreadyOwned).length,
          }
        })
        .sort((a, b) => (a.next?.days ?? 999) - (b.next?.days ?? 999)),
    [persons, items, alreadyOwned],
  )

  const hero = rows.find((r) => r.next)

  return (
    <>
      <Page
        title="Geschenkideen"
        eyebrow="Privat"
        subtitle={persons.length ? plural(persons.length, 'Person', 'Personen') : 'Nur für dich sichtbar, wird nie geteilt'}
        fab={<Fab label="Person" icon={<UserPlus size={21} strokeWidth={2.3} />} onClick={() => setAdding(true)} />}
      >
        {hero && hero.next && (
          <motion.button
            className="hero hero--next spot"
            onClick={() => open({ type: 'person', id: hero.person.id })}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 240, damping: 24 }}
            whileTap={{ scale: 0.985 }}
          >
            <div className="hero__text">
              <span className="hero__label">
                <Sparkles size={14} /> Als Nächstes
              </span>
              <strong className="hero__value hero__value--big">
                {hero.next.days === 0 ? (
                  'Heute!'
                ) : (
                  <>
                    <CountUp value={hero.next.days} /> <small>{hero.next.days === 1 ? 'Tag' : 'Tage'}</small>
                  </>
                )}
              </strong>
              <span className="hero__note">
                {hero.next.o.label} von {hero.person.name} · {dateLabel(hero.next.o)}
              </span>
              <span className="hero__cta">
                {plural(hero.ideas.length, 'Idee', 'Ideen')} ansehen <ArrowRight size={15} />
              </span>
            </div>
            <Avatar name={hero.person.name} hue={hero.person.hue} size={88} ring={closeness(hero.next.days)} />
          </motion.button>
        )}

        {rows.length > 0 ? (
          <div className="grid">
            <AnimatePresence>
              {rows.map(({ person, next, ideas, spent, planned, dupes }, i) => (
                <motion.button
                  key={person.id}
                  className="person spot"
                  onClick={() => open({ type: 'person', id: person.id })}
                  initial={{ opacity: 0, y: 24, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, pointerEvents: 'none' }}
                  transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.15 + Math.min(i, 6) * 0.06 }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.975 }}
                >
                  <div className="person__top">
                    <Avatar name={person.name} hue={person.hue} size={60} ring={next ? closeness(next.days) : 0.06} />
                    <div className="person__id">
                      <strong>{person.name}</strong>
                      <span>{next ? `${next.o.label} ${untilLabel(next.days)}` : 'Kein Anlass'}</span>
                    </div>
                  </div>
                  <BudgetBar spent={spent} planned={planned} budget={person.budget} />
                  <div className="person__foot">
                    <Chip>{plural(ideas.length, 'Idee', 'Ideen')}</Chip>
                    {dupes > 0 && <Chip tone="accent">{dupes}× schon vorhanden</Chip>}
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState
            emoji="🎁"
            title="Für wen suchst du Geschenke?"
            text="Lege Personen mit Anlass und Budget an. Deine Ideen dazu bleiben komplett privat."
            action={
              <button className="btn btn--primary" onClick={() => setAdding(true)}>
                <Plus size={18} /> Erste Person anlegen
              </button>
            }
          />
        )}
      </Page>
      <Presence show={adding}>{adding && <PersonFormSheet onClose={() => setAdding(false)} />}</Presence>
    </>
  )
}
