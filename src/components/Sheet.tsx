import type { ReactNode } from 'react'
import { motion, useDragControls } from 'motion/react'
import { X } from 'lucide-react'
import { useEscape } from './Dialog'
import { useClosing } from './Presence'

interface SheetProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

/** Bottom-Sheet, am Griff nach unten ziehbar, mit Feder-Animation. */
export function Sheet({ title, subtitle, onClose, children, footer }: SheetProps) {
  const closing = useClosing()
  useEscape(closing ? () => {} : onClose)
  const controls = useDragControls()

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
          <button className="icon-btn" onClick={onClose} aria-label="Schließen" onPointerDown={(e) => e.stopPropagation()}>
            <X size={18} />
          </button>
        </header>
        <div className="sheet__body">{children}</div>
        {footer && <footer className="sheet__foot">{footer}</footer>}
      </motion.section>
    </motion.div>
  )
}
