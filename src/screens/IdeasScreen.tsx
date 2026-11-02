import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, ChevronRight, Plus, Sparkles } from 'lucide-react'
import { ListSheetHost, ListStatsCard } from '../components/Lists'
import { ListTiles } from '../components/ListTiles'
import { AddButton, Page } from '../components/Page'
import { Presence } from '../components/Presence'
import { Avatar, Chip, CountUp, EmptyState, Segmented } from '../components/Primitives'
import { PersonFormSheet } from '../components/PersonFormSheet'
import { cap } from '../lib/i18n'
import { dateLabel, money, priceOf, untilLabel } from '../lib/format'
import { nextOccasion } from '../lib/occasions'
import { listStats } from '../lib/stats'
import { useNav } from '../state/nav'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'

export function BudgetBar({ spent, planned, budget, hideText }: { spent: number; planned: number; budget: number; hideText?: boolean }) {
  const t = useT()
  const { settings } = useUI()
  // Offene Ideen sind nur Optionen: Die Leiste skaliert am Budget, erst echte Käufe können es überschreiten.
  // Die helle Zusatzleiste (Summe der offenen Ideen) ist in den Einstellungen abschaltbar.
  const max = Math.max(budget, spent, 1)
  const over = spent > budget && budget > 0
  return (
    <div className="budget" data-over={over}>
      <div className="budget__bar">
        {settings.showPlanned && (
          <motion.span className="budget__planned" initial={{ width: 0 }} animate={{ width: `${(Math.min(spent + planned, max) / max) * 100}%` }} transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }} />
        )}
        <motion.span className="budget__spent" initial={{ width: 0 }} animate={{ width: `${(spent / max) * 100}%` }} transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      {!hideText && (
        <span className="budget__text">
          {money(spent)} <em>{t('von {total}', { total: money(budget) })}</em>
          {over && <strong> · {t('über Budget')}</strong>}
        </span>
      )}
    </div>
  )
}

type Mode = 'persons' | 'lists'
// Bleibt beim Zurückkehren aus einer Liste erhalten.
let lastMode: Mode = 'persons'

export function IdeasScreen() {
  const t = useT()
  const { persons, items, lists, alreadyOwned } = useStore()
  const { open } = useNav()
  const [adding, setAdding] = useState(false)
  const [mode, setModeState] = useState(lastMode)
  const setMode = (m: Mode) => {
    lastMode = m
    setModeState(m)
  }
  const [newList, setNewList] = useState(false)
  const view = persons.length > 0 ? mode : 'persons'

  const tiles = useMemo(() => {
    const live = items.filter((i) => !i.deletedAt && i.owner !== 'me')
    return lists
      .filter((l) => l.owner !== 'me')
      .map((l) => ({ list: l, stats: listStats(live.filter((i) => i.listId === l.id)), owner: persons.find((p) => p.id === l.owner)?.name ?? '' }))
      .sort((a, b) => a.owner.localeCompare(b.owner) || a.list.createdAt - b.list.createdAt)
  }, [items, lists, persons])
  const allStats = useMemo(() => listStats(items.filter((i) => !i.deletedAt && i.owner !== 'me')), [items])

  const rows = useMemo(
    () =>
      persons
        .map((p) => {
          const mine = items.filter((i) => i.owner === p.id && !i.deletedAt)
          return {
            person: p,
            next: nextOccasion(p),
            ideas: mine.filter((i) => !i.bought),
            spent: mine.filter((i) => i.bought).reduce((s, i) => s + priceOf(i), 0),
            planned: mine.filter((i) => !i.bought).reduce((s, i) => s + priceOf(i), 0),
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
        title={t('Geschenkideen')}
        eyebrow={t('Privat')}
        subtitle={persons.length ? t.n(persons.length, 'Person', 'Personen') : t('Nur für dich sichtbar, wird nie geteilt')}
        actions={<AddButton label={t('Person')} onClick={() => setAdding(true)} />}
      >
        {persons.length > 0 && (
          <div className="toolbar">
            <Segmented
              id="ideas-mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'persons', label: cap(t('Personen')), count: persons.length },
                { value: 'lists', label: t('Listen'), count: tiles.length },
              ]}
            />
          </div>
        )}

        {view === 'lists' && (
          <>
            <ListStatsCard title={t('Alle Listen')} stats={allStats} />
            {tiles.length > 0 ? (
              <ListTiles rows={tiles} onOpen={(id) => open({ type: 'list', id })} onNew={() => setNewList(true)} />
            ) : (
              <EmptyState emoji="🗂️" title={t('Noch keine Listen')} text={t('Lege eine Person an, dann erscheinen ihre Listen hier.')} />
            )}
          </>
        )}

        {view === 'persons' && hero && hero.next && (
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
                <Sparkles size={13} /> {t('Als Nächstes')}
              </span>
              <strong className="hero__value hero__value--big">
                {hero.next.days === 0 ? (
                  t('Heute!')
                ) : (
                  <>
                    <CountUp value={hero.next.days} /> <small>{hero.next.days === 1 ? t('Tag') : t('Tage')}</small>
                  </>
                )}
              </strong>
              <span className="hero__note">{t('{occasion} von {name} · {date}', { occasion: t(hero.next.o.label), name: hero.person.name, date: dateLabel(hero.next.o) })}</span>
              <span className="hero__cta">
                {t('{ideas} ansehen', { ideas: t.n(hero.ideas.length, 'Idee', 'Ideen') })} <ArrowRight size={14} />
              </span>
            </div>
            <Avatar name={hero.person.name} hue={hero.person.hue} size={56} />
          </motion.button>
        )}

        {view !== 'persons' ? null : rows.length > 0 ? (
          <ul className="group">
            <AnimatePresence>
              {rows.map(({ person, next, ideas, spent, planned, dupes }, i) => (
                <motion.li
                  key={person.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 + Math.min(i, 6) * 0.05 }}
                >
                  <button className="person-row spot" onClick={() => open({ type: 'person', id: person.id })}>
                    <Avatar name={person.name} hue={person.hue} size={44} />
                    <div className="person-row__main">
                      <div className="person-row__top">
                        <strong>{person.name}</strong>
                        {next && <span>{untilLabel(next.days, t)}</span>}
                      </div>
                      <div className="person-row__sub">
                        <span>
                          {next ? t(next.o.label) : t('Kein Anlass')} · {t.n(ideas.length, 'Idee', 'Ideen')}
                        </span>
                        {dupes > 0 && <Chip tone="accent">{t('{n}× schon vorhanden', { n: dupes })}</Chip>}
                      </div>
                      <BudgetBar spent={spent} planned={planned} budget={person.budget} hideText />
                    </div>
                    <ChevronRight size={18} className="person-row__chev" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <EmptyState
            emoji="🎁"
            title={t('Für wen suchst du Geschenke?')}
            text={t('Lege Personen mit Anlass und Budget an. Deine Ideen dazu bleiben komplett privat.')}
            action={
              <button className="btn btn--primary" onClick={() => setAdding(true)}>
                <Plus size={17} /> {t('Erste Person anlegen')}
              </button>
            }
          />
        )}
      </Page>
      <Presence show={adding}>{adding && <PersonFormSheet onClose={() => setAdding(false)} />}</Presence>
      <ListSheetHost open={newList} owner={persons[0]?.id ?? 'me'} ownerChoices={persons} onClose={() => setNewList(false)} onCreated={(id) => open({ type: 'list', id })} />
    </>
  )
}
