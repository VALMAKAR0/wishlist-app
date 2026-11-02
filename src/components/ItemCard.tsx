import { useRef, type MouseEvent, type Ref } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { Check, ExternalLink, StickyNote, Trash2, Undo2 } from 'lucide-react'
import { agoLabel, hostOf, toHref } from '../lib/format'
import type { Item } from '../lib/types'
import { useT } from '../state/ui'
import { Cover, PriceTag } from './Primitives'

interface ItemCardProps {
  item: Item
  index: number
  onOpen: () => void
  onToggle: (origin: { x: number; y: number }) => void
  onTrash: () => void
  /** Hinweis-Badge, z. B. "Schon vorhanden". */
  badge?: string
  /** Name der Liste, wenn mehrere Listen gemischt angezeigt werden. */
  listLabel?: string
  ref?: Ref<HTMLLIElement>
}

const SWIPE = 92

/** Zeile mit Wisch-Gesten: nach rechts = gekauft, nach links = Papierkorb. */
export function ItemCard({ item, index, onOpen, onToggle, onTrash, badge, listLabel, ref }: ItemCardProps) {
  const t = useT()
  const x = useMotionValue(0)
  const cardRef = useRef<HTMLDivElement>(null)
  // Antippen = Klick ohne nennenswerte Bewegung. So zählt das Loslassen nach einem Wisch nie als Antippen.
  const down = useRef<{ x: number; y: number } | null>(null)
  const rightBg = useTransform(x, [0, SWIPE], [0, 1])
  const leftBg = useTransform(x, [-SWIPE, 0], [1, 0])
  const rightScale = useTransform(x, [0, SWIPE], [0.6, 1])
  const leftScale = useTransform(x, [-SWIPE, 0], [1, 0.6])

  const center = (el: Element | null) => {
    const r = (el ?? document.body).getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }

  const toggleFromButton = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onToggle(center(e.currentTarget))
  }

  const openLink = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (item.link) window.open(toHref(item.link), '_blank', 'noopener,noreferrer')
  }

  const snapBack = () => animate(x, 0, { type: 'spring', stiffness: 520, damping: 38 })

  return (
    <motion.li
      ref={ref}
      className="swipe"
      initial={{ opacity: 0, y: 22, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, height: 0, marginBottom: 0, overflow: 'hidden', pointerEvents: 'none', transition: { duration: 0.24 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: Math.min(index, 7) * 0.05 }}
    >
      <div className="swipe__bg" aria-hidden>
        <motion.span className="swipe__act swipe__act--good" style={{ opacity: rightBg }}>
          <motion.span style={{ scale: rightScale }}>{item.bought ? <Undo2 size={22} /> : <Check size={22} />}</motion.span>
          {item.bought ? t('Zurück') : t('Gekauft')}
        </motion.span>
        <motion.span className="swipe__act swipe__act--bad" style={{ opacity: leftBg }}>
          {t('Löschen')}
          <motion.span style={{ scale: leftScale }}>
            <Trash2 size={22} />
          </motion.span>
        </motion.span>
      </div>

      <motion.div
        ref={cardRef}
        className="item spot"
        data-done={item.bought}
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        dragMomentum={false}
        whileTap={{ scale: 0.985 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > SWIPE) {
            const origin = center(cardRef.current)
            snapBack()
            onToggle(origin)
          } else if (info.offset.x < -SWIPE) {
            animate(x, -window.innerWidth, { duration: 0.22, ease: 'easeIn' }).then(onTrash)
          } else {
            snapBack()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={t('{name} bearbeiten', { name: item.name })}
        onPointerDown={(e) => {
          down.current = { x: e.clientX, y: e.clientY }
        }}
        onClick={(e) => {
          const d = down.current
          if (d && (Math.abs(e.clientX - d.x) > 8 || Math.abs(e.clientY - d.y) > 8)) return
          onOpen()
        }}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onOpen()
          }
        }}
      >
        <Cover emoji={item.emoji} hue={item.hue} size={44} imageId={item.imageId} />
        <div className="item__main">
          <div className="item__title">
            <span className="item__name">{item.name}</span>
          </div>
          <div className="item__meta">
            {item.price !== undefined && <PriceTag price={item.price} cur={item.currency} />}
            {item.link && (
              <button className="linkbtn" data-no-open onClick={openLink} aria-label={t('Link öffnen: {host}', { host: hostOf(item.link) })}>
                <ExternalLink size={12} /> {hostOf(item.link)}
              </button>
            )}
            {item.note && <StickyNote size={13} aria-label={t('Notiz vorhanden')} />}
            {item.bought && item.boughtAt && <span className="item__when">{agoLabel(item.boughtAt, t)}</span>}
            {listLabel && <span className="item__list">{listLabel}</span>}
          </div>
          {badge && (
            <motion.span className="item__badge" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + index * 0.05, type: 'spring', stiffness: 380, damping: 18 }}>
              <i /> {badge}
            </motion.span>
          )}
        </div>
        <button className="check" data-on={item.bought} data-no-open aria-label={item.bought ? t('Als offen markieren') : t('Als gekauft markieren')} onClick={toggleFromButton}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <motion.path d="M5.5 12.5l4.5 4.5L18.5 7.5" initial={false} animate={{ pathLength: item.bought ? 1 : 0, opacity: item.bought ? 1 : 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} />
          </svg>
        </button>
      </motion.div>
    </motion.li>
  )
}
