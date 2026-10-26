import { useEffect, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { useClosing } from './Presence'

export function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
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
