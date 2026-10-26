import { useEffect, useReducer, useRef, type ReactNode } from 'react'
import { motion, type Variants } from 'motion/react'
import { useUI } from '../state/ui'

interface Entry {
  key: string
  node: ReactNode
  out: boolean
  dir: 1 | -1
}

const IN = { type: 'spring', stiffness: 320, damping: 36, mass: 0.9 } as const
const OUT = { duration: 0.18, ease: 'easeIn' } as const

// Die alte Seite verschwindet schnell, die neue gleitet nach: so überlagern sich nie zwei lesbare Seiten.
const full: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 44, scale: 0.985 }),
  center: { opacity: 1, x: 0, scale: 1, transition: IN },
  exit: (dir: number) => ({ opacity: 0, x: dir * -36, scale: 0.985, transition: OUT }),
}

const calm: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: OUT },
}

const LEAVE_MS = 300

/**
 * Bühne für Seitenwechsel. Die alte Seite läuft aus (gesperrt für Eingaben) und wird nach
 * LEAVE_MS per Timer entfernt. Es gibt bewusst keine Abhängigkeit von Animations-Callbacks,
 * damit nie eine unsichtbare Seite liegen bleibt und Klicks verschluckt.
 */
export function Stage({ activeKey, dir, children }: { activeKey: string; dir: 1 | -1; children: ReactNode }) {
  const { settings } = useUI()
  const entries = useRef<Entry[]>([])
  const [, bump] = useReducer((n: number) => n + 1, 0)

  const list = entries.current
  const current = list.find((e) => e.key === activeKey)
  if (current) {
    current.node = children
    current.out = false
  } else {
    list.push({ key: activeKey, node: children, out: false, dir })
  }
  for (const e of list) {
    if (e.key !== activeKey && !e.out) {
      e.out = true
      e.dir = dir
    }
  }

  const outKeys = list.filter((e) => e.out).map((e) => e.key).join('|')
  useEffect(() => {
    if (!outKeys) return
    const t = setTimeout(() => {
      entries.current = entries.current.filter((e) => !e.out)
      bump()
    }, LEAVE_MS)
    return () => clearTimeout(t)
  }, [outKeys])

  const variants = settings.fx === 'full' ? full : calm

  return (
    <>
      {list.map((e) => (
        <motion.div
          key={e.key}
          className="stage__slot"
          data-out={e.out}
          inert={e.out}
          variants={variants}
          custom={e.dir}
          initial="enter"
          animate={e.out ? 'exit' : 'center'}
        >
          {e.node}
        </motion.div>
      ))}
    </>
  )
}
