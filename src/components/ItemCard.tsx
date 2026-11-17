import { useEffect, useRef, useState, type MouseEvent, type Ref } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { ArrowDownToLine, Check, CircleHelp, ExternalLink, FolderInput, Heart, HeartOff, StickyNote, Target, TrendingDown, TrendingUp, Trash2, Undo2 } from 'lucide-react'
import { agoLabel, curOf, hostOf, money, toHref } from '../lib/format'
import { atLowest, targetHit } from '../lib/listQuery'
import { priceDelta } from '../lib/priceCheck'
import type { Item } from '../lib/types'
import { useT, useUI } from '../state/ui'
import { Cover, PriceTag, PrioMark } from './Primitives'

interface ItemCardProps {
  item: Item
  index: number
  onOpen: () => void
  onToggle: (origin: { x: number; y: number }) => void
  onTrash: () => void
  /** Langer Wisch nach rechts: in eine andere Liste verschieben. Fehlt der Handler, gibt es nur die kurze Stufe. */
  onMove?: () => void
  /** Kurzer Wisch nach links: als Favorit (höchste Wichtigkeit) markieren oder wieder lösen. */
  onFavorite?: () => void
  /** Hinweis-Badge, z. B. "Schon vorhanden". */
  badge?: string
  /** Name der Liste, wenn mehrere Listen gemischt angezeigt werden. */
  listLabel?: string
  /** Auswahl-Modus: Antippen markiert, Wischen ist aus. */
  selectMode?: boolean
  selected?: boolean
  onLongPress?: () => void
  /** Weiches Umsortieren (nur bei kurzen Listen, kostet Messungen). */
  flow?: boolean
  ref?: Ref<HTMLLIElement>
}

const SWIPE = 88
const SWIPE_FAR = 200
/** So viel von der Fingerbewegung folgt die Zeile, darüber hinaus gibt sie federnd nach. */
const PULL = 0.85

/** Zeile mit vier Wisch-Stufen: rechts kurz = gekauft, rechts weit = verschieben, links kurz = Favorit, links weit = Papierkorb. */
export function ItemCard({ item, index, onOpen, onToggle, onTrash, onMove, onFavorite, badge, listLabel, selectMode, selected, onLongPress, flow, ref }: ItemCardProps) {
  const t = useT()
  const ui = useUI()
  const delta = ui.settings.priceWatch ? priceDelta(item) : null
  const watching = ui.settings.priceWatch && item.priceTrack !== false
  const asked = watching && !!item.priceSuggest
  const hit = watching && !item.bought && targetHit(item)
  const low = watching && !item.bought && !hit && atLowest(item)
  const x = useMotionValue(0)
  const cardRef = useRef<HTMLDivElement>(null)
  // Antippen = Klick ohne nennenswerte Bewegung. So zählt das Loslassen nach einem Wisch nie als Antippen.
  const down = useRef<{ x: number; y: number } | null>(null)
  const hold = useRef<number | undefined>(undefined)
  const held = useRef(false)
  const stopHold = () => {
    window.clearTimeout(hold.current)
    hold.current = undefined
  }
  useEffect(() => stopHold, [])
  const rightBg = useTransform(x, [0, SWIPE * PULL * 0.6], [0, 1])
  const leftBg = useTransform(x, [-SWIPE * PULL * 0.6, 0], [1, 0])
  const rightScale = useTransform(x, [0, SWIPE * PULL], [0.6, 1])
  const leftScale = useTransform(x, [-SWIPE * PULL, 0], [1, 0.6])
  const canMove = !!onMove
  const stageOf = (v: number) => (v > SWIPE_FAR && canMove ? 2 : v > SWIPE ? 1 : v < -SWIPE_FAR ? -2 : v < -SWIPE ? -1 : 0)
  const [stage, setStage] = useState(0)
  const follow = (offset: number) => {
    const next = stageOf(offset)
    if (next !== stage) {
      setStage(next)
      if (next !== 0) ui.haptic(10)
    }
  }
  const fav = (item.prio ?? 0) >= 3

  const center = (el: Element | null) => {
    const r = (el ?? document.body).getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }

  const toggleFromButton = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onToggle(center(e.currentTarget))
  }

  const openLink = (e: MouseEvent<HTMLButtonElement>) => {
    if (selectMode) return
    e.stopPropagation()
    if (item.link) window.open(toHref(item.link), '_blank', 'noopener,noreferrer')
  }

  const snapBack = () => animate(x, 0, { type: 'spring', stiffness: 520, damping: 38 })

  return (
    <motion.li
      ref={ref}
      className="swipe"
      layout={flow ? 'position' : undefined}
      initial={index < 16 ? { opacity: 0, y: 22, scale: 0.97 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, height: 0, marginBottom: 0, overflow: 'hidden', pointerEvents: 'none', transition: { duration: 0.24 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: Math.min(index, 7) * 0.05 }}
    >
      <div className="swipe__bg" aria-hidden>
        <motion.span className="swipe__act swipe__act--good" data-stage={stage > 0 ? stage : undefined} style={{ opacity: rightBg }}>
          <motion.span style={{ scale: rightScale }}>{stage === 2 ? <FolderInput size={22} /> : item.bought ? <Undo2 size={22} /> : <Check size={22} />}</motion.span>
          {stage === 2 ? t('Verschieben') : item.bought ? t('Zurück') : t('Gekauft')}
        </motion.span>
        <motion.span className="swipe__act swipe__act--bad" data-stage={stage < 0 ? -stage : undefined} style={{ opacity: leftBg }}>
          {stage === -2 ? t('Löschen') : fav ? t('Kein Favorit') : t('Favorit')}
          <motion.span style={{ scale: leftScale }}>{stage === -2 ? <Trash2 size={22} /> : fav ? <HeartOff size={22} /> : <Heart size={22} />}</motion.span>
        </motion.span>
      </div>

      <motion.div
        ref={cardRef}
        className="item spot"
        data-done={item.bought}
        data-selected={selectMode ? !!selected : undefined}
        style={{ x }}
        drag={selectMode ? false : 'x'}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={PULL}
        dragMomentum={false}
        whileTap={{ scale: 0.985 }}
        onDrag={(_, info) => follow(info.offset.x)}
        onDragEnd={(_, info) => {
          const st = stageOf(info.offset.x)
          if (st === 2) {
            snapBack()
            onMove?.()
          } else if (st === 1) {
            const origin = center(cardRef.current)
            snapBack()
            onToggle(origin)
          } else if (st === -1) {
            snapBack()
            onFavorite?.()
          } else if (st === -2) {
            animate(x, -window.innerWidth, { duration: 0.22, ease: 'easeIn' }).then(onTrash)
          } else {
            snapBack()
          }
          setStage(0)
        }}
        role={selectMode ? 'checkbox' : 'button'}
        aria-checked={selectMode ? !!selected : undefined}
        tabIndex={0}
        aria-label={selectMode ? item.name : t('{name} bearbeiten', { name: item.name })}
        onPointerDown={(e) => {
          down.current = { x: e.clientX, y: e.clientY }
          held.current = false
          stopHold()
          if (onLongPress && !selectMode && !(e.target as HTMLElement).closest('[data-no-open]')) {
            hold.current = window.setTimeout(() => {
              held.current = true
              onLongPress()
            }, 480)
          }
        }}
        onPointerMove={(e) => {
          const d = down.current
          if (hold.current !== undefined && d && (Math.abs(e.clientX - d.x) > 8 || Math.abs(e.clientY - d.y) > 8)) stopHold()
        }}
        onPointerUp={stopHold}
        onPointerCancel={stopHold}
        onClick={(e) => {
          if (held.current) {
            held.current = false
            return
          }
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
            <PrioMark prio={item.prio} label={t('Wichtigkeit {n} von 3', { n: item.prio ?? 0 })} />
          </div>
          <div className="item__meta">
            {item.price !== undefined && <PriceTag price={item.price} cur={item.currency} />}
            {delta !== null && (
              <span className="item__delta" data-dir={delta < 0 ? 'down' : 'up'} data-testid="price-delta" aria-label={delta < 0 ? t('Preis gesunken um {p}', { p: money(-delta, curOf(item)) }) : t('Preis gestiegen um {p}', { p: money(delta, curOf(item)) })}>
                {delta < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />} {money(Math.abs(delta), curOf(item))}
              </span>
            )}
            {hit && (
              <span className="item__hit" data-testid="target-hit">
                <Target size={12} /> {t('Wunschpreis')}
              </span>
            )}
            {low && (
              <span className="item__low" data-testid="at-lowest">
                <ArrowDownToLine size={12} /> {t('Tiefstpreis')}
              </span>
            )}
            {asked && (
              <span className="item__ask" data-testid="price-ask">
                <CircleHelp size={12} /> {t('Neuer Preis?')}
              </span>
            )}
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
        {selectMode ? (
          <span className="pick" data-on={!!selected} aria-hidden>
            <Check size={16} strokeWidth={3.2} />
          </span>
        ) : (
        <button className="check" data-on={item.bought} data-no-open aria-label={item.bought ? t('Als offen markieren') : t('Als gekauft markieren')} onClick={toggleFromButton}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <motion.path d="M5.5 12.5l4.5 4.5L18.5 7.5" initial={false} animate={{ pathLength: item.bought ? 1 : 0, opacity: item.bought ? 1 : 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} />
          </svg>
        </button>
        )}
      </motion.div>
    </motion.li>
  )
}
