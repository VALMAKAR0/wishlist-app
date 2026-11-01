import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { CalendarPlus, ListChecks, Pencil, Plus } from 'lucide-react'
import { ListSheetHost } from '../components/Lists'
import { ListTiles } from '../components/ListTiles'
import { AddButton, Page, Section } from '../components/Page'
import { Presence } from '../components/Presence'
import { Avatar, CountUp } from '../components/Primitives'
import { OccasionSheet } from '../components/OccasionSheet'
import { ItemFormSheet } from '../components/ItemFormSheet'
import { PersonFormSheet } from '../components/PersonFormSheet'
import { dateLabel, daysUntil, eur, untilLabel } from '../lib/format'
import type { Occasion } from '../lib/types'
import { nextOccasion, occasionEmoji } from '../lib/occasions'
import { listStats } from '../lib/stats'
import { useNav } from '../state/nav'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'
import { BudgetBar } from './IdeasScreen'

export function PersonScreen({ id }: { id: string }) {
  const t = useT()
  const { persons, items, lists: allLists } = useStore()
  const { back, open } = useNav()
  const ui = useUI()
  const person = persons.find((p) => p.id === id)
  const lists = useMemo(() => allLists.filter((l) => l.owner === id), [allLists, id])
  const [form, setForm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [newList, setNewList] = useState(false)
  const [occ, setOcc] = useState<{ occasion: Occasion | null } | null>(null)

  // Person wurde gelöscht: zurück zur Übersicht.
  useEffect(() => {
    if (!person) back()
  }, [person, back])
  if (!person) return null

  const mineAll = items.filter((i) => i.owner === id && !i.deletedAt)
  const spent = mineAll.filter((i) => i.bought).reduce((s, i) => s + (i.price ?? 0), 0)
  const planned = mineAll.filter((i) => !i.bought).reduce((s, i) => s + (i.price ?? 0), 0)
  const next = nextOccasion(person)
  const rows = lists.map((l) => ({ list: l, stats: listStats(mineAll.filter((i) => i.listId === l.id)) }))

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
            <AddButton label={t('Idee')} onClick={() => setForm(true)} />
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

        <Section
          title={t('Listen')}
          aside={
            <button className="chip chip--button" onClick={() => open({ type: 'list', id: `all:${id}` })}>
              <ListChecks size={14} /> {t('Alle Ideen')}
            </button>
          }
        >
          <ListTiles rows={rows} onOpen={(lid) => open({ type: 'list', id: lid })} onNew={() => setNewList(true)} />
        </Section>

        <Section
          title={t('Anlässe')}
          aside={
            <span className="row row--gap">
              <button className="chip chip--button" onClick={() => ui.planned('ics-export')}>
                <CalendarPlus size={14} /> {t('Erinnerung')}
              </button>
              <button className="chip chip--button" onClick={() => setOcc({ occasion: null })}>
                <Plus size={14} /> {t('Anlass')}
              </button>
            </span>
          }
        >
          {person.occasions.length === 0 ? (
            <span className="muted">{t('Noch kein Anlass eingetragen.')}</span>
          ) : (
            <div className="occs">
              {person.occasions
                .map((o) => ({ o, d: daysUntil(o) }))
                .sort((a, b) => a.d - b.d)
                .map(({ o, d }, i) => (
                  <motion.button
                    key={o.id}
                    className="occ-tile spot"
                    data-next={i === 0}
                    data-soon={d <= 14}
                    onClick={() => setOcc({ occasion: o })}
                    aria-label={t('Anlass bearbeiten')}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.06, type: 'spring', stiffness: 320, damping: 26 }}
                    whileTap={{ scale: 0.985 }}
                  >
                    <span className="occ-tile__emoji" aria-hidden>
                      {occasionEmoji(o.label)}
                    </span>
                    <span className="occ-tile__main">
                      <strong>{t(o.label)}</strong>
                      <span>{dateLabel(o)}</span>
                    </span>
                    <span className="occ-tile__days">
                      {d <= 1 ? <strong>{d === 0 ? t('Heute') : t('Morgen')}</strong> : (
                        <>
                          <strong>{d}</strong>
                          <small>{t('Tage')}</small>
                        </>
                      )}
                    </span>
                  </motion.button>
                ))}
            </div>
          )}
        </Section>
      </Page>

      <Presence show={form}>{form && <ItemFormSheet key="new" owner={id} onClose={() => setForm(false)} />}</Presence>
      <Presence show={!!occ}>{occ && <OccasionSheet key={occ.occasion?.id ?? 'new'} person={person} occasion={occ.occasion} onClose={() => setOcc(null)} />}</Presence>
      <Presence show={editing}>{editing && <PersonFormSheet person={person} onClose={() => setEditing(false)} />}</Presence>
      <ListSheetHost open={newList} owner={id} onClose={() => setNewList(false)} onCreated={(lid) => open({ type: 'list', id: lid })} />
    </>
  )
}
