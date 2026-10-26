import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const ClosingCtx = createContext(false)

/** Ist das umgebende Fenster gerade am Schließen? Dann den Austritt animieren und Eingaben sperren. */
export const useClosing = () => useContext(ClosingCtx)

interface PresenceProps {
  show: boolean
  /** Spätestens nach dieser Zeit wird der Inhalt ausgehängt, unabhängig von Animationen. */
  exitMs?: number
  /** Standard: Inhalt wird per Portal an <body> gehängt (für Fenster). Für Inline-Inhalte auf false setzen. */
  portal?: boolean
  children: ReactNode
}

/**
 * Ersatz für AnimatePresence bei Fenstern: Der Inhalt bleibt nach `show=false` noch kurz
 * gemountet (mit useClosing() = true) und wird dann per Timer entfernt. Anders als
 * AnimatePresence wartet das nicht auf Animations-Callbacks und kann deshalb nicht hängen
 * bleiben und unsichtbar Klicks abfangen.
 */
export function Presence({ show, exitMs = 340, portal = true, children }: PresenceProps) {
  const [mounted, setMounted] = useState(show)
  const last = useRef<ReactNode>(children)
  if (show) last.current = children

  useEffect(() => {
    if (show) {
      setMounted(true)
      return
    }
    const t = setTimeout(() => setMounted(false), exitMs)
    return () => clearTimeout(t)
  }, [show, exitMs])

  if (!show && !mounted) return null
  // Per Portal an den Seitenrand, damit weder Transformationen noch Stapelreihenfolge der Seite stören.
  const content = <ClosingCtx.Provider value={!show}>{show ? children : last.current}</ClosingCtx.Provider>
  return portal ? createPortal(content, document.body) : content
}
