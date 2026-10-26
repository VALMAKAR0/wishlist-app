import { useMemo } from 'react'
import { motion } from 'motion/react'
import { Page, Section } from '../components/Page'
import { Avatar, CountUp, EmptyState } from '../components/Primitives'
import { eur, monthShort } from '../lib/format'
import { listTitle } from '../lib/lists'
import { overview } from '../lib/stats'
import { useStore } from '../state/store'
import { useT } from '../state/ui'

const money = (n: number) => eur(Math.round(n))
const ease = [0.22, 1, 0.36, 1] as const

function Tile({ label, value, sub, delay = 0 }: { label: string; value: string; sub?: string; delay?: number }) {
  return (
    <motion.div className="tile" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: 'spring', stiffness: 300, damping: 28 }}>
      <span className="tile__label">{label}</span>
      <b className="tile__value">{value}</b>
      {sub && <span className="tile__sub">{sub}</span>}
    </motion.div>
  )
}

function Bar({ label, lead, value, max, note, delay = 0, tone = 'accent' }: { label: string; lead?: React.ReactNode; value: number; max: number; note: string; delay?: number; tone?: 'accent' | 'gold' }) {
  return (
    <li className="hbar">
      {lead}
      <div className="hbar__main">
        <div className="hbar__top">
          <span>{label}</span>
          <b>{note}</b>
        </div>
        <div className="hbar__track">
          <motion.span className="hbar__fill" data-tone={tone} initial={{ width: 0 }} animate={{ width: `${max ? Math.max(value ? 3 : 0, (value / max) * 100) : 0}%` }} transition={{ duration: 0.9, delay, ease }} />
        </div>
      </div>
    </li>
  )
}

export function StatsScreen() {
  const t = useT()
  const { items, lists, persons, received, alreadyOwned } = useStore()
  const o = useMemo(() => overview(items, lists, persons, received, alreadyOwned, (l) => listTitle(l, t)), [items, lists, persons, received, alreadyOwned, t])

  const empty = o.wishes.count + o.gifts.count === 0
  const monthMax = Math.max(1, ...o.months.map((m) => m.self + m.gifts))
  const personMax = Math.max(1, ...o.persons.map((p) => Math.max(p.spent, p.person.budget)))
  const listMax = Math.max(1, ...o.lists.map((l) => l.stats.total))
  const split = o.spentTotal ? o.spentSelf / o.spentTotal : 0

  return (
    <Page title={t('Statistik')} eyebrow={t('Alles im Blick')} subtitle={t('Was du für dich und für andere planst und ausgibst')}>
      {empty ? (
        <EmptyState emoji="📊" title={t('Noch keine Daten')} text={t('Sobald du Wünsche und Ideen anlegst und abhakst, siehst du hier Zahlen, Verläufe und Vergleiche.')} />
      ) : (
        <>
          <motion.section className="hero hero--stack spot" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, type: 'spring', stiffness: 240, damping: 24 }}>
            <span className="hero__label">{t('Insgesamt ausgegeben')}</span>
            <strong className="hero__value hero__value--big">
              <CountUp value={o.spentTotal} format={money} />
            </strong>
            <span className="hero__note">{t('{n} gekaufte Artikel', { n: o.boughtCount })}</span>
            <div className="split" aria-hidden>
              <motion.span className="split__self" initial={{ width: 0 }} animate={{ width: `${split * 100}%` }} transition={{ duration: 0.9, delay: 0.2, ease }} />
              <motion.span className="split__gifts" initial={{ width: 0 }} animate={{ width: `${(1 - split) * (o.spentTotal ? 100 : 0)}%` }} transition={{ duration: 0.9, delay: 0.25, ease }} />
            </div>
            <div className="legend">
              <span>
                <i className="dot dot--self" /> {t('Für mich')} <b>{money(o.spentSelf)}</b>
              </span>
              <span>
                <i className="dot dot--gifts" /> {t('Für andere')} <b>{money(o.spentGifts)}</b>
              </span>
            </div>
          </motion.section>

          <div className="tiles">
            <Tile delay={0.08} label={t('Offene Wünsche')} value={String(o.wishes.open)} sub={money(o.wishes.openValue)} />
            <Tile delay={0.11} label={t('Gekauft für mich')} value={String(o.wishes.bought)} sub={money(o.wishes.boughtValue)} />
            <Tile delay={0.14} label={t('Offene Ideen')} value={String(o.gifts.open)} sub={money(o.gifts.openValue)} />
            <Tile delay={0.17} label={t('Geschenke gekauft')} value={String(o.gifts.bought)} sub={money(o.gifts.boughtValue)} />
            <Tile delay={0.2} label={t('Ø Preis')} value={o.avgPrice ? money(o.avgPrice) : '–'} sub={t('über alle Einträge')} />
            <Tile delay={0.23} label={t('Erledigt')} value={`${Math.round(o.doneRate * 100)}%`} sub={t('aller Einträge')} />
          </div>

          <Section title={t('Ausgaben pro Monat')}>
            <div className="card chartcard">
              <div className="chart" role="img" aria-label={t('Ausgaben der letzten sechs Monate')}>
                {o.months.map((m, i) => {
                  const total = m.self + m.gifts
                  return (
                    <div key={m.ts} className="chart__col">
                      <span className="chart__val">{total ? money(total) : ''}</span>
                      <div className="chart__stack">
                        <motion.span className="chart__bar chart__bar--gifts" initial={{ height: 0 }} animate={{ height: `${(m.gifts / monthMax) * 100}%` }} transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease }} />
                        <motion.span className="chart__bar chart__bar--self" initial={{ height: 0 }} animate={{ height: `${(m.self / monthMax) * 100}%` }} transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease }} />
                      </div>
                      <span className="chart__lab">{monthShort(m.ts)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="legend legend--center">
                <span>
                  <i className="dot dot--self" /> {t('Für mich')}
                </span>
                <span>
                  <i className="dot dot--gifts" /> {t('Für andere')}
                </span>
              </div>
            </div>
          </Section>

          {o.persons.length > 0 && (
            <Section title={t('Pro Person')}>
              <ul className="card hbars">
                {o.persons.map((p, i) => (
                  <Bar
                    key={p.person.id}
                    lead={<Avatar name={p.person.name} hue={p.person.hue} size={32} />}
                    label={p.person.name}
                    note={`${money(p.spent)} / ${money(p.person.budget)}`}
                    value={p.spent}
                    max={personMax}
                    delay={0.1 + i * 0.07}
                    tone="gold"
                  />
                ))}
              </ul>
            </Section>
          )}

          <Section title={t('Pro Liste')}>
            <ul className="card hbars">
              {o.lists
                .filter((l) => l.stats.count > 0)
                .sort((a, b) => b.stats.total - a.stats.total)
                .map((l, i) => (
                  <Bar
                    key={l.list.id}
                    lead={<span className="hbar__emoji" aria-hidden>{l.list.emoji}</span>}
                    label={l.ownerName ? `${l.list.name} · ${l.ownerName}` : l.list.name}
                    note={`${money(l.stats.total)} · ${t.n(l.stats.count, 'Eintrag', 'Einträge')}`}
                    value={l.stats.total}
                    max={listMax}
                    delay={0.1 + i * 0.06}
                  />
                ))}
            </ul>
          </Section>

          {o.kinds.length > 0 && (
            <Section title={t('Häufigste Arten')}>
              <div className="chips">
                {o.kinds.map((k) => (
                  <span key={k.kind} className="chip chip--accent">
                    {t(k.kind)} · {k.count}
                  </span>
                ))}
              </div>
            </Section>
          )}

          <Section title={t('Weiteres')}>
            <dl className="card facts">
              <div>
                <dt>{t('Teuerster Eintrag')}</dt>
                <dd>{o.priciest ? `${o.priciest.name} · ${money(o.priciest.price ?? 0)}` : '–'}</dd>
              </div>
              <div>
                <dt>{t('Günstigster Eintrag')}</dt>
                <dd>{o.cheapest ? `${o.cheapest.name} · ${money(o.cheapest.price ?? 0)}` : '–'}</dd>
              </div>
              <div>
                <dt>{t('Doppelte erkannt')}</dt>
                <dd>{o.duplicates}</dd>
              </div>
              <div>
                <dt>{t('Anlässe in 30 Tagen')}</dt>
                <dd>{o.upcoming}</dd>
              </div>
              <div>
                <dt>{t('Gesamtbudget aller Personen')}</dt>
                <dd>{money(o.budgetTotal)}</dd>
              </div>
              <div>
                <dt>{t('Personen')}</dt>
                <dd>{persons.length}</dd>
              </div>
              <div>
                <dt>{t('Listen')}</dt>
                <dd>{o.listCount}</dd>
              </div>
              <div>
                <dt>{t('Erhaltene Pakete')}</dt>
                <dd>
                  {o.receivedPackages} · {t.n(o.receivedItems, 'Wunsch', 'Wünsche')}
                </dd>
              </div>
              <div>
                <dt>{t('Im Papierkorb')}</dt>
                <dd>{o.trash}</dd>
              </div>
            </dl>
          </Section>
        </>
      )}
    </Page>
  )
}
