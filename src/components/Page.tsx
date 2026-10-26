import { useRef, useState, type ReactNode } from 'react'
import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react'
import { ChevronLeft, Plus } from 'lucide-react'

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
            <button className="icon-btn" onClick={onBack} aria-label="Zurück">
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
      aria-label={`${label} hinzufügen`}
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15, type: 'spring', stiffness: 380, damping: 22 }}
    >
      <Plus size={17} strokeWidth={2.8} />
      {label}
    </motion.button>
  )
}

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section__head">
        <h3>{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}
