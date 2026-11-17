import { useState, type ReactNode } from 'react'
import { motion, useDragControls } from 'motion/react'
import { Maximize2, Minimize2, X } from 'lucide-react'
import { useEscape } from './Dialog'
import { useClosing } from './Presence'
import { useT } from '../state/ui'

interface SheetProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Zeigt einen Knopf, der das Fenster auf den ganzen Bildschirm vergrößert. Die Wahl bleibt auf dem Gerät erhalten. */
  expandable?: boolean
}

const FULL_KEY = 'wl.sheetFull'
const readFull = () => {
  try {
    return localStorage.getItem(FULL_KEY) === '1'
  } catch {
    return false
  }
}

/** Bottom-Sheet, am Griff nach unten ziehbar, mit Feder-Animation. */
export function Sheet({ title, subtitle, onClose, children, footer, expandable }: SheetProps) {
  const t = useT()
  const closing = useClosing()
  useEscape(closing ? () => {} : onClose)
  const controls = useDragControls()
  const [full, setFull] = useState(() => !!expandable && readFull())
  const toggleFull = () => {
    const next = !full
    setFull(next)
    try {
      localStorage.setItem(FULL_KEY, next ? '1' : '0')
    } catch {
      /* ohne Speicher gilt die Wahl nur für dieses Fenster */
    }
  }

  return (
    <motion.div
      className="overlay overlay--sheet"
      data-closing={closing}
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="backdrop" onClick={onClose} />
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet"
        data-full={full || undefined}
        initial={{ y: '100%' }}
        animate={{ y: closing ? '100%' : 0 }}
        transition={closing ? { duration: 0.24, ease: [0.4, 0, 1, 1] } : { type: 'spring', stiffness: 340, damping: 34 }}
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.02, bottom: 0.9 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 110 || info.velocity.y > 600) onClose()
        }}
      >
        <div className="sheet__grip" onPointerDown={(e) => controls.start(e)}>
          <span />
        </div>
        <header className="sheet__head" onPointerDown={(e) => controls.start(e)}>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="sheet__tools" onPointerDown={(e) => e.stopPropagation()}>
            {expandable && (
              <button className="icon-btn" onClick={toggleFull} aria-label={full ? t('Verkleinern') : t('Vollbild')} aria-pressed={full} data-testid="sheet-full">
                {full ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
            )}
            <button className="icon-btn" onClick={onClose} aria-label={t('Schließen')}>
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="sheet__body">{children}</div>
        {footer && <footer className="sheet__foot">{footer}</footer>}
      </motion.section>
    </motion.div>
  )
}
