import { useRef, useState, type ReactNode } from 'react'
import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react'
import { ChevronDown, ChevronLeft, Plus } from 'lucide-react'
import { cap } from '../lib/i18n'
import { useT } from '../state/ui'

interface PageProps {
  title: string
  eyebrow?: string
  subtitle?: ReactNode
  actions?: ReactNode
  onBack?: () => void
  children: ReactNode
}

/** Seite mit eigenem Scroll-Container und schrumpfender Kopfzeile. Den Übergang zwischen Seiten übernimmt die Bühne. */
export function Page({ title, eyebrow, subtitle, actions, onBack, children }: PageProps) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const { scrollY } = useScroll({ container: ref })
  const smallOpacity = useTransform(scrollY, [36, 84], [0, 1])
  const smallY = useTransform(scrollY, [36, 84], [10, 0])
  const headShift = useTransform(scrollY, [0, 120], [0, -14])
  const headFade = useTransform(scrollY, [0, 110], [1, 0.25])
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 8))

  return (
    <div ref={ref} className="page">
      <div className="page__bar">
        <div className="page__bar-bg" data-on={scrolled} />
        <div className="page__bar-row">
          {onBack ? (
            <button className="icon-btn" onClick={onBack} aria-label={t('Zurück')}>
              <ChevronLeft size={22} />
            </button>
          ) : (
            <span className="page__bar-spacer" />
          )}
          <motion.h2 className="page__small-title" style={{ opacity: smallOpacity, y: smallY }}>
            {title}
          </motion.h2>
          <div className="page__actions">{actions}</div>
        </div>
      </div>

      <div className="page__inner">
        <motion.header className="page__head" style={{ y: headShift, opacity: headFade }}>
          {eyebrow && <span className="page__eyebrow">{eyebrow}</span>}
          <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 26 }}>
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p className="page__subtitle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              {subtitle}
            </motion.p>
          )}
        </motion.header>
        {children}
      </div>
    </div>
  )
}

/** Kompakter Hauptknopf in der Kopfzeile, ersetzt den schwebenden Plus-Button. */
export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <motion.button
      className="add-btn"
      aria-label={label}
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15, type: 'spring', stiffness: 380, damping: 22 }}
    >
      <Plus size={17} strokeWidth={2.8} />
      {cap(label)}
    </motion.button>
  )
}

const COLLAPSE_KEY = 'wl.collapsed'

function readCollapsed(id: string): boolean {
  try {
    return !!JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? '{}')[id]
  } catch {
    return false
  }
}

function writeCollapsed(id: string, on: boolean) {
  try {
    const all = JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? '{}')
    if (on) all[id] = true
    else delete all[id]
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(all))
  } catch {
    /* Speicher nicht verfügbar: nur für diese Sitzung */
  }
}

interface SectionProps {
  title: string
  aside?: ReactNode
  children: ReactNode
  /** Macht den Abschnitt einklappbar. Der Zustand bleibt pro Gerät gemerkt. */
  collapseId?: string
  /** Kurzinfo neben dem Titel, solange der Abschnitt eingeklappt ist. */
  summary?: string
}

export function Section({ title, aside, children, collapseId, summary }: SectionProps) {
  const t = useT()
  const [closed, setClosed] = useState(() => (collapseId ? readCollapsed(collapseId) : false))
  const [settled, setSettled] = useState(true)
  const toggle = () => {
    if (!collapseId) return
    setSettled(false)
    setClosed((c) => {
      writeCollapsed(collapseId, !c)
      return !c
    })
  }
  return (
    <section className="section" data-closed={closed}>
      <div className="section__head">
        {collapseId ? (
          <button className="section__toggle" onClick={toggle} aria-expanded={!closed} aria-label={`${title} ${closed ? t('ausklappen') : t('einklappen')}`}>
            <ChevronDown size={15} strokeWidth={2.6} aria-hidden />
            <h3>{title}</h3>
            {closed && summary && <small>{summary}</small>}
          </button>
        ) : (
          <h3>{title}</h3>
        )}
        {!closed && aside}
      </div>
      <motion.div
        initial={false}
        animate={{ height: closed ? 0 : 'auto', opacity: closed ? 0 : 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{ overflow: settled && !closed ? 'visible' : 'hidden' }}
        onAnimationComplete={() => setSettled(true)}
        aria-hidden={closed}
        inert={closed}
      >
        {children}
      </motion.div>
    </section>
  )
}
