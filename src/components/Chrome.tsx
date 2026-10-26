import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Inbox, Lightbulb, SlidersHorizontal, Sparkles, type LucideIcon } from 'lucide-react'
import { APP_NAME } from '../lib/brand'
import { useNav, type Tab } from '../state/nav'
import { useUI } from '../state/ui'
import { useStore } from '../state/store'
import { Logo } from './Primitives'

export function Aurora() {
  return (
    <div className="aurora" aria-hidden>
      <span className="aurora__blob aurora__blob--a" />
      <span className="aurora__blob aurora__blob--b" />
      <span className="aurora__blob aurora__blob--c" />
      <span className="aurora__grain" />
    </div>
  )
}

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'wishes', label: 'Wünsche', icon: Sparkles },
  { id: 'ideas', label: 'Ideen', icon: Lightbulb },
  { id: 'received', label: 'Erhalten', icon: Inbox },
  { id: 'more', label: 'Mehr', icon: SlidersHorizontal },
]

export function TabBar() {
  const { tab, setTab } = useNav()
  const { haptic } = useUI()
  const { received } = useStore()

  return (
    <nav className="tabbar" aria-label="Hauptnavigation">
      <div className="tabbar__inner">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <motion.button
              key={id}
              layout
              className="tab"
              data-active={active}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 500, damping: 36 }}
              onClick={() => {
                haptic(8)
                setTab(id)
              }}
            >
              {active && <motion.span layoutId="tab-pill" className="tab__pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <motion.span className="tab__icon" animate={{ scale: active ? 1.08 : 1, rotate: active ? [0, -14, 0] : 0 }} transition={{ duration: 0.45 }}>
                <Icon size={21} strokeWidth={active ? 2.3 : 1.9} />
                {id === 'received' && received.length > 0 && !active && <i className="tab__dot" />}
              </motion.span>
              <AnimatePresence initial={false}>
                {active && (
                  <motion.span
                    className="tab__label"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}

/** Kurzer Start-Moment: Bildmarke zeichnet sich, Name läuft ein. Per Timer beendet, nicht per Animations-Callback. */
export function Splash({ onDone }: { onDone: () => void }) {
  const [out, setOut] = useState(false)
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    const a = setTimeout(() => setOut(true), 1600)
    const b = setTimeout(() => done.current(), 2150)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [])

  return (
    <motion.div
      className="splash"
      data-out={out}
      onClick={() => setOut(true)}
      animate={out ? { opacity: 0, scale: 1.06 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <Logo size={84} />
      <div className="splash__name" aria-label={APP_NAME}>
        {APP_NAME.split('').map((ch, i) => (
          <motion.span key={i} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 + i * 0.045, type: 'spring', stiffness: 260, damping: 20 }}>
            {ch}
          </motion.span>
        ))}
      </div>
    </motion.div>
  )
}
