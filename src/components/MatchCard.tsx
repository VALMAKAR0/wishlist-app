import { motion } from 'motion/react'
import { TriangleAlert } from 'lucide-react'
import { longDate } from '../lib/format'
import type { Match } from '../lib/match'
import { useT } from '../state/ui'
import { Cover } from './Primitives'

/** Vergleichskarten: zeigt, womit ein neuer Eintrag kollidiert (Ähnlicher Name oder gleiche Art). */
export function MatchWarning({ matches, ownerName }: { matches: Match[]; ownerName: string }) {
  const t = useT()
  if (!matches.length) return null

  const status = (m: Match) => {
    const c = m.candidate
    const date = c.boughtAt ? longDate(c.boughtAt) : ''
    switch (c.source) {
      case 'owned':
        return c.boughtAt ? t('{person} besitzt das schon, gekauft am {date}', { person: c.person ?? ownerName, date }) : t('{person} besitzt das schon', { person: c.person ?? ownerName })
      case 'bought':
        return c.boughtAt ? t('Schon gekauft am {date}', { date }) : t('Schon gekauft')
      case 'idea':
        return t('Schon als Idee notiert')
      default:
        return t('Steht schon auf deiner Liste')
    }
  }

  const reason = (m: Match) => {
    const kind = m.candidate.kind ? t(m.candidate.kind) : ''
    if (m.reason === 'name') return t('Ähnlicher Name')
    if (m.reason === 'kind') return t('Gleiche Art: {kind}', { kind })
    return t('Ähnlicher Name, gleiche Art: {kind}', { kind })
  }

  return (
    <motion.div className="matchwarn" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }} role="alert">
      <div className="matchwarn__inner">
        <div className="matchwarn__head">
          <TriangleAlert size={16} />
          <strong>{matches.length === 1 ? t('Das gibt es schon, prüfe kurz') : t('Ähnliches gibt es schon, prüfe kurz')}</strong>
        </div>
        <ul>
          {matches.slice(0, 3).map((m) => (
            <li key={m.candidate.id} className="matchwarn__row">
              <Cover emoji={m.candidate.emoji} hue={m.candidate.hue} size={36} />
              <div>
                <b>{m.candidate.name}</b>
                <span>{status(m)}</span>
                <small>{reason(m)}</small>
              </div>
            </li>
          ))}
        </ul>
        {matches.length > 3 && <small className="matchwarn__more">{t('und {n} weitere', { n: matches.length - 3 })}</small>}
      </div>
    </motion.div>
  )
}
