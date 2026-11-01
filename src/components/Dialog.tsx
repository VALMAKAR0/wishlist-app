import { useEffect, useRef, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { pushBack } from '../state/back'
import { useClosing } from './Presence'

/** Meldet das Fenster für die Zurück-Taste (Android) und Escape an. Nur das oberste Fenster schließt sich. */
export function useEscape(onClose: () => void) {
  const ref = useRef(onClose)
  ref.current = onClose
  useEffect(() => pushBack(() => ref.current()), [])
}

interface DialogProps {
  label: string
  onClose: () => void
  children: ReactNode
  className?: string
}

/** Zentriertes Fenster mit Feder-Animation und weichgezeichnetem Hintergrund. */
export function Dialog({ label, onClose, children, className = '' }: DialogProps) {
  const closing = useClosing()
  useEscape(closing ? () => {} : onClose)
  return (
    <motion.div
      className="overlay overlay--dialog"
      data-closing={closing}
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="backdrop" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`dialog ${className}`}
        initial={{ scale: 0.88, y: 28, opacity: 0 }}
        animate={closing ? { scale: 0.95, y: 14, opacity: 0 } : { scale: 1, y: 0, opacity: 1 }}
        transition={closing ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 30 }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
