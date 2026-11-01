import { motion } from 'motion/react'
import { CalendarDays, Plus } from 'lucide-react'
import { daysUntilIso, distanceLabel, eur } from '../lib/format'
import { listTitle } from '../lib/lists'
import type { ListStats } from '../lib/stats'
import type { Wishlist } from '../lib/types'
import { useT } from '../state/ui'

export interface TileRow {
  list: Wishlist
  stats: ListStats
  /** Zusatzzeile unter dem Namen, z. B. der Name der Person. */
  owner?: string
}

interface Props {
  rows: TileRow[]
  onOpen: (id: string) => void
  onNew?: () => void
}

function TileDate({ iso }: { iso: string }) {
  const t = useT()
  const days = daysUntilIso(iso)
  if (days === null) return null
  return (
    <span className="ltile__date" data-past={days < 0} data-soon={days >= 0 && days <= 14}>
      <CalendarDays size={12} /> {distanceLabel(days, t)}
    </span>
  )
}

type HueStyle = React.CSSProperties & { '--h': number }

/** Kacheln der Listen mit Gesamtwert, Fortschritt und Zahlen. Tippen öffnet die Liste. */
export function ListTiles({ rows, onOpen, onNew }: Props) {
  const t = useT()
  return (
    <div className="ltiles">
      {rows.map(({ list, stats, owner }, i) => {
        const done = stats.count ? stats.bought / stats.count : 0
        const style: HueStyle = { '--h': list.hue }
        return (
          <motion.button
            key={list.id}
            className="ltile spot"
            style={style}
            onClick={() => onOpen(list.id)}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.06 + Math.min(i, 8) * 0.04 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="ltile__top">
              <span className="ltile__icon" aria-hidden>
                {list.emoji}
              </span>
              <span className="ltile__name">
                <strong>{listTitle(list, t)}</strong>
                {owner && <small>{owner}</small>}
              </span>
            </span>
            {list.date && <TileDate iso={list.date} />}
            <span className="ltile__total">{stats.count ? eur(stats.total) : t('Leer')}</span>
            <span className="ltile__bar" aria-hidden>
              <span style={{ width: `${done * 100}%` }} />
            </span>
            <span className="ltile__foot">
              <span>{t('{n} offen', { n: stats.open })}</span>
              <span>{eur(stats.openValue)}</span>
            </span>
            <span className="ltile__foot ltile__foot--dim">
              <span>{t('{n} gekauft', { n: stats.bought })}</span>
              <span>{eur(stats.boughtValue)}</span>
            </span>
          </motion.button>
        )
      })}
      {onNew && (
        <button className="ltile ltile--new" onClick={onNew}>
          <Plus size={20} strokeWidth={2.4} />
          <span>{t('Neue Liste')}</span>
        </button>
      )}
    </div>
  )
}
